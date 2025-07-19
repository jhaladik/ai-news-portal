// workers/auth/auth-login.js - Simple authentication micro-worker
export default {
  async fetch(request, env) {
    // CORS headers function (inline for self-contained worker)
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
      const { email, password } = await request.json();

      // Get user from remote database
      const user = await env.DB.prepare(
        'SELECT * FROM users WHERE email = ?'
      ).bind(email).first();

      // Simple password check for MVP (improve in Phase 2)
      if (!user || password !== 'admin123') {
        return Response.json({ error: 'Invalid credentials' }, { status: 401, headers: corsHeaders });
      }

      // Create simple JWT token (improve in Phase 2)
      const token = btoa(JSON.stringify({
        userId: user.id,
        email: user.email,
        role: user.role,
        exp: Date.now() + 86400000 // 24 hours
      }));

      // Update last login
      await env.DB.prepare(
        'UPDATE users SET last_login = ? WHERE id = ?'
      ).bind(Date.now(), user.id).run();

      return Response.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          neighborhood_id: user.neighborhood_id
        }
      }, { headers: corsHeaders });

    } catch (error) {
      return Response.json({ error: 'Login failed', details: error.message }, { status: 500, headers: corsHeaders });
    }
  }
};