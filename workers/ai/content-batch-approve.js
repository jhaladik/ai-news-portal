// workers/ai/content-batch-approve.js - Batch operations for content management
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
  
      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
      }
  
      try {
        const { 
          action, 
          threshold, 
          content_ids, 
          category,
          neighborhood,
          approved_by = 'admin',
          max_items = 50 
        } = await request.json();
  
        if (!action) {
          return Response.json({
            error: 'Missing required field: action'
          }, { status: 400, headers: corsHeaders });
        }
  
        const validActions = ['approve', 'reject', 'archive', 'republish', 'bulk_approve_by_confidence'];
        if (!validActions.includes(action)) {
          return Response.json({
            error: `Invalid action. Must be one of: ${validActions.join(', ')}`
          }, { status: 400, headers: corsHeaders });
        }
  
        let results = [];
  
        switch (action) {
          case 'bulk_approve_by_confidence':
            results = await bulkApproveByConfidence(env, threshold || 0.8, max_items, approved_by);
            break;
  
          case 'approve':
          case 'reject':
          case 'archive':
          case 'republish':
            if (!content_ids || !Array.isArray(content_ids)) {
              return Response.json({
                error: 'content_ids array required for this action'
              }, { status: 400, headers: corsHeaders });
            }
            results = await bulkUpdateStatus(env, content_ids, action, approved_by);
            break;
        }
  
        // Log batch operation
        await env.AI_NEWS_KV.put(
          `batch-operation-${Date.now()}`,
          JSON.stringify({
            timestamp: Date.now(),
            action,
            performed_by: approved_by,
            items_affected: results.length,
            filters: { threshold, category, neighborhood },
            results: results.slice(0, 10) // Store first 10 for debugging
          }),
          { expirationTtl: 30 * 24 * 3600 } // Keep for 30 days
        );
  
        return Response.json({
          success: true,
          action,
          items_processed: results.length,
          results
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Batch operation failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Bulk approve by confidence threshold
  async function bulkApproveByConfidence(env, threshold, maxItems, approvedBy) {
    const candidates = await env.DB.prepare(`
      SELECT id, title, ai_confidence, category, neighborhood_id
      FROM content 
      WHERE status IN ('review', 'ai_generated')
        AND ai_confidence >= ?
        AND ai_confidence IS NOT NULL
      ORDER BY ai_confidence DESC
      LIMIT ?
    `).bind(threshold, maxItems).all();
  
    const results = [];
    
    for (const content of candidates.results) {
      try {
        await env.DB.prepare(`
          UPDATE content 
          SET status = 'published', published_at = ?, created_by = ?
          WHERE id = ?
        `).bind(Date.now(), approvedBy, content.id).run();
  
        results.push({
          id: content.id,
          title: content.title.substring(0, 50) + '...',
          confidence: content.ai_confidence,
          category: content.category,
          neighborhood: content.neighborhood_id,
          status: 'approved',
          success: true
        });
      } catch (error) {
        results.push({
          id: content.id,
          title: content.title.substring(0, 50) + '...',
          status: 'error',
          success: false,
          error: error.message
        });
      }
    }
  
    return results;
  }
  
  // Bulk update status for specific content IDs
  async function bulkUpdateStatus(env, contentIds, action, approvedBy) {
    const statusMap = {
      'approve': 'published',
      'reject': 'rejected',
      'archive': 'archived',
      'republish': 'published'
    };
  
    const newStatus = statusMap[action];
    const results = [];
  
    for (const contentId of contentIds) {
      try {
        // Get current content info
        const content = await env.DB.prepare(
          'SELECT id, title, status FROM content WHERE id = ?'
        ).bind(contentId).first();
  
        if (!content) {
          results.push({
            id: contentId,
            success: false,
            error: 'Content not found'
          });
          continue;
        }
  
        // Update status
        const updateFields = ['status = ?', 'created_by = ?'];
        const updateValues = [newStatus, approvedBy];
  
        if (action === 'approve' || action === 'republish') {
          updateFields.push('published_at = ?');
          updateValues.push(Date.now());
        }
  
        await env.DB.prepare(`
          UPDATE content 
          SET ${updateFields.join(', ')}
          WHERE id = ?
        `).bind(...updateValues, contentId).run();
  
        results.push({
          id: contentId,
          title: content.title.substring(0, 50) + '...',
          old_status: content.status,
          new_status: newStatus,
          action: action,
          success: true
        });
  
      } catch (error) {
        results.push({
          id: contentId,
          success: false,
          error: error.message
        });
      }
    }
  
    return results;
  }
  
  // Helper function to get content statistics
  async function getContentStats(env) {
    const stats = await env.DB.prepare(`
      SELECT 
        status,
        category,
        COUNT(*) as count,
        AVG(ai_confidence) as avg_confidence
      FROM content 
      WHERE created_at > ?
      GROUP BY status, category
      ORDER BY status, category
    `).bind(Date.now() - 7 * 24 * 60 * 60 * 1000).all(); // Last 7 days
  
    return stats.results;
  }