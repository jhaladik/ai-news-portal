// workers/ai/content-auto-approve.js - Automatic approval for high-quality content
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
        const { threshold = 0.85, max_items = 20, dry_run = false } = await request.json() || {};
  
        // Find high-confidence content ready for approval
        const candidates = await env.DB.prepare(`
          SELECT id, title, content, category, neighborhood_id, ai_confidence, created_at
          FROM content 
          WHERE status IN ('review', 'ai_generated') 
            AND ai_confidence >= ?
            AND ai_confidence IS NOT NULL
          ORDER BY ai_confidence DESC, created_at DESC
          LIMIT ?
        `).bind(threshold, max_items).all();
  
        if (candidates.results.length === 0) {
          return Response.json({
            success: true,
            approved: 0,
            message: `No content found with confidence >= ${threshold}`
          }, { headers: corsHeaders });
        }
  
        const approvalResults = [];
        let approvedCount = 0;
  
        for (const content of candidates.results) {
          // Additional quality checks before auto-approval
          const qualityCheck = await performQualityCheck(content);
          
          if (qualityCheck.passed) {
            if (!dry_run) {
              // Approve the content
              await env.DB.prepare(`
                UPDATE content 
                SET status = 'published', published_at = ?, created_by = ?
                WHERE id = ?
              `).bind(Date.now(), 'auto-approve', content.id).run();
              
              approvedCount++;
            }
  
            approvalResults.push({
              id: content.id,
              title: content.title.substring(0, 50) + '...',
              confidence: content.ai_confidence,
              quality_score: qualityCheck.score,
              approved: !dry_run,
              reason: 'High confidence + quality checks passed'
            });
          } else {
            approvalResults.push({
              id: content.id,
              title: content.title.substring(0, 50) + '...',
              confidence: content.ai_confidence,
              quality_score: qualityCheck.score,
              approved: false,
              reason: qualityCheck.issues.join(', ')
            });
          }
        }
  
        // Log approval activity
        if (!dry_run && approvedCount > 0) {
          await env.AI_NEWS_KV.put(
            `auto-approval-${Date.now()}`,
            JSON.stringify({
              timestamp: Date.now(),
              approved_count: approvedCount,
              threshold_used: threshold,
              items: approvalResults.filter(r => r.approved)
            }),
            { expirationTtl: 30 * 24 * 3600 } // Keep for 30 days
          );
        }
  
        return Response.json({
          success: true,
          approved: approvedCount,
          candidates_reviewed: candidates.results.length,
          threshold_used: threshold,
          dry_run,
          results: approvalResults
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Auto-approval failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Quality check function
  async function performQualityCheck(content) {
    const text = content.content;
    const title = content.title;
    
    const issues = [];
    let score = 1.0;
  
    // Check 1: Content length
    if (text.length < 100) {
      issues.push('Content too short');
      score -= 0.3;
    } else if (text.length > 1000) {
      issues.push('Content too long');
      score -= 0.2;
    }
  
    // Check 2: Title quality
    if (title.length < 10) {
      issues.push('Title too short');
      score -= 0.2;
    } else if (title.length > 100) {
      issues.push('Title too long');
      score -= 0.1;
    }
  
    // Check 3: Czech language check
    if (!/[čšřžýáíéůúťďňě]/i.test(text)) {
      issues.push('Missing Czech characters');
      score -= 0.3;
    }
  
    // Check 4: No obvious errors or problematic content
    const problematicPatterns = [
      /error/i,
      /undefined/i,
      /null/i,
      /\[object Object\]/i,
      /lorem ipsum/i,
      /test test/i,
      /xxx/i,
      /TODO/i,
      /FIXME/i
    ];
  
    for (const pattern of problematicPatterns) {
      if (pattern.test(text) || pattern.test(title)) {
        issues.push('Contains problematic content');
        score -= 0.5;
        break;
      }
    }
  
    // Check 5: Proper sentence structure
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length < 2) {
      issues.push('Insufficient sentence structure');
      score -= 0.2;
    }
  
    // Check 6: Local context (Prague/neighborhood references)
    if (!/praha|vinohrady|náměstí|ulice/i.test(text)) {
      issues.push('Lacks local context');
      score -= 0.1;
    }
  
    // Check 7: Reasonable word distribution
    const words = text.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const uniqueRatio = uniqueWords.size / words.length;
    
    if (uniqueRatio < 0.5) {
      issues.push('High word repetition');
      score -= 0.1;
    }
  
    return {
      passed: issues.length === 0 && score >= 0.7,
      score: Math.max(score, 0),
      issues
    };
  }