// workers/admin/rss-sources-management.js - RSS source management micro-worker
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
          // Get all RSS sources with health status
          const sources = await env.DB.prepare(`
            SELECT 
              rs.*,
              rsh.last_check,
              rsh.last_success,
              rsh.error_count,
              rsh.last_error,
              rsh.items_fetched,
              CASE 
                WHEN rsh.last_check IS NULL THEN 'unchecked'
                WHEN rsh.last_success > (? - 86400000) THEN 'healthy'
                WHEN rsh.error_count > 3 THEN 'failed'
                ELSE 'warning'
              END as health_status
            FROM rss_sources rs
            LEFT JOIN rss_source_health rsh ON rs.id = rsh.source_id
            ORDER BY rs.priority DESC, rs.name
          `).bind(Date.now()).all();
  
          // Get overall health statistics
          const healthStats = sources.results.reduce((acc, source) => {
            acc[source.health_status] = (acc[source.health_status] || 0) + 1;
            return acc;
          }, {});
  
          return Response.json({
            sources: sources.results.map(source => ({
              id: source.id,
              name: source.name,
              url: source.url,
              category: source.category,
              neighborhood_id: source.neighborhood_id,
              priority: source.priority,
              active: source.active === 1,
              health_status: source.health_status,
              last_check: source.last_check,
              last_success: source.last_success,
              error_count: source.error_count || 0,
              last_error: source.last_error,
              items_fetched: source.items_fetched || 0,
              created_at: source.created_at
            })),
            health_summary: {
              total: sources.results.length,
              healthy: healthStats.healthy || 0,
              warning: healthStats.warning || 0,
              failed: healthStats.failed || 0,
              unchecked: healthStats.unchecked || 0
            }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'POST') {
          // Add new RSS source
          const { name, url, category, neighborhood_id, priority } = await request.json();
  
          // Validate required fields
          if (!name || !url || !category) {
            return Response.json({ 
              error: 'Name, URL, and category are required' 
            }, { status: 400, headers: corsHeaders });
          }
  
          // Validate URL format
          try {
            new URL(url);
          } catch (e) {
            return Response.json({ 
              error: 'Invalid URL format' 
            }, { status: 400, headers: corsHeaders });
          }
  
          // Check if URL already exists
          const existingSource = await env.DB.prepare(
            'SELECT id FROM rss_sources WHERE url = ?'
          ).bind(url).first();
  
          if (existingSource) {
            return Response.json({ 
              error: 'RSS source with this URL already exists' 
            }, { status: 409, headers: corsHeaders });
          }
  
          // Create new source
          const sourceId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO rss_sources (
              id, name, url, category, neighborhood_id, priority, active, created_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            sourceId,
            name,
            url,
            category,
            neighborhood_id || null,
            priority || 5,
            1, // active by default
            Date.now(),
            payload.user_id
          ).run();
  
          // Test the RSS source immediately
          try {
            await testRSSSource(url);
            await env.DB.prepare(`
              INSERT INTO rss_source_health (source_id, last_check, last_success, items_fetched)
              VALUES (?, ?, ?, ?)
            `).bind(sourceId, Date.now(), Date.now(), 0).run();
          } catch (error) {
            await env.DB.prepare(`
              INSERT INTO rss_source_health (source_id, last_check, error_count, last_error)
              VALUES (?, ?, ?, ?)
            `).bind(sourceId, Date.now(), 1, error.message).run();
          }
  
          return Response.json({
            success: true,
            message: 'RSS source added successfully',
            source: {
              id: sourceId,
              name,
              url,
              category,
              neighborhood_id,
              priority: priority || 5
            }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'PUT') {
          // Update RSS source
          const url = new URL(request.url);
          const sourceId = url.pathname.split('/').pop();
          const { name, url: sourceUrl, category, neighborhood_id, priority, active } = await request.json();
  
          if (!sourceId) {
            return Response.json({ error: 'Source ID required' }, { status: 400, headers: corsHeaders });
          }
  
          // Check if source exists
          const existingSource = await env.DB.prepare('SELECT * FROM rss_sources WHERE id = ?').bind(sourceId).first();
          
          if (!existingSource) {
            return Response.json({ error: 'RSS source not found' }, { status: 404, headers: corsHeaders });
          }
  
          // Prepare updates
          const updates = [];
          const params = [];
  
          if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
          }
  
          if (sourceUrl !== undefined) {
            // Validate new URL
            try {
              new URL(sourceUrl);
            } catch (e) {
              return Response.json({ error: 'Invalid URL format' }, { status: 400, headers: corsHeaders });
            }
            updates.push('url = ?');
            params.push(sourceUrl);
          }
  
          if (category !== undefined) {
            updates.push('category = ?');
            params.push(category);
          }
  
          if (neighborhood_id !== undefined) {
            updates.push('neighborhood_id = ?');
            params.push(neighborhood_id);
          }
  
          if (priority !== undefined) {
            updates.push('priority = ?');
            params.push(priority);
          }
  
          if (active !== undefined) {
            updates.push('active = ?');
            params.push(active ? 1 : 0);
          }
  
          if (updates.length === 0) {
            return Response.json({ error: 'No updates provided' }, { status: 400, headers: corsHeaders });
          }
  
          updates.push('updated_at = ?');
          params.push(Date.now());
          params.push(sourceId);
  
          await env.DB.prepare(`
            UPDATE rss_sources 
            SET ${updates.join(', ')} 
            WHERE id = ?
          `).bind(...params).run();
  
          return Response.json({ 
            success: true, 
            message: 'RSS source updated successfully' 
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'DELETE') {
          // Delete RSS source
          const url = new URL(request.url);
          const sourceId = url.pathname.split('/').pop();
          const confirm = url.searchParams.get('confirm');
  
          if (!sourceId) {
            return Response.json({ error: 'Source ID required' }, { status: 400, headers: corsHeaders });
          }
  
          if (confirm !== 'true') {
            return Response.json({ 
              error: 'RSS source deletion requires confirmation',
              hint: 'Add ?confirm=true to confirm deletion'
            }, { status: 400, headers: corsHeaders });
          }
  
          // Delete source and its health data
          await env.DB.prepare('DELETE FROM rss_source_health WHERE source_id = ?').bind(sourceId).run();
          await env.DB.prepare('DELETE FROM rss_sources WHERE id = ?').bind(sourceId).run();
  
          return Response.json({ 
            success: true, 
            message: 'RSS source deleted successfully' 
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'RSS source management failed', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Test RSS source function
  async function testRSSSource(url) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AI News Prague RSS Checker/1.0'
      }
    });
  
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  
    const content = await response.text();
    
    // Basic RSS/XML validation
    if (!content.includes('<rss') && !content.includes('<feed') && !content.includes('<atom')) {
      throw new Error('Content does not appear to be a valid RSS/Atom feed');
    }
  
    // Could add more sophisticated RSS parsing here
    return true;
  }