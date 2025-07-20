// workers/rss-sources-management.js
export default {
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }
  
      const url = new URL(request.url);
      
      try {
        switch (request.method) {
          case 'GET':
            // Get all RSS sources
            const sources = await env.DB.prepare(`
              SELECT * FROM rss_sources ORDER BY name
            `).all();
            
            return Response.json({
              sources: sources.results
            }, { headers: corsHeaders });
  
          case 'POST':
            // Add new RSS source
            const newSource = await request.json();
            await env.DB.prepare(`
              INSERT INTO rss_sources (id, name, url, category_hint, enabled)
              VALUES (?, ?, ?, ?, 1)
            `).bind(
              newSource.id || newSource.name.toLowerCase().replace(/\s+/g, '-'),
              newSource.name,
              newSource.url,
              newSource.category_hint || 'general'
            ).run();
            
            return Response.json({ success: true }, { headers: corsHeaders });
  
          case 'PUT':
            // Update RSS source
            const updates = await request.json();
            await env.DB.prepare(`
              UPDATE rss_sources 
              SET enabled = ?, last_fetched = ?, fetch_count = ?, error_count = ?
              WHERE id = ?
            `).bind(
              updates.enabled,
              updates.last_fetched,
              updates.fetch_count,
              updates.error_count,
              updates.id
            ).run();
            
            return Response.json({ success: true }, { headers: corsHeaders });
  
          case 'DELETE':
            // Delete RSS source
            const { id } = await request.json();
            await env.DB.prepare(`
              DELETE FROM rss_sources WHERE id = ?
            `).bind(id).run();
            
            return Response.json({ success: true }, { headers: corsHeaders });
        }
      } catch (error) {
        return Response.json({ error: error.message }, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  };