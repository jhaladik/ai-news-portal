// workers/pipeline/pipeline-orchestrator.js - Fixed production version
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
        // Handle GET request - return status
        if (request.method === 'GET') {
          try {
            // Get latest pipeline run from KV
            const latestRunKey = await env.AI_NEWS_KV.get('latest-pipeline-run');
            let latestRun = null;
            
            if (latestRunKey) {
              const runData = await env.AI_NEWS_KV.get(`pipeline-run-${latestRunKey}`);
              if (runData) {
                latestRun = JSON.parse(runData);
              }
            }
  
            return Response.json({
              status: 'active',
              pipeline_orchestrator: 'running',
              latest_run: latestRun,
              timestamp: Date.now()
            }, { headers: corsHeaders });
          } catch (error) {
            return Response.json({
              status: 'active',
              pipeline_orchestrator: 'running',
              latest_run: null,
              timestamp: Date.now(),
              note: 'KV access limited'
            }, { headers: corsHeaders });
          }
        }
  
        // Handle POST request - run pipeline
        if (request.method === 'POST') {
          const body = await request.json().catch(() => ({}));
          const { mode = 'full', force = false } = body;
          
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
            worker_status: {}
          };
  
          console.log(`Starting pipeline mode: ${mode}, run_id: ${results.pipeline_run_id}`);
  
          // Step 1: RSS Collection
          if (mode === 'full' || mode === 'collect') {
            try {
              console.log('Step 1: Starting RSS collection...');
              const collectResponse = await fetch('https://rss-collect.jhaladik.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              
              if (collectResponse.ok) {
                const collectData = await collectResponse.json();
                results.collected = collectData.collected || 0;
                results.worker_status.rss_collect = 'success';
                console.log(`RSS collection completed: ${results.collected} items`);
              } else {
                const errorText = await collectResponse.text();
                results.errors.push(`RSS collection failed: HTTP ${collectResponse.status} - ${errorText}`);
                results.worker_status.rss_collect = 'failed';
              }
            } catch (error) {
              results.errors.push(`RSS collection error: ${error.message}`);
              results.worker_status.rss_collect = 'error';
              console.error('RSS collection error:', error);
            }
          }
  
          // Step 2: AI Scoring
          if (mode === 'full' || mode === 'score') {
            try {
              console.log('Step 2: Starting AI scoring...');
              const scoreResponse = await fetch('https://ai-data-score.jhaladik.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({})
              });
              
              if (scoreResponse.ok) {
                const scoreData = await scoreResponse.json();
                results.scored = scoreData.qualified || scoreData.processed || 0;
                results.worker_status.ai_data_score = 'success';
                console.log(`AI scoring completed: ${results.scored} items scored`);
              } else {
                const errorText = await scoreResponse.text();
                results.errors.push(`AI scoring failed: HTTP ${scoreResponse.status} - ${errorText}`);
                results.worker_status.ai_data_score = 'failed';
              }
            } catch (error) {
              results.errors.push(`AI scoring error: ${error.message}`);
              results.worker_status.ai_data_score = 'error';
              console.error('AI scoring error:', error);
            }
          }
  
          // Step 3: Content Generation
          if (mode === 'full' || mode === 'generate') {
            try {
              console.log('Step 3: Starting content generation...');
              
              // Check if we have database access for this step
              if (!env.DB) {
                results.errors.push('Database not available for content generation');
                results.worker_status.content_generation = 'no_db';
              } else {
                // Get qualified content ready for generation
                const readyContent = await env.DB.prepare(`
                  SELECT * FROM raw_content 
                  WHERE raw_score >= 0.6 AND processed_at IS NOT NULL 
                  ORDER BY raw_score DESC 
                  LIMIT 5
                `).all().catch(() => ({ results: [] }));
  
                for (const item of readyContent.results) {
                  try {
                    const generateResponse = await fetch('https://ai-generate-enhanced.jhaladik.workers.dev/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        raw_content_id: item.id,
                        neighborhood: 'praha4',
                        category: item.category || 'general'
                      })
                    });
  
                    if (generateResponse.ok) {
                      results.generated++;
                    } else {
                      console.warn(`Generation failed for item ${item.id}: ${generateResponse.status}`);
                    }
                  } catch (error) {
                    console.warn(`Generation error for item ${item.id}:`, error.message);
                  }
                }
                
                results.worker_status.content_generation = 'success';
                console.log(`Content generation completed: ${results.generated} items generated`);
              }
            } catch (error) {
              results.errors.push(`Content generation error: ${error.message}`);
              results.worker_status.content_generation = 'error';
              console.error('Content generation error:', error);
            }
          }
  
          // Step 4: Validation
          if (mode === 'full' || mode === 'validate') {
            try {
              console.log('Step 4: Starting validation...');
              
              if (!env.DB) {
                results.errors.push('Database not available for validation');
                results.worker_status.validation = 'no_db';
              } else {
                const unvalidatedContent = await env.DB.prepare(`
                  SELECT * FROM content 
                  WHERE status = 'generated' AND ai_confidence IS NULL 
                  LIMIT 3
                `).all().catch(() => ({ results: [] }));
  
                for (const content of unvalidatedContent.results) {
                  try {
                    const validateResponse = await fetch('https://ai-validate-enhanced.jhaladik.workers.dev/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content_id: content.id,
                        content_text: content.content,
                        category: content.category || 'general'
                      })
                    });
  
                    if (validateResponse.ok) {
                      const validationData = await validateResponse.json();
                      
                      if (validationData.approved) {
                        await env.DB.prepare(`
                          UPDATE content SET status = 'validated', ai_confidence = ? WHERE id = ?
                        `).bind(validationData.confidence || 0.8, content.id).run();
                        
                        results.validated++;
                      }
                    }
                  } catch (error) {
                    console.warn(`Validation error for content ${content.id}:`, error.message);
                  }
                }
                
                results.worker_status.validation = 'success';
                console.log(`Validation completed: ${results.validated} items validated`);
              }
            } catch (error) {
              results.errors.push(`Validation error: ${error.message}`);
              results.worker_status.validation = 'error';
              console.error('Validation error:', error);
            }
          }
  
          // Step 5: Publication
          if (mode === 'full' || mode === 'publish') {
            try {
              console.log('Step 5: Starting publication...');
              
              if (!env.DB) {
                results.errors.push('Database not available for publication');
                results.worker_status.publication = 'no_db';
              } else {
                const publishableContent = await env.DB.prepare(`
                  SELECT * FROM content 
                  WHERE status = 'validated' AND ai_confidence >= 0.8 
                  LIMIT 2
                `).all().catch(() => ({ results: [] }));
  
                for (const content of publishableContent.results) {
                  try {
                    const publishResponse = await fetch('https://content-publish.jhaladik.workers.dev/', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        content_id: content.id,
                        auto_publish: true
                      })
                    });
  
                    if (publishResponse.ok) {
                      results.published++;
                    }
                  } catch (error) {
                    console.warn(`Publication error for content ${content.id}:`, error.message);
                  }
                }
                
                results.worker_status.publication = 'success';
                console.log(`Publication completed: ${results.published} items published`);
              }
            } catch (error) {
              results.errors.push(`Publication error: ${error.message}`);
              results.worker_status.publication = 'error';
              console.error('Publication error:', error);
            }
          }
  
          // Complete pipeline run
          results.completed_at = Date.now();
          results.duration_ms = results.completed_at - results.started_at;
          results.success = results.errors.length === 0;
  
          console.log(`Pipeline completed: ${results.success ? 'SUCCESS' : 'WITH ERRORS'}, duration: ${results.duration_ms}ms`);
  
          // Store results in KV
          try {
            if (env.AI_NEWS_KV) {
              await env.AI_NEWS_KV.put(
                `pipeline-run-${results.pipeline_run_id}`,
                JSON.stringify(results),
                { expirationTtl: 7 * 24 * 3600 } // 7 days
              );
              
              await env.AI_NEWS_KV.put(
                'latest-pipeline-run',
                results.pipeline_run_id,
                { expirationTtl: 30 * 24 * 3600 } // 30 days
              );
            }
          } catch (error) {
            console.warn('Failed to store pipeline results in KV:', error);
            results.errors.push(`KV storage failed: ${error.message}`);
          }
  
          return Response.json(results, { headers: corsHeaders });
        }
  
        // Handle other methods
        return Response.json({
          error: 'Method not allowed',
          allowed_methods: ['GET', 'POST', 'OPTIONS']
        }, { 
          status: 405, 
          headers: corsHeaders 
        });
  
      } catch (error) {
        console.error('Pipeline orchestrator error:', error);
        
        return Response.json({
          error: 'Pipeline orchestration failed',
          details: error.message,
          timestamp: Date.now(),
          pipeline_run_id: crypto.randomUUID(),
          success: false
        }, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  };