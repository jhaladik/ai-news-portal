// workers/content/content-create.js - Content creation micro-worker
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

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    try {
      const { title, content, category, neighborhood_id, created_by } = await request.json();

      // Validate required fields
      if (!title || !content || !category || !neighborhood_id) {
        return Response.json({ 
          error: 'Missing required fields: title, content, category, neighborhood_id' 
        }, { status: 400, headers: corsHeaders });
      }

      // Valid categories for Phase 1
      const validCategories = ['emergency', 'local', 'business', 'community'];
      if (!validCategories.includes(category)) {
        return Response.json({ 
          error: 'Invalid category. Must be: emergency, local, business, community' 
        }, { status: 400, headers: corsHeaders });
      }

      const id = crypto.randomUUID();
      
      // Insert into remote database
      await env.DB.prepare(`
        INSERT INTO content (id, title, content, category, neighborhood_id, created_by, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(id, title, content, category, neighborhood_id, created_by || 'manual', 'draft').run();

      return Response.json({
        success: true,
        id,
        title,
        category,
        neighborhood_id,
        status: 'draft',
        created_at: Date.now()
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ 
        error: 'Content creation failed', 
        details: error.message 
      }, { status: 500, headers: corsHeaders });
    }
  }
};