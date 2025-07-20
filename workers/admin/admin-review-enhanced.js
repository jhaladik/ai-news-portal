// workers/admin/admin-review-enhanced.js - Enhanced admin review queue with category insights
export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'queue';

    try {
      switch (action) {
        case 'queue':
          return await getEnhancedQueue(env, corsHeaders);
        
        case 'approve':
          return await approveContent(request, env, corsHeaders);
        
        case 'reject':
          return await rejectContent(request, env, corsHeaders);
        
        case 'insights':
          return await getCategoryInsights(env, corsHeaders);
        
        case 'batch':
          return await batchApprove(request, env, corsHeaders);
        
        default:
          return Response.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
      }
    } catch (error) {
      return Response.json({
        error: 'Admin review failed',
        details: error.message
      }, { status: 500, headers: corsHeaders });
    }
  }
};

async function getEnhancedQueue(env, corsHeaders) {
  // Get content requiring review with enhanced metadata
  const reviewQueue = await env.DB.prepare(`
    SELECT 
      c.*,
      r.source as raw_source,
      r.raw_score,
      r.category as original_category,
      r.url as source_url
    FROM content c
    LEFT JOIN raw_content r ON c.raw_content_id = r.id
    WHERE c.status IN ('generated', 'review', 'validated')
    ORDER BY 
      CASE 
        WHEN c.ai_confidence >= 0.9 THEN 1
        WHEN c.ai_confidence >= 0.8 THEN 2  
        WHEN c.ai_confidence >= 0.7 THEN 3
        ELSE 4
      END,
      c.created_at DESC
    LIMIT 50
  `).all();

  // Get category distribution
  const categoryStats = await env.DB.prepare(`
    SELECT 
      category,
      status,
      COUNT(*) as count,
      AVG(ai_confidence) as avg_confidence
    FROM content 
    WHERE created_at > ?
    GROUP BY category, status
  `).bind(Date.now() - (7 * 24 * 60 * 60 * 1000)).all(); // Last 7 days

  // Enrich queue items with insights
  const enrichedQueue = reviewQueue.results.map(item => ({
    ...item,
    priority: calculatePriority(item),
    insights: generateInsights(item),
    auto_approve_eligible: item.ai_confidence >= 0.85 && 
                         !item.validation_notes?.includes('manual_review')
  }));

  return Response.json({
    queue: enrichedQueue,
    queue_count: enrichedQueue.length,
    category_stats: categoryStats.results,
    insights: {
      high_confidence: enrichedQueue.filter(item => item.ai_confidence >= 0.85).length,
      auto_approve_eligible: enrichedQueue.filter(item => item.auto_approve_eligible).length,
      urgent_review: enrichedQueue.filter(item => item.priority === 'urgent').length
    }
  }, { headers: corsHeaders });
}

async function approveContent(request, env, corsHeaders) {
  const { content_id, notes = '', publish_immediately = false } = await request.json();

  if (!content_id) {
    return Response.json({ error: 'Content ID required' }, { status: 400, headers: corsHeaders });
  }

  const status = publish_immediately ? 'published' : 'approved';
  const published_at = publish_immediately ? Date.now() : null;

  await env.DB.prepare(`
    UPDATE content 
    SET status = ?, approved_at = ?, admin_notes = ?, published_at = ?
    WHERE id = ?
  `).bind(status, Date.now(), notes, published_at, content_id).run();

  // If publishing immediately, create publication record
  if (publish_immediately) {
    const content = await env.DB.prepare(`
      SELECT * FROM content WHERE id = ?
    `).bind(content_id).first();

    if (content) {
      await env.DB.prepare(`
        INSERT INTO publications 
        (id, content_id, neighborhood_id, category, published_at, auto_published)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(), content_id, content.neighborhood_id,
        content.category, published_at, 0
      ).run();
    }
  }

  return Response.json({
    success: true,
    content_id,
    new_status: status,
    published: publish_immediately
  }, { headers: corsHeaders });
}

async function rejectContent(request, env, corsHeaders) {
  const { content_id, reason = 'Quality issues' } = await request.json();

  await env.DB.prepare(`
    UPDATE content 
    SET status = 'rejected', rejected_at = ?, rejection_reason = ?
    WHERE id = ?
  `).bind(Date.now(), reason, content_id).run();

  return Response.json({
    success: true,
    content_id,
    new_status: 'rejected'
  }, { headers: corsHeaders });
}

async function getCategoryInsights(env, corsHeaders) {
  const insights = await env.DB.prepare(`
    SELECT 
      category,
      COUNT(*) as total_content,
      AVG(ai_confidence) as avg_confidence,
      COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count
    FROM content 
    WHERE created_at > ?
    GROUP BY category
    ORDER BY total_content DESC
  `).bind(Date.now() - (30 * 24 * 60 * 60 * 1000)).all(); // Last 30 days

  return Response.json({
    insights: insights.results,
    summary: {
      total_categories: insights.results.length,
      best_performing: insights.results[0],
      avg_confidence_overall: insights.results.reduce((sum, cat) => sum + cat.avg_confidence, 0) / insights.results.length
    }
  }, { headers: corsHeaders });
}

async function batchApprove(request, env, corsHeaders) {
  const { content_ids, min_confidence = 0.85 } = await request.json();

  if (!Array.isArray(content_ids) || content_ids.length === 0) {
    return Response.json({ error: 'Content IDs array required' }, { status: 400, headers: corsHeaders });
  }

  const approved = [];
  const skipped = [];

  for (const content_id of content_ids) {
    const content = await env.DB.prepare(`
      SELECT ai_confidence FROM content WHERE id = ?
    `).bind(content_id).first();

    if (content && content.ai_confidence >= min_confidence) {
      await env.DB.prepare(`
        UPDATE content SET status = 'approved', approved_at = ? WHERE id = ?
      `).bind(Date.now(), content_id).run();
      approved.push(content_id);
    } else {
      skipped.push({ content_id, reason: 'Low confidence score' });
    }
  }

  return Response.json({
    success: true,
    approved: approved.length,
    skipped: skipped.length,
    approved_ids: approved,
    skipped_details: skipped
  }, { headers: corsHeaders });
}

function calculatePriority(item) {
  // Calculate priority based on multiple factors
  let score = 0;
  
  // Confidence score weight
  score += item.ai_confidence * 40;
  
  // Category importance
  const categoryWeights = {
    'emergency': 30,
    'transport': 20,
    'local_government': 15,
    'community': 10,
    'business': 5,
    'weather': 5
  };
  score += categoryWeights[item.category] || 0;
  
  // Recency (newer = higher priority)
  const ageHours = (Date.now() - item.created_at) / (1000 * 60 * 60);
  score += Math.max(0, 20 - ageHours); // Decay after 20 hours
  
  if (score >= 70) return 'urgent';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function generateInsights(item) {
  const insights = [];
  
  if (item.ai_confidence >= 0.9) {
    insights.push('High AI confidence - likely auto-approvable');
  }
  
  if (item.raw_score && item.raw_score >= 0.8) {
    insights.push('High source relevance score');
  }
  
  if (item.category === 'emergency') {
    insights.push('Emergency content - prioritize review');
  }
  
  if (item.validation_notes && item.validation_notes.includes('manual_review')) {
    insights.push('Flagged for manual review by AI validator');
  }
  
  return insights;
}