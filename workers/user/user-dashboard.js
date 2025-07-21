// workers/user/user-dashboard.js - Personalized content dashboard micro-worker
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
        // Extract JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
        }
  
        const token = authHeader.substring(7);

        // Handle both JWT and simple base64 formats
        let payload;
        try {
          if (token.includes('.')) {
            // JWT format - decode middle part
            const parts = token.split('.');
            if (parts.length !== 3) {
              throw new Error('Invalid JWT format');
            }
            payload = JSON.parse(atob(parts[1]));
          } else {
            // Simple base64 format (current auth-login format)
            payload = JSON.parse(atob(token));
          }
        } catch (error) {
          return Response.json({ error: 'Invalid token format', details: error.message }, { status: 401, headers: corsHeaders });
        }
        
        const userId = payload.userId || payload.user_id;
        
        if (!userId) {
          return Response.json({ error: 'Invalid token payload' }, { status: 401, headers: corsHeaders });
        }
  
        // Get user preferences
        const preferences = await env.DB.prepare(`
          SELECT categories, neighborhoods, notification_frequency
          FROM user_preferences 
          WHERE user_id = ?
        `).bind(userId).first();
  
        const userCategories = ['emergency', 'local', 'community'];
        const userNeighborhoods = [payload.neighborhood_id || 'vinohrady'].filter(Boolean);
  
        // URL parameters
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit')) || 20;
        const offset = parseInt(url.searchParams.get('offset')) || 0;
        const category = url.searchParams.get('category');
  
        // Build dynamic query based on preferences
        let whereClause = 'WHERE c.status = "published"';
        let params = [];
  
        // Filter by user's preferred neighborhoods
        if (userNeighborhoods.length > 0) {
          const placeholders = userNeighborhoods.map(() => '?').join(',');
          whereClause += ` AND c.neighborhood_id IN (${placeholders})`;
          params.push(...userNeighborhoods);
        }
  
        // Filter by category if specified, otherwise use user preferences
        if (category) {
          whereClause += ' AND c.category = ?';
          params.push(category);
        } else if (userCategories.length > 0) {
          const placeholders = userCategories.map(() => '?').join(',');
          whereClause += ` AND c.category IN (${placeholders})`;
          params.push(...userCategories);
        }
  
        // Get personalized content
        // Main content query (ensure all params are defined)
        const allParams = [...params.filter(p => p !== undefined), limit, offset];
        const content = await env.DB.prepare(`
        SELECT 
            c.id,
            c.title,
            c.content,
            c.category,
            c.ai_confidence,
            c.created_at,
            n.name as neighborhood_name,
            n.slug as neighborhood_slug
        FROM content c
        LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT ? OFFSET ?
        `).bind(...allParams).all();

        // Get content statistics for dashboard
        // User statistics (handle safe neighborhood binding)
        let stats = { results: [] };
        if (userNeighborhoods.length > 0) {
        const validNeighborhoods = userNeighborhoods.filter(n => n !== undefined && n !== null);
        if (validNeighborhoods.length > 0) {
            stats = await env.DB.prepare(`
            SELECT 
                c.category,
                COUNT(*) as count
            FROM content c
            WHERE c.status = 'published' 
                AND c.neighborhood_id IN (${validNeighborhoods.map(() => '?').join(',')})
            GROUP BY c.category
            `).bind(...validNeighborhoods).all();
        }
        }
  
        // Get recent activity
        let recentActivity = { results: [] };
        if (userNeighborhoods.length > 0) {
          recentActivity = await env.DB.prepare(`
            SELECT 
              'content_published' as type,
              c.title as description,
              c.created_at as timestamp
            FROM content c
            WHERE c.status = 'published'
              AND c.neighborhood_id IN (${userNeighborhoods.map(() => '?').join(',')})
            ORDER BY c.created_at DESC
            LIMIT 10
          `).bind(...userNeighborhoods).all();
        }
  
        // Get unread count (content newer than user's last login)
        const userProfile = await env.DB.prepare(`
          SELECT last_login FROM users WHERE id = ?
        `).bind(userId).first();
  
        let unreadCount = { count: 0 };
        if (userNeighborhoods.length > 0) {
          const unreadParams = [...userNeighborhoods, userProfile?.last_login || 0];
          unreadCount = await env.DB.prepare(`
            SELECT COUNT(*) as count
            FROM content c
            WHERE c.status = 'published' 
              AND c.created_at > ?
              AND c.neighborhood_id IN (${userNeighborhoods.map(() => '?').join(',')})
          `).bind(...unreadParams).first();
        }
  
        // Update user's last login
        await env.DB.prepare(`
          UPDATE users SET last_login = ? WHERE id = ?
        `).bind(Date.now(), userId).run();
  
        return Response.json({
          content: content.results.map(item => ({
            id: item.id,
            title: item.title,
            content: item.content.substring(0, 300) + (item.content.length > 300 ? '...' : ''),
            category: item.category,
            ai_confidence: item.ai_confidence,
            neighborhood_name: item.neighborhood_name,
            neighborhood_slug: item.neighborhood_slug,
            created_at: item.created_at
          })),
          statistics: {
            categories: stats.results,
            total_content: content.results.length,
            unread_count: unreadCount.count
          },
          recent_activity: recentActivity.results,
          user_preferences: {
            categories: userCategories,
            neighborhoods: userNeighborhoods,
            notification_frequency: preferences?.notification_frequency || 'daily'
          },
          pagination: {
            limit,
            offset,
            has_more: content.results.length === limit
          }
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to load dashboard', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };