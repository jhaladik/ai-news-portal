// workers/admin/admin-review-enhanced.js - Enhanced admin dashboard for Phase 2
export default {
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
  
      try {
        const url = new URL(request.url);
        const view = url.searchParams.get('view') || 'pending';
        const category = url.searchParams.get('category');
        const neighborhood = url.searchParams.get('neighborhood');
        const limit = parseInt(url.searchParams.get('limit')) || 20;
  
        switch (view) {
          case 'pending':
            return await getPendingContent(env, { category, neighborhood, limit, corsHeaders });
          
          case 'stats':
            return await getContentStats(env, corsHeaders);
          
          case 'ai_metrics':
            return await getAIMetrics(env, corsHeaders);
          
          case 'daily_summary':
            return await getDailySummary(env, corsHeaders);
          
          case 'quality_report':
            return await getQualityReport(env, corsHeaders);
          
          default:
            return await getPendingContent(env, { category, neighborhood, limit, corsHeaders });
        }
  
      } catch (error) {
        return Response.json({
          error: 'Admin dashboard failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Get pending content for review
  async function getPendingContent(env, { category, neighborhood, limit, corsHeaders }) {
    let query = `
      SELECT 
        id, title, content, category, neighborhood_id, 
        ai_confidence, status, created_by, created_at, published_at
      FROM content 
      WHERE status IN ('review', 'ai_generated')
    `;
    
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    if (neighborhood) {
      query += ' AND neighborhood_id = ?';
      params.push(neighborhood);
    }
    
    query += ' ORDER BY ai_confidence DESC, created_at DESC LIMIT ?';
    params.push(limit);
  
    const content = await env.DB.prepare(query).bind(...params).all();
  
    // Enhance with AI analysis
    const enhancedContent = content.results.map(item => ({
      ...item,
      word_count: item.content.split(/\s+/).length,
      preview: item.content.substring(0, 150) + '...',
      confidence_level: item.ai_confidence >= 0.8 ? 'high' : 
                       item.ai_confidence >= 0.6 ? 'medium' : 'low',
      auto_approvable: item.ai_confidence >= 0.85,
      created_ago: Math.floor((Date.now() - item.created_at) / (1000 * 60 * 60)) + ' hours ago'
    }));
  
    return Response.json({
      success: true,
      view: 'pending',
      total_items: content.results.length,
      filters: { category, neighborhood },
      content: enhancedContent
    }, { headers: corsHeaders });
  }
  
  // Get content statistics
  async function getContentStats(env, corsHeaders) {
    const statusStats = await env.DB.prepare(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(ai_confidence) as avg_confidence,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM content 
      GROUP BY status
      ORDER BY count DESC
    `).all();
  
    const categoryStats = await env.DB.prepare(`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(ai_confidence) as avg_confidence,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count
      FROM content 
      GROUP BY category
      ORDER BY count DESC
    `).all();
  
    const dailyStats = await env.DB.prepare(`
      SELECT 
        DATE(created_at/1000, 'unixepoch') as date,
        COUNT(*) as content_created,
        COUNT(CASE WHEN created_by LIKE 'ai%' THEN 1 END) as ai_generated,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published,
        AVG(ai_confidence) as avg_confidence
      FROM content 
      WHERE created_at > ?
      GROUP BY DATE(created_at/1000, 'unixepoch')
      ORDER BY date DESC
      LIMIT 14
    `).bind(Date.now() - 14 * 24 * 60 * 60 * 1000).all();
  
    return Response.json({
      success: true,
      view: 'stats',
      timestamp: Date.now(),
      status_breakdown: statusStats.results,
      category_breakdown: categoryStats.results,
      daily_activity: dailyStats.results
    }, { headers: corsHeaders });
  }
  
  // Get AI-specific metrics
  async function getAIMetrics(env, corsHeaders) {
    const aiPerformance = await env.DB.prepare(`
      SELECT 
        created_by,
        COUNT(*) as total_generated,
        AVG(ai_confidence) as avg_confidence,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN ai_confidence >= 0.8 THEN 1 END) as high_quality_count
      FROM content 
      WHERE created_by LIKE 'ai%'
      GROUP BY created_by
      ORDER BY total_generated DESC
    `).all();
  
    const confidenceDistribution = await env.DB.prepare(`
      SELECT 
        CASE 
          WHEN ai_confidence >= 0.9 THEN '0.9-1.0'
          WHEN ai_confidence >= 0.8 THEN '0.8-0.9'
          WHEN ai_confidence >= 0.7 THEN '0.7-0.8'
          WHEN ai_confidence >= 0.6 THEN '0.6-0.7'
          WHEN ai_confidence >= 0.5 THEN '0.5-0.6'
          ELSE 'below-0.5'
        END as confidence_range,
        COUNT(*) as count,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_in_range
      FROM content 
      WHERE ai_confidence IS NOT NULL
      GROUP BY confidence_range
      ORDER BY confidence_range DESC
    `).all();
  
    // Get recent AI summaries from KV
    const kvKeys = await env.AI_NEWS_KV.list({ prefix: 'daily-summary-' });
    const recentSummaries = [];
    
    for (const key of kvKeys.keys.slice(0, 5)) {
      const summary = await env.AI_NEWS_KV.get(key.name);
      if (summary) {
        recentSummaries.push({
          date: key.name.replace('daily-summary-', ''),
          ...JSON.parse(summary)
        });
      }
    }
  
    return Response.json({
      success: true,
      view: 'ai_metrics',
      ai_worker_performance: aiPerformance.results,
      confidence_distribution: confidenceDistribution.results,
      recent_daily_summaries: recentSummaries,
      timestamp: Date.now()
    }, { headers: corsHeaders });
  }
  
  // Get daily summary
  async function getDailySummary(env, corsHeaders) {
    const today = new Date().toISOString().split('T')[0];
    const summaryKey = `daily-summary-${today}`;
    
    const todaySummary = await env.AI_NEWS_KV.get(summaryKey);
    
    if (!todaySummary) {
      return Response.json({
        success: true,
        view: 'daily_summary',
        message: 'No summary available for today yet',
        next_run: 'Daily pipeline runs at 8:00 AM'
      }, { headers: corsHeaders });
    }
  
    const summary = JSON.parse(todaySummary);
    
    // Get additional real-time stats
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const realtimeStats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_content,
        COUNT(CASE WHEN created_by LIKE 'ai%' THEN 1 END) as ai_generated,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_today,
        COUNT(CASE WHEN status = 'review' THEN 1 END) as pending_review,
        AVG(CASE WHEN ai_confidence IS NOT NULL THEN ai_confidence END) as avg_ai_confidence
      FROM content 
      WHERE created_at >= ?
    `).bind(todayStart).first();
  
    return Response.json({
      success: true,
      view: 'daily_summary',
      date: today,
      pipeline_summary: summary,
      realtime_stats: realtimeStats,
      timestamp: Date.now()
    }, { headers: corsHeaders });
  }
  
  // Get quality report
  async function getQualityReport(env, corsHeaders) {
    const qualityIssues = await env.DB.prepare(`
      SELECT 
        id, title, category, ai_confidence, status, created_at,
        LENGTH(content) as content_length,
        (LENGTH(content) - LENGTH(REPLACE(content, ' ', '')) + 1) as word_count
      FROM content 
      WHERE (
        ai_confidence < 0.6 
        OR LENGTH(content) < 100 
        OR LENGTH(content) > 1000
        OR status = 'rejected'
      )
      AND created_at > ?
      ORDER BY created_at DESC
      LIMIT 20
    `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).all();
  
    const neighborhoodPerformance = await env.DB.prepare(`
      SELECT 
        neighborhood_id,
        COUNT(*) as total_content,
        AVG(ai_confidence) as avg_confidence,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
      FROM content 
      WHERE created_at > ?
      GROUP BY neighborhood_id
      ORDER BY avg_confidence DESC
    `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).all();
  
    return Response.json({
      success: true,
      view: 'quality_report',
      quality_issues: qualityIssues.results.map(item => ({
        ...item,
        issues: [
          item.ai_confidence < 0.6 ? 'Low confidence' : null,
          item.content_length < 100 ? 'Too short' : null,
          item.content_length > 1000 ? 'Too long' : null,
          item.status === 'rejected' ? 'Rejected content' : null
        ].filter(Boolean)
      })),
      neighborhood_performance: neighborhoodPerformance.results,
      timestamp: Date.now()
    }, { headers: corsHeaders });
  }