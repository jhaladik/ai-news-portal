// workers/ai/scheduler-daily.js - Daily automation pipeline (Cron Trigger)
export default {
    // Main scheduled event handler
    async scheduled(event, env, ctx) {
      try {
        console.log('Starting daily AI content pipeline:', new Date().toISOString());
  
        // Step 1: Data Collection
        console.log('Step 1: Collecting Prague data...');
        const pragueDataResponse = await fetch('https://data-collect-prague.your-domain.workers.dev/');
        const pragueData = await pragueDataResponse.json();
        
        const transportDataResponse = await fetch('https://data-collect-dpp.your-domain.workers.dev/');
        const transportData = await transportDataResponse.json();
  
        console.log(`Data collected: Prague (${pragueData.collected} points), Transport (${transportData.disruptions} disruptions)`);
  
        // Step 2: Generate AI content for each active neighborhood
        const neighborhoods = await env.DB.prepare(`
          SELECT * FROM neighborhoods WHERE status = 'active'
        `).all();
  
        const generationResults = [];
        
        for (const neighborhood of neighborhoods.results) {
          console.log(`Generating content for ${neighborhood.name}...`);
  
          // Generate different types of content
          const contentTypes = [
            { category: 'local', type: 'daily_summary' },
            { category: 'weather', type: 'forecast' },
            { category: 'transport', type: 'status_update' }
          ];
  
          for (const contentType of contentTypes) {
            try {
              const generateResponse = await fetch('https://ai-generate.your-domain.workers.dev/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  neighborhood: neighborhood.slug,
                  category: contentType.category,
                  type: contentType.type,
                  data: {
                    weather: pragueData.preview,
                    transport: transportData.active_issues,
                    location: neighborhood.name
                  }
                })
              });
  
              if (generateResponse.ok) {
                const generated = await generateResponse.json();
                generationResults.push({
                  neighborhood: neighborhood.name,
                  category: contentType.category,
                  id: generated.id,
                  success: true
                });
              }
            } catch (error) {
              console.error(`Generation failed for ${neighborhood.name}/${contentType.category}:`, error);
              generationResults.push({
                neighborhood: neighborhood.name,
                category: contentType.category,
                success: false,
                error: error.message
              });
            }
          }
        }
  
        // Step 3: Validate and score generated content
        console.log('Step 3: Running content validation...');
        const scoringResponse = await fetch('https://ai-score.your-domain.workers.dev/?batch=true&threshold=0.7');
        const scoringResults = await scoringResponse.json();
  
        // Step 4: Auto-approve high-quality content
        console.log('Step 4: Auto-approving high-quality content...');
        const approvalResponse = await fetch('https://content-auto-approve.your-domain.workers.dev/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ threshold: 0.85 })
        });
        const approvalResults = await approvalResponse.json();
  
        // Step 5: Log daily summary
        const summary = {
          timestamp: Date.now(),
          data_collection: {
            prague_points: pragueData.collected,
            transport_disruptions: transportData.disruptions
          },
          content_generation: {
            neighborhoods_processed: neighborhoods.results.length,
            content_generated: generationResults.filter(r => r.success).length,
            generation_failures: generationResults.filter(r => !r.success).length
          },
          validation: {
            items_scored: scoringResults.batch_processed || 0
          },
          auto_approval: {
            items_approved: approvalResults.approved || 0
          }
        };
  
        // Store daily summary in KV
        await env.AI_NEWS_KV.put(
          `daily-summary-${new Date().toISOString().split('T')[0]}`,
          JSON.stringify(summary),
          { expirationTtl: 7 * 24 * 3600 } // Keep for 7 days
        );
  
        console.log('Daily pipeline completed:', summary);
        return new Response('Daily pipeline completed successfully', { status: 200 });
  
      } catch (error) {
        console.error('Daily pipeline failed:', error);
        return new Response(`Daily pipeline failed: ${error.message}`, { status: 500 });
      }
    },
  
    // Manual trigger endpoint (for testing)
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
        // Create a mock scheduled event
        const mockEvent = {
          type: 'scheduled',
          cron: '0 8 * * *', // 8 AM daily
          scheduledTime: Date.now()
        };
  
        // Call the scheduled handler
        const result = await this.scheduled(mockEvent, env, null);
        
        return Response.json({
          success: true,
          message: 'Daily pipeline executed manually',
          timestamp: Date.now()
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Manual pipeline execution failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };