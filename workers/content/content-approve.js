// workers/content/content-approve.js - Content approval micro-worker
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
      const { id, action, approved_by } = await request.json();

      if (!id || !action) {
        return Response.json({ 
          error: 'Missing required fields: id, action' 
        }, { status: 400, headers: corsHeaders });
      }

      const validActions = ['approve', 'reject', 'archive'];
      if (!validActions.includes(action)) {
        return Response.json({ 
          error: 'Invalid action. Must be: approve, reject, archive' 
        }, { status: 400, headers: corsHeaders });
      }

      // Get current content
      const content = await env.DB.prepare(
        'SELECT * FROM content WHERE id = ?'
      ).bind(id).first();

      if (!content) {
        return Response.json({ error: 'Content not found' }, { status: 404, headers: corsHeaders });
      }

      // Update status based on action
      let newStatus;
      switch (action) {
        case 'approve':
          newStatus = 'published';
          break;
        case 'reject':
          newStatus = 'rejected';
          break;
        case 'archive':
          newStatus = 'archived';
          break;
      }

      // Update content in remote database
      await env.DB.prepare(`
        UPDATE content 
        SET status = ?, published_at = ?, created_by = ?
        WHERE id = ?
      `).bind(
        newStatus, 
        action === 'approve' ? Date.now() : null,
        approved_by || 'admin',
        id
      ).run();

      return Response.json({
        success: true,
        id,
        action,
        newStatus,
        title: content.title,
        timestamp: Date.now()
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ 
        error: 'Content approval failed', 
        details: error.message 
      }, { status: 500, headers: corsHeaders });
    }
  }
};