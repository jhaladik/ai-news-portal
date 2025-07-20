// workers/scheduler/scheduler-daily-enhanced.js - Enhanced daily scheduler with RSS pipeline
export default {
    async scheduled(event, env, ctx) {
      ctx.waitUntil(runDailyPipeline(env));
    },
  
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }
  
      // Manual trigger for testing
      if (request.method === 'POST') {
        const result = await runDailyPipeline(env);
        return Response.json(result, { headers: corsHeaders });
      }
  
      // Status check
      const lastRun = await env.AI_NEWS_KV.get('last-pipeline-run');
      const stats = await getDailyStats(env);
  
      return Response.json({
        scheduler: 'active',
        last_run: lastRun ? JSON.parse(lastRun) : null,
        today_stats: stats,
        next_scheduled: getNextRunTime()
      }, { headers: corsHeaders });
    }
  };
  
  async function runDailyPipeline(env) {
    const startTime = Date.now();
    
    try {
      // Step 1: Run full RSS pipeline
      const pipelineResponse = await fetch('https://pipeline-orchestrator.jhaladik.workers.dev/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'full' })
      });
  
      const pipelineResult = await pipelineResponse.json();
  
      // Step 2: Generate additional content if needed
      await ensureMinimumContent(env);
  
      // Step 3: Send daily newsletter if enabled
      await triggerNewsletterIfReady(env);
  
      // Step 4: Cleanup old data
      await cleanupOldData(env);
  
      const result = {
        success: true,
        pipeline_result: pipelineResult,
        duration_ms: Date.now() - startTime,
        timestamp: Date.now(),
        next_run: getNextRunTime()
      };
  
      // Store last run result
      await env.AI_NEWS_KV.put('last-pipeline-run', JSON.stringify(result), {
        expirationTtl: 24 * 3600 // 24 hours
      });
  
      return result;
  
    } catch (error) {
      const result = {
        success: false,
        error: error.message,
        duration_ms: Date.now() - startTime,
        timestamp: Date.now()
      };
  
      await env.AI_NEWS_KV.put('last-pipeline-run', JSON.stringify(result), {
        expirationTtl: 24 * 3600
      });
  
      return result;
    }
  }
  
  async function ensureMinimumContent(env) {
    const today = new Date().toISOString().split('T')[0];
    const publishedToday = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM content 
      WHERE status = 'published' AND date(published_at/1000, 'unixepoch') = ?
    `).bind(today).first();
  
    // If fewer than 3 articles published today, try to generate more
    if (publishedToday.count < 3) {
      const candidateContent = await env.DB.prepare(`
        SELECT * FROM raw_content 
        WHERE raw_score >= 0.7 AND id NOT IN (
          SELECT raw_content_id FROM content WHERE raw_content_id IS NOT NULL
        )
        ORDER BY raw_score DESC LIMIT 2
      `).all();
  
      for (const candidate of candidateContent.results) {
        try {
          await fetch('https://ai-generate-enhanced.jhaladik.workers.dev/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              raw_content_id: candidate.id,
              neighborhood: 'praha4'
            })
          });
        } catch (error) {
          console.error('Failed to generate additional content:', error);
        }
      }
    }
  }
  
  async function triggerNewsletterIfReady(env) {
    const hour = new Date().getHours();
    
    // Send newsletter at 8 AM
    if (hour === 8) {
      try {
        await fetch('https://newsletter-daily.jhaladik.workers.dev/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ trigger: 'scheduled' })
        });
      } catch (error) {
        console.error('Newsletter trigger failed:', error);
      }
    }
  }
  
  async function cleanupOldData(env) {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    // Clean up old raw content
    await env.DB.prepare(`
      DELETE FROM raw_content 
      WHERE collected_at < ? AND raw_score < 0.5
    `).bind(thirtyDaysAgo).run();
  
    // Clean up old drafts
    await env.DB.prepare(`
      DELETE FROM content 
      WHERE status = 'draft' AND created_at < ?
    `).bind(thirtyDaysAgo).run();
  }
  
  async function getDailyStats(env) {
    const today = new Date().toISOString().split('T')[0];
    
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_today,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as pending_review,
        COUNT(CASE WHEN status = 'generated' THEN 1 END) as generated_today
      FROM content 
      WHERE date(created_at/1000, 'unixepoch') = ?
    `).bind(today).first();
  
    return stats;
  }
  
  function getNextRunTime() {
    const now = new Date();
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(8, 0, 0, 0); // 8 AM tomorrow
    
    return next.getTime();
  }