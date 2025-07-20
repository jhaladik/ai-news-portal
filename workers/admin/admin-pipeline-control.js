// workers/admin/admin-pipeline-control.js - Manual pipeline control micro-worker
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
  
      try {
        // Extract and validate admin JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
        }
  
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        if (payload.role !== 'admin') {
          return Response.json({ error: 'Admin access required' }, { status: 403, headers: corsHeaders });
        }
  
        if (request.method === 'GET') {
          // Get pipeline status overview
          const pipelineStatus = await env.KV.get('pipeline-status');
          const lastRun = await env.KV.get('pipeline-last-run');
          const errors = await env.KV.get('pipeline-errors');
  
          // Get processing queue status
          const processingStats = await env.DB.prepare(`
            SELECT 
              status,
              COUNT(*) as count,
              AVG(ai_confidence) as avg_confidence
            FROM content 
            WHERE created_at > ?
            GROUP BY status
          `).bind(Date.now() - 86400000).all(); // Last 24 hours
  
          // Get RSS source health
          const rssHealth = await env.KV.get('rss-sources-health');
  
          return Response.json({
            pipeline: {
              status: pipelineStatus || 'unknown',
              last_run: lastRun ? parseInt(lastRun) : null,
              errors: errors ? JSON.parse(errors) : [],
              next_scheduled: await env.KV.get('pipeline-next-run')
            },
            processing_queue: {
              stats: processingStats.results,
              total_pending: processingStats.results
                .filter(s => ['draft', 'ai_generated', 'review'].includes(s.status))
                .reduce((sum, s) => sum + s.count, 0)
            },
            rss_sources: rssHealth ? JSON.parse(rssHealth) : { healthy: 0, failed: 0, total: 0 }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'POST') {
          const { action, target, params } = await request.json();
  
          switch (action) {
            case 'trigger_pipeline':
              // Manually trigger the RSS pipeline
              try {
                const pipelineUrl = 'https://pipeline-orchestrator.jhaladik.workers.dev';
                const response = await fetch(pipelineUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ manual_trigger: true, triggered_by: payload.user_id })
                });
  
                if (!response.ok) {
                  throw new Error(`Pipeline trigger failed: ${response.status}`);
                }
  
                await env.KV.put('pipeline-manual-trigger', JSON.stringify({
                  triggered_by: payload.user_id,
                  timestamp: Date.now()
                }));
  
                return Response.json({ 
                  success: true, 
                  message: 'Pipeline triggered successfully' 
                }, { headers: corsHeaders });
  
              } catch (error) {
                return Response.json({ 
                  error: 'Failed to trigger pipeline', 
                  details: error.message 
                }, { status: 500, headers: corsHeaders });
              }
  
            case 'stop_pipeline':
              // Stop running pipeline
              await env.KV.put('pipeline-stop-signal', '1');
              return Response.json({ 
                success: true, 
                message: 'Stop signal sent to pipeline' 
              }, { headers: corsHeaders });
  
            case 'retry_failed':
              // Retry failed content processing
              const failedContent = await env.DB.prepare(`
                SELECT id FROM content 
                WHERE status = 'failed' AND created_at > ?
                LIMIT 10
              `).bind(Date.now() - 86400000).all();
  
              for (const content of failedContent.results) {
                await env.DB.prepare(
                  'UPDATE content SET status = "review", retry_count = retry_count + 1 WHERE id = ?'
                ).bind(content.id).run();
              }
  
              return Response.json({ 
                success: true, 
                message: `Retrying ${failedContent.results.length} failed items`,
                retried_count: failedContent.results.length
              }, { headers: corsHeaders });
  
            case 'bulk_approve':
              // Bulk approve high-confidence content
              const threshold = params?.confidence_threshold || 0.85;
              
              const approved = await env.DB.prepare(`
                UPDATE content 
                SET status = 'published', approved_at = ?, approved_by = ?
                WHERE status = 'review' AND ai_confidence >= ?
              `).bind(Date.now(), payload.user_id, threshold).run();
  
              return Response.json({ 
                success: true, 
                message: `Bulk approved ${approved.changes} items`,
                approved_count: approved.changes
              }, { headers: corsHeaders });
  
            case 'clear_errors':
              // Clear pipeline error log
              await env.KV.delete('pipeline-errors');
              return Response.json({ 
                success: true, 
                message: 'Error log cleared' 
              }, { headers: corsHeaders });
  
            default:
              return Response.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });
          }
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Pipeline control failed', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };