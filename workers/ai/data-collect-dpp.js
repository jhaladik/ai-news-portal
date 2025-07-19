// workers/ai/data-collect-dpp.js - Prague transport disruptions
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
        // Mock DPP disruptions (real API requires authentication)
        const mockDisruptions = [
          {
            id: 'tram_22_delay',
            title: 'Zpoždění tramvaje 22',
            description: 'Tramvaj 22 má zpoždění 5-10 minut kvůli technické závadě na Náměstí Míru',
            line: '22',
            type: 'delay',
            severity: 'minor',
            start_time: Date.now() - 1800000, // 30 min ago
            affected_stops: ['Náměstí Míru', 'Jiřího z Poděbrad', 'Flora']
          },
          {
            id: 'metro_a_closure',
            title: 'Uzavření stanice metra',
            description: 'Stanice Můstek dočasně uzavřena - technické problémy s eskalátory',
            line: 'A',
            type: 'closure',
            severity: 'major',
            start_time: Date.now() - 3600000, // 1 hour ago
            affected_stops: ['Můstek']
          },
          {
            id: 'bus_133_detour',
            title: 'Odklon autobusu 133',
            description: 'Autobus 133 jede odklonem kvůli uzavírce na Vinohradské',
            line: '133',
            type: 'detour',
            severity: 'minor',
            start_time: Date.now() - 900000, // 15 min ago
            affected_stops: ['Vinohradská', 'Flora', 'Strašnická']
          }
        ];
  
        // Randomly select 1-2 active disruptions
        const activeDisruptions = mockDisruptions
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.floor(Math.random() * 2) + 1);
  
        // Store interesting disruptions in database for AI processing
        let storedCount = 0;
        for (const disruption of activeDisruptions) {
          if (disruption.severity === 'major' || Math.random() > 0.6) {
            await env.DB.prepare(`
              INSERT INTO content (id, title, content, category, neighborhood_id, status, ai_confidence, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              `transport-${disruption.id}-${Date.now()}`,
              disruption.title,
              `${disruption.description}\n\nLinka: ${disruption.line}\nZasažené zastávky: ${disruption.affected_stops.join(', ')}`,
              'transport',
              'vinohrady', // Default neighborhood
              'ai_generated',
              0.7, // Base confidence for transport data
              Date.now()
            ).run();
            storedCount++;
          }
        }
  
        // Store transport data in KV for AI processing
        await env.AI_NEWS_KV.put(
          `transport-data-${Date.now()}`,
          JSON.stringify({
            timestamp: Date.now(),
            disruptions: activeDisruptions,
            summary: `${activeDisruptions.length} aktivních omezení`
          }),
          { expirationTtl: 86400 }
        );
  
        return Response.json({
          success: true,
          disruptions: activeDisruptions.length,
          stored_articles: storedCount,
          active_issues: activeDisruptions.map(d => ({
            line: d.line,
            type: d.type,
            severity: d.severity,
            title: d.title
          }))
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Transport data collection failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };