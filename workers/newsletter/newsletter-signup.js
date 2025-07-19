// workers/newsletter/newsletter-signup.js - Newsletter signup micro-worker
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
      const { email, neighborhood_id } = await request.json();

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return Response.json({ error: 'Valid email is required' }, { status: 400, headers: corsHeaders });
      }

      if (!neighborhood_id) {
        return Response.json({ error: 'Neighborhood selection is required' }, { status: 400, headers: corsHeaders });
      }

      // Check if email already exists
      const existingUser = await env.DB.prepare(
        'SELECT id FROM users WHERE email = ?'
      ).bind(email).first();

      if (existingUser) {
        return Response.json({ 
          error: 'Email already subscribed',
          alreadySubscribed: true 
        }, { status: 409, headers: corsHeaders });
      }

      // Create new subscriber
      const userId = crypto.randomUUID();
      await env.DB.prepare(`
        INSERT INTO users (id, email, neighborhood_id, role, verified) 
        VALUES (?, ?, ?, ?, ?)
      `).bind(userId, email, neighborhood_id, 'subscriber', 1).run();

      // Update neighborhood subscriber count
      await env.DB.prepare(`
        UPDATE neighborhoods 
        SET subscriber_count = subscriber_count + 1 
        WHERE id = ?
      `).bind(neighborhood_id).run();

      return Response.json({
        success: true,
        message: 'Successfully subscribed to newsletter',
        user: {
          id: userId,
          email,
          neighborhood_id,
          role: 'subscriber'
        }
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ 
        error: 'Newsletter signup failed', 
        details: error.message 
      }, { status: 500, headers: corsHeaders });
    }
  }
};