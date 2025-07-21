// workers/user/user-profile.js - User profile management micro-worker
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
          
        if (request.method === 'GET') {
          // Get user profile
          const user = await env.DB.prepare(`
            SELECT 
              u.id,
              u.email,
              u.name,
              u.neighborhood_id,
              u.role,
              u.verified,
              u.created_at,
              u.last_login,
              n.name as neighborhood_name,
              n.slug as neighborhood_slug
            FROM users u
            LEFT JOIN neighborhoods n ON u.neighborhood_id = n.id
            WHERE u.id = ?
          `).bind(userId).first();
  
          if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
          }
  
          // Get user statistics
          const stats = await env.DB.prepare(`
            SELECT 
              (SELECT COUNT(*) FROM newsletter_sends WHERE user_id = ?) as newsletters_received,
              (SELECT COUNT(*) FROM newsletter_sends WHERE user_id = ? AND opened_at IS NOT NULL) as newsletters_opened,
              (SELECT COUNT(*) FROM newsletter_sends WHERE user_id = ? AND clicked_at IS NOT NULL) as newsletters_clicked
          `).bind(userId, userId, userId).first();
  
          return Response.json({
            profile: {
              id: user.id,
              email: user.email,
              name: user.name,
              neighborhood_id: user.neighborhood_id,
              neighborhood_name: user.neighborhood_name,
              neighborhood_slug: user.neighborhood_slug,
              role: user.role,
              verified: user.verified === 1,
              created_at: user.created_at,
              last_login: user.last_login
            },
            statistics: {
              newsletters_received: stats.newsletters_received || 0,
              newsletters_opened: stats.newsletters_opened || 0,
              newsletters_clicked: stats.newsletters_clicked || 0,
              engagement_rate: stats.newsletters_received > 0 
                ? Math.round((stats.newsletters_opened / stats.newsletters_received) * 100) 
                : 0
            }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'PUT') {
          // Update user profile
          const { name, neighborhood_id } = await request.json();
  
          // Validate neighborhood exists
          if (neighborhood_id) {
            const neighborhood = await env.DB.prepare(
              'SELECT id FROM neighborhoods WHERE id = ?'
            ).bind(neighborhood_id).first();
  
            if (!neighborhood) {
              return Response.json({ error: 'Invalid neighborhood' }, { status: 400, headers: corsHeaders });
            }
          }
  
          // Update user profile
          const updates = [];
          const params = [];
  
          if (name !== undefined) {
            updates.push('name = ?');
            params.push(name);
          }
  
          if (neighborhood_id !== undefined) {
            updates.push('neighborhood_id = ?');
            params.push(neighborhood_id);
          }
  
          if (updates.length === 0) {
            return Response.json({ error: 'No updates provided' }, { status: 400, headers: corsHeaders });
          }
  
          updates.push('updated_at = ?');
          params.push(Date.now());
          params.push(userId);
  
          await env.DB.prepare(`
            UPDATE users 
            SET ${updates.join(', ')} 
            WHERE id = ?
          `).bind(...params).run();
  
          return Response.json({ 
            success: true, 
            message: 'Profile updated successfully' 
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'DELETE') {
          // Delete user account (GDPR compliance)
          const url = new URL(request.url);
          const confirm = url.searchParams.get('confirm');
  
          if (confirm !== 'true') {
            return Response.json({ 
              error: 'Account deletion requires confirmation',
              hint: 'Add ?confirm=true to confirm deletion'
            }, { status: 400, headers: corsHeaders });
          }
  
          // Delete user data (cascade)
          await env.DB.prepare('DELETE FROM newsletter_sends WHERE user_id = ?').bind(userId).run();
          await env.DB.prepare('DELETE FROM user_preferences WHERE user_id = ?').bind(userId).run();
          await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  
          return Response.json({ 
            success: true, 
            message: 'Account deleted successfully' 
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to manage profile', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };