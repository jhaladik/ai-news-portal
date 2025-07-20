// workers/content/content-publish.js - Smart publication with categories
export default {
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }
  
      try {
        const { content_id, auto_publish = false, neighborhood_id } = await request.json();
  
        if (!content_id) {
          return Response.json({ error: 'Content ID required' }, { status: 400, headers: corsHeaders });
        }
  
        // Get content to publish
        const content = await env.DB.prepare(`
          SELECT * FROM content 
          WHERE id = ? AND (status = 'approved' OR status = 'validated')
        `).bind(content_id).first();
  
        if (!content) {
          return Response.json({ error: 'Content not found or not ready for publication' }, { status: 404, headers: corsHeaders });
        }
  
        // Check if content meets publication criteria
        const canAutoPublish = content.ai_confidence >= 0.85 && 
                              content.validation_notes && 
                              !content.validation_notes.includes('manual_review');
  
        if (auto_publish && !canAutoPublish) {
          return Response.json({ 
            error: 'Content does not meet auto-publication criteria',
            confidence: content.ai_confidence,
            required_confidence: 0.85
          }, { status: 400, headers: corsHeaders });
        }
  
        // Determine target neighborhoods
        const targetNeighborhoods = await getTargetNeighborhoods(content, neighborhood_id, env);
        
        // Publish content
        const published_at = Date.now();
        const published_id = crypto.randomUUID();
  
        await env.DB.prepare(`
          UPDATE content 
          SET status = 'published', published_at = ?, published_id = ?
          WHERE id = ?
        `).bind(published_at, published_id, content_id).run();
  
        // Create publication records for each neighborhood
        for (const neighborhood of targetNeighborhoods) {
          await env.DB.prepare(`
            INSERT INTO publications 
            (id, content_id, neighborhood_id, category, published_at, auto_published)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(), content_id, neighborhood.id, 
            content.category, published_at, auto_publish ? 1 : 0
          ).run();
        }
  
        // Log publication event
        await env.AI_NEWS_KV.put(
          `publication-${published_id}`,
          JSON.stringify({
            content_id,
            neighborhoods: targetNeighborhoods.length,
            category: content.category,
            confidence: content.ai_confidence,
            auto_published: auto_publish,
            timestamp: published_at
          }),
          { expirationTtl: 30 * 24 * 3600 } // 30 days
        );
  
        return Response.json({
          published: true,
          published_id,
          content_id,
          neighborhoods: targetNeighborhoods.length,
          category: content.category,
          confidence: content.ai_confidence,
          auto_published: auto_publish
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Publication failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  async function getTargetNeighborhoods(content, specified_neighborhood_id, env) {
    if (specified_neighborhood_id) {
      // Publish to specific neighborhood
      const neighborhood = await env.DB.prepare(`
        SELECT * FROM neighborhoods WHERE id = ?
      `).bind(specified_neighborhood_id).first();
      
      return neighborhood ? [neighborhood] : [];
    }
  
    // Auto-determine neighborhoods based on content category
    let whereClause = '';
    const categoryMapping = {
      'emergency': "WHERE name LIKE '%Praha%'", // All Prague neighborhoods
      'transport': "WHERE name LIKE '%Praha%'", // All Prague neighborhoods  
      'weather': "WHERE name LIKE '%Praha%'", // All Prague neighborhoods
      'local_government': "WHERE id = ? LIMIT 1", // Specific neighborhood from content
      'community': "WHERE id = ? LIMIT 1", // Specific neighborhood from content
      'business': "WHERE id = ? LIMIT 1" // Specific neighborhood from content
    };
  
    whereClause = categoryMapping[content.category] || "WHERE subscriber_count > 10 LIMIT 3";
  
    const neighborhoods = await env.DB.prepare(`
      SELECT * FROM neighborhoods ${whereClause}
    `).bind(content.neighborhood_id || 'praha4').all();
  
    return neighborhoods.results || [];
  }