// workers/admin/admin-analytics.js - Analytics and metrics micro-worker
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
  
        const url = new URL(request.url);
        const timeframe = url.searchParams.get('timeframe') || '7d';
        const neighborhood = url.searchParams.get('neighborhood');
  
        // Calculate time range
        const timeRanges = {
          '1d': 86400000,    // 1 day
          '7d': 604800000,   // 7 days
          '30d': 2592000000, // 30 days
          '90d': 7776000000  // 90 days
        };
  
        const timeRange = timeRanges[timeframe] || timeRanges['7d'];
        const startTime = Date.now() - timeRange;
  
        // User analytics
        const userStats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN created_at > ? THEN 1 END) as new_users,
            COUNT(CASE WHEN last_login > ? THEN 1 END) as active_users,
            COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users
          FROM users
          ${neighborhood ? 'WHERE neighborhood_id = ?' : ''}
        `).bind(startTime, startTime, ...(neighborhood ? [neighborhood] : [])).first();
  
        // Content analytics
        const contentStats = await env.DB.prepare(`
          SELECT 
            status,
            category,
            COUNT(*) as count,
            AVG(ai_confidence) as avg_confidence,
            MIN(created_at) as oldest,
            MAX(created_at) as newest
          FROM content 
          WHERE created_at > ?
          ${neighborhood ? 'AND neighborhood_id = ?' : ''}
          GROUP BY status, category
        `).bind(startTime, ...(neighborhood ? [neighborhood] : [])).all();
  
        // Newsletter analytics
        const newsletterStats = await env.DB.prepare(`
          SELECT 
            COUNT(DISTINCT n.id) as newsletters_sent,
            COUNT(ns.newsletter_id) as total_sends,
            COUNT(ns.opened_at) as total_opens,
            COUNT(ns.clicked_at) as total_clicks,
            ROUND(AVG(CASE WHEN ns.opened_at IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100, 2) as open_rate,
            ROUND(AVG(CASE WHEN ns.clicked_at IS NOT NULL THEN 1.0 ELSE 0.0 END) * 100, 2) as click_rate
          FROM newsletters n
          LEFT JOIN newsletter_sends ns ON n.id = ns.newsletter_id
          WHERE n.sent_at > ?
          ${neighborhood ? 'AND n.neighborhood_id = ?' : ''}
        `).bind(startTime, ...(neighborhood ? [neighborhood] : [])).first();
  
        // Neighborhood breakdown
        const neighborhoodStats = await env.DB.prepare(`
          SELECT 
            n.id,
            n.name,
            n.subscriber_count,
            COUNT(c.id) as content_count,
            AVG(c.ai_confidence) as avg_ai_confidence
          FROM neighborhoods n
          LEFT JOIN content c ON n.id = c.neighborhood_id AND c.created_at > ?
          GROUP BY n.id, n.name, n.subscriber_count
          ORDER BY n.subscriber_count DESC
        `).bind(startTime).all();
  
        // Daily trends (last 30 days)
        const dailyTrends = await env.DB.prepare(`
          SELECT 
            DATE(created_at / 1000, 'unixepoch') as date,
            COUNT(*) as content_created,
            COUNT(CASE WHEN status = 'published' THEN 1 END) as content_published,
            AVG(ai_confidence) as avg_confidence
          FROM content 
          WHERE created_at > ?
          ${neighborhood ? 'AND neighborhood_id = ?' : ''}
          GROUP BY date
          ORDER BY date DESC
          LIMIT 30
        `).bind(Date.now() - 2592000000, ...(neighborhood ? [neighborhood] : [])).all();
  
        // Performance metrics
        const performanceMetrics = {
          content_by_status: contentStats.results.reduce((acc, row) => {
            acc[row.status] = (acc[row.status] || 0) + row.count;
            return acc;
          }, {}),
          content_by_category: contentStats.results.reduce((acc, row) => {
            acc[row.category] = (acc[row.category] || 0) + row.count;
            return acc;
          }, {}),
          average_ai_confidence: contentStats.results.reduce((sum, row) => sum + (row.avg_confidence || 0), 0) / contentStats.results.length || 0
        };
  
        return Response.json({
          timeframe,
          generated_at: Date.now(),
          users: {
            total: userStats.total_users,
            new: userStats.new_users,
            active: userStats.active_users,
            admins: userStats.admin_users,
            activity_rate: userStats.total_users > 0 ? Math.round((userStats.active_users / userStats.total_users) * 100) : 0
          },
          content: {
            by_status: performanceMetrics.content_by_status,
            by_category: performanceMetrics.content_by_category,
            average_confidence: Math.round(performanceMetrics.average_ai_confidence * 100) / 100,
            total_created: Object.values(performanceMetrics.content_by_status).reduce((a, b) => a + b, 0)
          },
          newsletters: {
            sent: newsletterStats.newsletters_sent || 0,
            total_sends: newsletterStats.total_sends || 0,
            total_opens: newsletterStats.total_opens || 0,
            total_clicks: newsletterStats.total_clicks || 0,
            open_rate: newsletterStats.open_rate || 0,
            click_rate: newsletterStats.click_rate || 0
          },
          neighborhoods: neighborhoodStats.results.map(n => ({
            id: n.id,
            name: n.name,
            subscribers: n.subscriber_count || 0,
            content_count: n.content_count || 0,
            avg_ai_confidence: Math.round((n.avg_ai_confidence || 0) * 100) / 100
          })),
          trends: {
            daily: dailyTrends.results.reverse() // Show oldest to newest
          }
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to generate analytics', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };