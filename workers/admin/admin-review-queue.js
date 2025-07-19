// workers/admin/admin-review-queue.js - Admin review queue micro-worker
export default {
  async fetch(request, env) {
    // CORS headers (inline for self-contained worker)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Content-Type': 'application/json'
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || 'draft';
      const limit = parseInt(url.searchParams.get('limit')) || 50;

      // Get pending content for review
      const result = await env.DB.prepare(`
        SELECT 
          c.*,
          n.name as neighborhood_name,
          n.slug as neighborhood_slug
        FROM content c
        LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
        WHERE c.status = ?
        ORDER BY 
          CASE 
            WHEN c.category = 'emergency' THEN 1
            WHEN c.category = 'local' THEN 2
            WHEN c.category = 'business' THEN 3
            WHEN c.category = 'community' THEN 4
            ELSE 5
          END,
          c.ai_confidence DESC,
          c.created_at DESC
        LIMIT ?
      `).bind(status, limit).all();

      // Format for admin dashboard
      const items = result.results.map(item => ({
        id: item.id,
        title: item.title,
        content: item.content,
        category: item.category,
        neighborhood: {
          id: item.neighborhood_id,
          name: item.neighborhood_name,
          slug: item.neighborhood_slug
        },
        ai_confidence: item.ai_confidence || 0,
        status: item.status,
        created_by: item.created_by,
        created_at: item.created_at,
        priority: item.category === 'emergency' ? 'high' : 'normal'
      }));

      // Get summary stats
      const stats = await env.DB.prepare(`
        SELECT 
          status,
          COUNT(*) as count
        FROM content 
        GROUP BY status
      `).all();

      return Response.json({
        success: true,
        items,
        total: items.length,
        status,
        stats: stats.results
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ 
        error: 'Failed to fetch review queue', 
        details: error.message 
      }, { status: 500, headers: corsHeaders });
    }
  }
};