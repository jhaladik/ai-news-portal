// workers/pipeline/pipeline-orchestrator.js - Workflow coordinator
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
        const { mode = 'full', force = false } = await request.json() || {};
        
        const results = {
          pipeline_run_id: crypto.randomUUID(),
          started_at: Date.now(),
          collected: 0,
          scored: 0,
          generated: 0,
          validated: 0,
          published: 0,
          errors: []
        };
  
        // Step 1: RSS Collection
        if (mode === 'full' || mode === 'collect') {
          try {
            const collectResponse = await fetch('https://rss-collect.jhaladik.workers.dev/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            const collectData = await collectResponse.json();
            results.collected = collectData.collected || 0;
          } catch (error) {
            results.errors.push(`RSS collection failed: ${error.message}`);
          }
        }
  
        // Step 2: AI Scoring
        if (mode === 'full' || mode === 'score') {
          try {
            const scoreResponse = await fetch('https://ai-data-score.jhaladik.workers.dev/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            
            const scoreData = await scoreResponse.json();
            results.scored = scoreData.qualified || 0;
          } catch (error) {
            results.errors.push(`AI scoring failed: ${error.message}`);
          }
        }
  
        // Step 3: Content Generation
        if (mode === 'full' || mode === 'generate') {
          try {
            // Get scored content ready for generation
            const readyContent = await env.DB.prepare(`
              SELECT * FROM raw_content 
              WHERE raw_score >= 0.6 AND processed_at IS NOT NULL 
              ORDER BY raw_score DESC 
              LIMIT 10
            `).all();
  
            for (const item of readyContent.results) {
              try {
                const generateResponse = await fetch('https://ai-generate-enhanced.jhaladik.workers.dev/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    raw_content_id: item.id,
                    neighborhood: 'praha4',
                    category: item.category
                  })
                });
  
                if (generateResponse.ok) {
                  results.generated++;
                }
              } catch (error) {
                results.errors.push(`Generation failed for item ${item.id}: ${error.message}`);
              }
            }
          } catch (error) {
            results.errors.push(`Content generation step failed: ${error.message}`);
          }
        }
  
        // Step 4: Enhanced Validation
        if (mode === 'full' || mode === 'validate') {
          try {
            const unvalidatedContent = await env.DB.prepare(`
              SELECT * FROM content 
              WHERE status = 'generated' AND ai_confidence IS NULL 
              LIMIT 5
            `).all();
  
            for (const content of unvalidatedContent.results) {
              try {
                const validateResponse = await fetch('https://ai-validate-enhanced.jhaladik.workers.dev/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    content_id: content.id,
                    content_text: content.content,
                    category: content.category
                  })
                });
  
                const validationData = await validateResponse.json();
                
                if (validationData.approved) {
                  await env.DB.prepare(`
                    UPDATE content SET status = 'validated' WHERE id = ?
                  `).bind(content.id).run();
                  
                  results.validated++;
                }
              } catch (error) {
                results.errors.push(`Validation failed for content ${content.id}: ${error.message}`);
              }
            }
          } catch (error) {
            results.errors.push(`Validation step failed: ${error.message}`);
          }
        }
  
        // Step 5: Auto Publication
        if (mode === 'full' || mode === 'publish') {
          try {
            const publishableContent = await env.DB.prepare(`
              SELECT * FROM content 
              WHERE status = 'validated' AND ai_confidence >= 0.85 
              LIMIT 3
            `).all();
  
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
                results.errors.push(`Publication failed for content ${content.id}: ${error.message}`);
              }
            }
          } catch (error) {
            results.errors.push(`Publication step failed: ${error.message}`);
          }
        }
  
        // Log pipeline results
        results.completed_at = Date.now();
        results.duration_ms = results.completed_at - results.started_at;
        results.success = results.errors.length === 0;
  
        await env.AI_NEWS_KV.put(
          `pipeline-run-${results.pipeline_run_id}`,
          JSON.stringify(results),
          { expirationTtl: 7 * 24 * 3600 } // 7 days
        );
  
        return Response.json(results, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Pipeline orchestration failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };