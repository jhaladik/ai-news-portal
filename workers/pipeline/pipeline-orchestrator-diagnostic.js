// workers/pipeline/pipeline-orchestrator-diagnostic.js - Simple diagnostic version
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
        // Basic diagnostics
        const diagnostics = {
          timestamp: Date.now(),
          method: request.method,
          url: request.url,
          has_db: !!env.DB,
          has_kv: !!env.AI_NEWS_KV,
          environment_vars: {
            has_db: 'DB' in env,
            has_kv: 'AI_NEWS_KV' in env,
          }
        };
  
        // If GET request, return diagnostics
        if (request.method === 'GET') {
          return Response.json({
            status: 'diagnostic_mode',
            diagnostics,
            message: 'Pipeline orchestrator in diagnostic mode'
          }, { headers: corsHeaders });
        }
  
        // If POST request, try basic pipeline simulation
        if (request.method === 'POST') {
          const { mode = 'full' } = await request.json().catch(() => ({}));
          
          const results = {
            pipeline_run_id: crypto.randomUUID(),
            started_at: Date.now(),
            mode,
            collected: 0,
            scored: 0,
            generated: 0,
            validated: 0,
            published: 0,
            errors: [],
            diagnostics
          };
  
          // Test database connection
          try {
            if (env.DB) {
              const testQuery = await env.DB.prepare("SELECT 1 as test").first();
              results.database_test = 'success';
            } else {
              results.errors.push('Database not available');
              results.database_test = 'failed';
            }
          } catch (error) {
            results.errors.push(`Database error: ${error.message}`);
            results.database_test = 'error';
          }
  
          // Mock results for now
          results.collected = Math.floor(Math.random() * 20) + 5;
          results.scored = Math.floor(results.collected * 0.7);
          results.generated = Math.floor(results.scored * 0.8);
          results.validated = Math.floor(results.generated * 0.9);
          results.published = Math.floor(results.validated * 0.8);
  
          results.completed_at = Date.now();
          results.duration_ms = results.completed_at - results.started_at;
          results.success = results.errors.length === 0;
  
          // Try to store in KV if available
          try {
            if (env.AI_NEWS_KV) {
              await env.AI_NEWS_KV.put(
                `pipeline-run-${results.pipeline_run_id}`,
                JSON.stringify(results),
                { expirationTtl: 3600 } // 1 hour for diagnostic
              );
              results.kv_storage = 'success';
            } else {
              results.kv_storage = 'not_available';
            }
          } catch (error) {
            results.errors.push(`KV storage error: ${error.message}`);
            results.kv_storage = 'error';
          }
  
          return Response.json(results, { headers: corsHeaders });
        }
  
      } catch (error) {
        console.error('Pipeline orchestrator error:', error);
        
        return Response.json({
          error: 'Pipeline orchestration failed',
          details: error.message,
          stack: error.stack,
          timestamp: Date.now()
        }, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  };