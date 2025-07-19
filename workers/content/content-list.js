// workers/content/content-list.js - Content listing micro-worker
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
      const neighborhood = url.searchParams.get('neighborhood') || 'vinohrady';
      const status = url.searchParams.get('status') || 'published';
      const category = url.searchParams.get('category');
      const limit = parseInt(url.searchParams.get('limit')) || 20;

      // Build query based on parameters
      let query = `
        SELECT 
          c.*,
          n.name as neighborhood_name
        FROM content c
        LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
        WHERE c.neighborhood_id = ? AND c.status = ?
      `;
      let params = [neighborhood, status];

      // Add category filter if specified
      if (category) {
        query += ' AND c.category = ?';
        params.push(category);
      }

      query += ' ORDER BY c.created_at DESC LIMIT ?';
      params.push(limit);

      // Execute query on remote database
      const result = await env.DB.prepare(query).bind(...params).all();

      // Format response
      const articles = result.results.map(article => ({
        id: article.id,
        title: article.title,
        content: article.content,
        category: article.category,
        neighborhood: {
          id: article.neighborhood_id,
          name: article.neighborhood_name
        },
        ai_confidence: article.ai_confidence,
        created_at: article.created_at,
        published_at: article.published_at
      }));

      return Response.json({
        success: true,
        articles,
        total: articles.length,
        neighborhood,
        status,
        category: category || 'all'
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ 
        error: 'Failed to fetch content', 
        details: error.message 
      }, { status: 500, headers: corsHeaders });
    }
  }
};