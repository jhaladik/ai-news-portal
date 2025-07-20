// workers/user/user-preferences.js - User content preferences micro-worker
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
        const userId = payload.user_id;
  
        if (request.method === 'GET') {
          // Get user preferences
          const preferences = await env.DB.prepare(`
            SELECT 
              categories,
              neighborhoods,
              notification_frequency,
              email_enabled,
              updated_at
            FROM user_preferences 
            WHERE user_id = ?
          `).bind(userId).first();
  
          if (!preferences) {
            // Return default preferences
            return Response.json({
              categories: ['emergency', 'local', 'community'],
              neighborhoods: [payload.neighborhood_id || 'vinohrady'],
              notification_frequency: 'daily',
              email_enabled: true,
              updated_at: null
            }, { headers: corsHeaders });
          }
  
          return Response.json({
            categories: JSON.parse(preferences.categories || '[]'),
            neighborhoods: JSON.parse(preferences.neighborhoods || '[]'),
            notification_frequency: preferences.notification_frequency,
            email_enabled: preferences.email_enabled === 1,
            updated_at: preferences.updated_at
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'PUT') {
          // Update user preferences
          const { categories, neighborhoods, notification_frequency, email_enabled } = await request.json();
  
          // Validate input
          const validCategories = ['emergency', 'local', 'business', 'community', 'events'];
          const validFrequencies = ['daily', 'weekly', 'monthly'];
  
          if (categories && !categories.every(cat => validCategories.includes(cat))) {
            return Response.json({ error: 'Invalid categories' }, { status: 400, headers: corsHeaders });
          }
  
          if (notification_frequency && !validFrequencies.includes(notification_frequency)) {
            return Response.json({ error: 'Invalid notification frequency' }, { status: 400, headers: corsHeaders });
          }
  
          // Upsert preferences
          await env.DB.prepare(`
            INSERT INTO user_preferences (
              user_id, categories, neighborhoods, notification_frequency, email_enabled, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              categories = excluded.categories,
              neighborhoods = excluded.neighborhoods,
              notification_frequency = excluded.notification_frequency,
              email_enabled = excluded.email_enabled,
              updated_at = excluded.updated_at
          `).bind(
            userId,
            JSON.stringify(categories || []),
            JSON.stringify(neighborhoods || []),
            notification_frequency || 'daily',
            email_enabled ? 1 : 0,
            Date.now()
          ).run();
  
          return Response.json({ 
            success: true, 
            message: 'Preferences updated successfully'
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Failed to manage preferences', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };