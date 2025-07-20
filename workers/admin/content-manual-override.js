// workers/admin/content-manual-override.js - Manual content editing micro-worker
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
          // Get content for editing
          const url = new URL(request.url);
          const contentId = url.pathname.split('/').pop();
  
          if (!contentId) {
            return Response.json({ error: 'Content ID required' }, { status: 400, headers: corsHeaders });
          }
  
          const content = await env.DB.prepare(`
            SELECT 
              c.*,
              n.name as neighborhood_name,
              u.email as approved_by_email
            FROM content c
            LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
            LEFT JOIN users u ON c.approved_by = u.id
            WHERE c.id = ?
          `).bind(contentId).first();
  
          if (!content) {
            return Response.json({ error: 'Content not found' }, { status: 404, headers: corsHeaders });
          }
  
          // Get edit history
          const editHistory = await env.DB.prepare(`
            SELECT 
              action,
              changes,
              edited_by,
              edited_at,
              u.email as editor_email
            FROM content_edit_history ceh
            LEFT JOIN users u ON ceh.edited_by = u.id
            WHERE content_id = ?
            ORDER BY edited_at DESC
            LIMIT 10
          `).bind(contentId).all();
  
          return Response.json({
            content: {
              id: content.id,
              title: content.title,
              content: content.content,
              category: content.category,
              neighborhood_id: content.neighborhood_id,
              neighborhood_name: content.neighborhood_name,
              status: content.status,
              ai_confidence: content.ai_confidence,
              source_url: content.source_url,
              approved_by: content.approved_by,
              approved_by_email: content.approved_by_email,
              created_at: content.created_at,
              updated_at: content.updated_at
            },
            edit_history: editHistory.results
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'PUT') {
          // Update/override content
          const url = new URL(request.url);
          const contentId = url.pathname.split('/').pop();
          const { title, content, category, neighborhood_id, status, override_reason } = await request.json();
  
          if (!contentId) {
            return Response.json({ error: 'Content ID required' }, { status: 400, headers: corsHeaders });
          }
  
          // Get current content for history
          const currentContent = await env.DB.prepare('SELECT * FROM content WHERE id = ?').bind(contentId).first();
          
          if (!currentContent) {
            return Response.json({ error: 'Content not found' }, { status: 404, headers: corsHeaders });
          }
  
          // Validate inputs
          const validStatuses = ['draft', 'ai_generated', 'review', 'published', 'rejected', 'failed'];
          const validCategories = ['emergency', 'local', 'business', 'community', 'events'];
  
          if (status && !validStatuses.includes(status)) {
            return Response.json({ error: 'Invalid status' }, { status: 400, headers: corsHeaders });
          }
  
          if (category && !validCategories.includes(category)) {
            return Response.json({ error: 'Invalid category' }, { status: 400, headers: corsHeaders });
          }
  
          // Prepare updates
          const updates = [];
          const params = [];
          const changes = {};
  
          if (title !== undefined && title !== currentContent.title) {
            updates.push('title = ?');
            params.push(title);
            changes.title = { from: currentContent.title, to: title };
          }
  
          if (content !== undefined && content !== currentContent.content) {
            updates.push('content = ?');
            params.push(content);
            changes.content = { from: currentContent.content?.substring(0, 100) + '...', to: content.substring(0, 100) + '...' };
          }
  
          if (category !== undefined && category !== currentContent.category) {
            updates.push('category = ?');
            params.push(category);
            changes.category = { from: currentContent.category, to: category };
          }
  
          if (neighborhood_id !== undefined && neighborhood_id !== currentContent.neighborhood_id) {
            updates.push('neighborhood_id = ?');
            params.push(neighborhood_id);
            changes.neighborhood_id = { from: currentContent.neighborhood_id, to: neighborhood_id };
          }
  
          if (status !== undefined && status !== currentContent.status) {
            updates.push('status = ?');
            params.push(status);
            changes.status = { from: currentContent.status, to: status };
  
            // If publishing, set approval fields
            if (status === 'published') {
              updates.push('approved_by = ?', 'approved_at = ?');
              params.push(payload.user_id, Date.now());
              changes.approved = { by: payload.user_id, at: Date.now() };
            }
          }
  
          if (updates.length === 0) {
            return Response.json({ error: 'No changes provided' }, { status: 400, headers: corsHeaders });
          }
  
          // Add manual override flag and timestamp
          updates.push('manual_override = ?', 'updated_at = ?');
          params.push(1, Date.now());
          params.push(contentId);
  
          // Update content
          await env.DB.prepare(`
            UPDATE content 
            SET ${updates.join(', ')} 
            WHERE id = ?
          `).bind(...params).run();
  
          // Record edit history
          await env.DB.prepare(`
            INSERT INTO content_edit_history (
              content_id, action, changes, override_reason, edited_by, edited_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            contentId,
            'manual_override',
            JSON.stringify(changes),
            override_reason || 'Manual admin override',
            payload.user_id,
            Date.now()
          ).run();
  
          return Response.json({ 
            success: true, 
            message: 'Content updated successfully',
            changes_made: Object.keys(changes)
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'DELETE') {
          // Delete content (with admin confirmation)
          const url = new URL(request.url);
          const contentId = url.pathname.split('/').pop();
          const confirm = url.searchParams.get('confirm');
  
          if (!contentId) {
            return Response.json({ error: 'Content ID required' }, { status: 400, headers: corsHeaders });
          }
  
          if (confirm !== 'true') {
            return Response.json({ 
              error: 'Content deletion requires confirmation',
              hint: 'Add ?confirm=true to confirm deletion'
            }, { status: 400, headers: corsHeaders });
          }
  
          // Record deletion in history before deleting
          await env.DB.prepare(`
            INSERT INTO content_edit_history (
              content_id, action, changes, override_reason, edited_by, edited_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            contentId,
            'delete',
            JSON.stringify({ deleted: true }),
            'Admin deletion',
            payload.user_id,
            Date.now()
          ).run();
  
          // Delete content
          await env.DB.prepare('DELETE FROM content WHERE id = ?').bind(contentId).run();
  
          return Response.json({ 
            success: true, 
            message: 'Content deleted successfully' 
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Content override failed', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };