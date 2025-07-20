// workers/admin/admin-dashboard.js - Admin dashboard data aggregation micro-worker
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
  
      if (request.method !== 'GET') {
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
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
  
        // Get current pipeline status
        const pipelineStatus = await env.KV.get('pipeline-status') || 'idle';
        const lastRun = await env.KV.get('pipeline-last-run');
        const pipelineErrors = await env.KV.get('pipeline-errors');
  
        // Get content queue overview
        const contentQueue = await env.DB.prepare(`
          SELECT 
            status,
            COUNT(*) as count,
            AVG(ai_confidence) as avg_confidence,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
          FROM content 
          WHERE created_at > ?
          GROUP BY status
          ORDER BY 
            CASE status
              WHEN 'failed' THEN 1
              WHEN 'review' THEN 2
              WHEN 'ai_generated' THEN 3
              WHEN 'draft' THEN 4
              WHEN 'published' THEN 5
              ELSE 6
            END
        `).bind(Date.now() - 86400000).all(); // Last 24 hours
  
        // Get urgent items requiring attention
        const urgentItems = await env.DB.prepare(`
          SELECT 
            'failed_content' as type,
            COUNT(*) as count,
            'Content processing failures' as description
          FROM content 
          WHERE status = 'failed' AND created_at > ?
          
          UNION ALL
          
          SELECT 
            'review_queue' as type,
            COUNT(*) as count,
            'Items pending manual review' as description
          FROM content 
          WHERE status = 'review' AND created_at > ?
          
          UNION ALL
          
          SELECT 
            'low_confidence' as type,
            COUNT(*) as count,
            'Low confidence AI content' as description
          FROM content 
          WHERE status = 'ai_generated' AND ai_confidence < 0.7 AND created_at > ?
        `).bind(Date.now() - 86400000, Date.now() - 86400000, Date.now() - 86400000).all();
  
        // Get recent activity feed
        const recentActivity = await env.DB.prepare(`
          SELECT 
            'content' as type,
            c.id,
            c.title,
            c.status,
            c.category,
            c.created_at as timestamp,
            n.name as neighborhood_name,
            'Content ' || c.status as description
          FROM content c
          LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
          WHERE c.updated_at > ?
          
          UNION ALL
          
          SELECT 
            'user' as type,
            u.id,
            u.email as title,
            u.role as status,
            'registration' as category,
            u.created_at as timestamp,
            n.name as neighborhood_name,
            'New user registered' as description
          FROM users u
          LEFT JOIN neighborhoods n ON u.neighborhood_id = n.id
          WHERE u.created_at > ?
          
          ORDER BY timestamp DESC
          LIMIT 15
        `).bind(Date.now() - 86400000, Date.now() - 86400000).all();
  
        // Get system health metrics
        const systemHealth = {
          database: 'healthy', // Could add actual health checks
          workers: 'healthy',
          pipeline: pipelineStatus === 'running' ? 'active' : pipelineStatus === 'error' ? 'error' : 'idle'
        };
  
        // Get RSS source status
        const rssSourceHealth = await env.KV.get('rss-sources-health');
        const rssHealth = rssSourceHealth ? JSON.parse(rssSourceHealth) : { healthy: 0, failed: 0, total: 0 };
  
        // Get user engagement metrics
        const userMetrics = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN last_login > ? THEN 1 END) as active_users,
            COUNT(CASE WHEN created_at > ? THEN 1 END) as new_users
          FROM users
        `).bind(Date.now() - 604800000, Date.now() - 86400000).first(); // 7 days, 1 day
  
        // Get newsletter performance
        const newsletterMetrics = await env.DB.prepare(`
          SELECT 
            COUNT(DISTINCT n.id) as newsletters_sent,
            COUNT(ns.newsletter_id) as total_sends,
            COUNT(ns.opened_at) as total_opens,
            ROUND(AVG(CASE WHEN ns.opened_at IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100, 1) as open_rate
          FROM newsletters n
          LEFT JOIN newsletter_sends ns ON n.id = ns.newsletter_id
          WHERE n.sent_at > ?
        `).bind(Date.now() - 604800000).first(); // Last 7 days
  
        // Calculate processing efficiency
        const totalProcessed = contentQueue.results.reduce((sum, item) => sum + item.count, 0);
        const successfullyProcessed = contentQueue.results
          .filter(item => ['published', 'review'].includes(item.status))
          .reduce((sum, item) => sum + item.count, 0);
        
        const processingEfficiency = totalProcessed > 0 
          ? Math.round((successfullyProcessed / totalProcessed) * 100) 
          : 100;
  
        return Response.json({
          generated_at: Date.now(),
          overview: {
            pipeline_status: pipelineStatus,
            last_pipeline_run: lastRun ? parseInt(lastRun) : null,
            processing_efficiency: processingEfficiency,
            urgent_items_count: urgentItems.results.reduce((sum, item) => sum + item.count, 0)
          },
          content_queue: {
            by_status: contentQueue.results.reduce((acc, item) => {
              acc[item.status] = {
                count: item.count,
                avg_confidence: Math.round((item.avg_confidence || 0) * 100) / 100,
                oldest: item.oldest,
                newest: item.newest
              };
              return acc;
            }, {}),
            total_items: totalProcessed
          },
          urgent_items: urgentItems.results.filter(item => item.count > 0),
          recent_activity: recentActivity.results.map(activity => ({
            type: activity.type,
            id: activity.id,
            title: activity.title,
            description: activity.description,
            status: activity.status,
            category: activity.category,
            neighborhood: activity.neighborhood_name,
            timestamp: activity.timestamp
          })),
          system_health: {
            ...systemHealth,
            rss_sources: rssHealth,
            pipeline_errors: pipelineErrors ? JSON.parse(pipelineErrors).length : 0
          },
          metrics: {
            users: {
              total: userMetrics.total_users || 0,
              active: userMetrics.active_users || 0,
              new: userMetrics.new_users || 0,
              engagement_rate: userMetrics.total_users > 0 
                ? Math.round((userMetrics.active_users / userMetrics.total_users) * 100) 
                : 0
            },
            newsletters: {
              sent: newsletterMetrics.newsletters_sent || 0,
              total_sends: newsletterMetrics.total_sends || 0,
              total_opens: newsletterMetrics.total_opens || 0,
              open_rate: newsletterMetrics.open_rate || 0
            }
          },
          quick_actions: [
            {
              id: 'trigger_pipeline',
              label: 'Trigger Pipeline',
              description: 'Manually start RSS content collection',
              enabled: pipelineStatus !== 'running'
            },
            {
              id: 'bulk_approve',
              label: 'Bulk Approve',
              description: 'Approve high-confidence content',
              enabled: contentQueue.results.some(q => q.status === 'review' && q.count > 0)
            },
            {
              id: 'retry_failed',
              label: 'Retry Failed',
              description: 'Retry failed content processing',
              enabled: contentQueue.results.some(q => q.status === 'failed' && q.count > 0)
            }
          ]
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to load dashboard', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };