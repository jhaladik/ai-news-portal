// workers/newsletter/newsletter-archive.js - Newsletter archive micro-worker
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
        // Extract JWT token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
          return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
        }
  
        const token = authHeader.substring(7);
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userId = payload.userId;
  
        if (request.method === 'GET') {
          // Get newsletter archive for user
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get('limit')) || 10;
          const offset = parseInt(url.searchParams.get('offset')) || 0;
  
          const newsletters = await env.DB.prepare(`
            SELECT 
              n.id,
              n.subject,
              n.content_html,
              n.content_text,
              n.sent_at,
              n.neighborhood_id,
              nh.name as neighborhood_name,
              ns.opened_at,
              ns.clicked_at
            FROM newsletters n
            LEFT JOIN newsletter_sends ns ON n.id = ns.newsletter_id AND ns.user_id = ?
            LEFT JOIN neighborhoods nh ON n.neighborhood_id = nh.id
            WHERE n.status = 'sent' 
              AND (n.neighborhood_id = ? OR n.neighborhood_id IS NULL)
            ORDER BY n.sent_at DESC
            LIMIT ? OFFSET ?
          `).bind(userId, payload.neighborhood_id, limit, offset).all();
  
          // Get total count
          const totalCount = await env.DB.prepare(`
            SELECT COUNT(*) as count
            FROM newsletters n
            WHERE n.status = 'sent' 
              AND (n.neighborhood_id = ? OR n.neighborhood_id IS NULL)
          `).bind(payload.neighborhood_id).first();
  
          return Response.json({
            newsletters: newsletters.results.map(newsletter => ({
              id: newsletter.id,
              subject: newsletter.subject,
              preview: newsletter.content_text ? newsletter.content_text.substring(0, 150) + '...' : '',
              sent_at: newsletter.sent_at,
              neighborhood_name: newsletter.neighborhood_name,
              opened: !!newsletter.opened_at,
              clicked: !!newsletter.clicked_at
            })),
            pagination: {
              total: totalCount.count,
              limit,
              offset,
              has_more: (offset + limit) < totalCount.count
            }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'POST' && request.url.includes('/open/')) {
          // Track newsletter open
          const url = new URL(request.url);
          const newsletterId = url.pathname.split('/').pop();
  
          await env.DB.prepare(`
            INSERT INTO newsletter_sends (newsletter_id, user_id, opened_at)
            VALUES (?, ?, ?)
            ON CONFLICT(newsletter_id, user_id) DO UPDATE SET
              opened_at = COALESCE(opened_at, excluded.opened_at)
          `).bind(newsletterId, userId, Date.now()).run();
  
          return Response.json({ tracked: true }, { headers: corsHeaders });
        }
  
        if (request.method === 'POST' && request.url.includes('/click/')) {
          // Track newsletter click
          const url = new URL(request.url);
          const newsletterId = url.pathname.split('/').pop();
  
          await env.DB.prepare(`
            INSERT INTO newsletter_sends (newsletter_id, user_id, clicked_at)
            VALUES (?, ?, ?)
            ON CONFLICT(newsletter_id, user_id) DO UPDATE SET
              clicked_at = COALESCE(clicked_at, excluded.clicked_at)
          `).bind(newsletterId, userId, Date.now()).run();
  
          return Response.json({ tracked: true }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to access newsletter archive', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };