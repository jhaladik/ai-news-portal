// workers/ai/ai-generate.js - With fallback for testing
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
  
      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
      }
  
      try {
        // In workers/ai/ai-generate.js, replace lines 20-35 with:
        const { data, neighborhood, category, type = 'auto' } = await request.json();

        if (!neighborhood || !category) {
          return Response.json({
            error: 'Missing required fields: neighborhood, category'
          }, { status: 400, headers: corsHeaders });
        }

        // FIXED: Create new variable instead of reassigning const
        let contextData = data || {};
        console.log('🔍 Checking KV for prague data...');
        const pragueDataKeys = await env.AI_NEWS_KV.list({ prefix: 'prague-data-' });
        console.log('📊 Found KV keys count:', pragueDataKeys.keys.length);
        if (pragueDataKeys.keys.length > 0) {
            const latestKey = pragueDataKeys.keys[0].name;
            console.log('🗝️ Using key:', latestKey);
            const pragueData = await env.AI_NEWS_KV.get(latestKey);
            console.log('📦 Retrieved data:', pragueData?.slice(0,100));
            contextData = { ...contextData, ...JSON.parse(pragueData) };
        } else {
            console.log('❌ No KV keys found');
        }
        
        // Check if we have Claude API access or should use fallback
        const useClaudeAPI = env.CLAUDE_API_KEY && env.CLAUDE_API_KEY !== 'demo' && env.CLAUDE_API_KEY.startsWith('sk-ant-');        
        let generatedContent, generatedTitle;
  
        if (useClaudeAPI) {
          // Use real Claude API
          const result = await generateWithClaudeAPI(contextData, neighborhood, category, type, env);
          generatedContent = result.content;
          generatedTitle = result.title;
        } else {
          // Use fallback mock generation for testing
          const result = generateMockContent(contextData, neighborhood, category, type);
          generatedContent = result.content;
          generatedTitle = result.title;
        }
        console.log('🤖 Claude API key exists:', !!env.CLAUDE_API_KEY);
        console.log('🤖 Key starts with sk-ant:', env.CLAUDE_API_KEY?.startsWith('sk-ant-'));
        console.log('🎯 Will use Claude API:', useClaudeAPI);

        // Store generated content in database
        const contentId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO content (id, title, content, category, neighborhood_id, status, ai_confidence, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          contentId,
          generatedTitle,
          generatedContent,
          category,
          neighborhood,
          'ai_generated',
          useClaudeAPI ? 0.75 : 0.60, // Lower confidence for mock content
          useClaudeAPI ? 'ai-generate-claude' : 'ai-generate-mock',
          Date.now()
        ).run();
  
        return Response.json({
          success: true,
          id: contentId,
          title: generatedTitle,
          content: generatedContent,
          category,
          neighborhood,
          confidence: useClaudeAPI ? 0.75 : 0.60,
          mode: useClaudeAPI ? 'claude-api' : 'mock-fallback',
          context_used: Object.keys(data || {}).length > 0,
          timestamp: Date.now()
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'AI content generation failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Real Claude API generation
  async function generateWithClaudeAPI(data, neighborhood, category, type, env) {
    // Prepare context data
    let contextData = data || {};
  
    const prompt = `Vytvoř krátký článek (2-3 odstavce) pro místní zpravodaj čtvrti ${neighborhood} v Praze.
  
  Kategorie: ${category}
  Typ obsahu: ${type}
  
  Kontext a data:
  ${JSON.stringify(contextData, null, 2)}
  
  Požadavky:
  - Piš v češtině
  - Používej místní souvislosti (názvy ulic, míst v ${neighborhood})
  - Buď konkrétní a užitečný pro místní obyvatele
  - Délka: 100-250 slov
  - Tón: přátelský, informativní
  - Zaměř se na praktické informace`;

      // In generateWithClaudeAPI function, add logs:
    console.log('🚀 Making Claude API call...');
    console.log('📝 Prompt:', prompt.slice(0, 100));

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 800,
        messages: [{ role: "user", content: prompt }]
      })
    });

    console.log('📡 Claude response status:', claudeResponse.status);

    if (!claudeResponse.ok) {
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }
  
    const claudeData = await claudeResponse.json();
    const generatedContent = claudeData.content[0].text;
  
    // Generate title
    const titlePrompt = `Na základě tohoto článku vytvoř krátký, výstižný titulek (max 60 znaků):
  
  ${generatedContent}
  
  Odpověz pouze titulkem, bez dalšího textu.`;
  
    const titleResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 100,
        messages: [
          { role: "user", content: titlePrompt }
        ]
      })
    });
  
    const titleData = await titleResponse.json();
    const generatedTitle = titleData.content[0].text.trim().replace(/['"]/g, '');
  
    return { content: generatedContent, title: generatedTitle };
  }
  
  // Mock content generation for testing
  function generateMockContent(data, neighborhood, category, type) {
    const templates = {
      local: {
        titles: [
          `Novinky z ${neighborhood}`,
          `Co se děje v ${neighborhood}`,
          `Místní zprávy ${neighborhood}`,
          `Aktuálně v ${neighborhood}`
        ],
        content: [
          `V ${neighborhood} se v tomto týdnu chystá několik zajímavých událostí. Místní obyvatelé mohou navštívit tradiční farmářské trhy, které se konají každou sobotu dopoledne. 
  
  Kromě toho bude v parku uspořádána komunitní akce pro rodiny s dětmi. Organizátoři připravili zábavný program včetně tvůrčích dílen a sportovních aktivit.
  
  Pro více informací sledujte místní nástěnky nebo kontaktujte městský úřad.`,
          
          `Obyvatelé ${neighborhood} si mohou všimnout zvýšené aktivity v oblasti údržby veřejných prostranství. Pracovníci městských služeb provádějí jarní úklid a opravu chodníků.
  
  Dočasné dopravní omezení budou platit v několika ulicích. Řidiči jsou vyzváni k opatrnosti a využití alternativních tras.
  
  Práce by měly být dokončeny do konce měsíce. Děkujeme za pochopení.`
        ]
      },
      weather: {
        titles: [
          `Počasí v ${neighborhood} tento týden`,
          `Meteorologická předpověď pro ${neighborhood}`,
          `Jak bude počasí v ${neighborhood}`
        ],
        content: [
          `Podle meteorologických prognóz čeká obyvatele ${neighborhood} v příštích dnech příjemné počasí. Teploty se budou pohybovat kolem 15-20°C.
  
  Občasné přeháňky jsou možné zejména odpoledne, proto doporučujeme mít při sobě deštník. Večery budou chladnější.
  
  Ideální počasí pro procházky parkem nebo návštěvu místních kaváren s venkovním posezením.`
        ]
      },
      transport: {
        titles: [
          `Dopravní informace pro ${neighborhood}`,
          `MHD v ${neighborhood} - aktuální stav`,
          `Doprava v ${neighborhood}`
        ],
        content: [
          `Veřejná doprava v ${neighborhood} funguje bez výraznějších problémů. Všechny tramvajové a autobusové linky jezdí podle jízdního řádu.
  
  V příštím týdnu se očekávají drobné zpoždění kvůli plánované údržbě kolejí. Cestující jsou informováni prostřednictvím hlášení na zastávkách.
  
  Pro aktuální informace doporučujeme sledovat aplikaci PID Lítačka nebo webové stránky dopravního podniku.`
        ]
      }
    };
  
    const template = templates[category] || templates.local;
    const randomTitle = template.titles[Math.floor(Math.random() * template.titles.length)];
    const randomContent = template.content[Math.floor(Math.random() * template.content.length)];
  
    // Add context if available
    let enhancedContent = randomContent;
    if (data && data.temperature) {
      enhancedContent = enhancedContent.replace('15-20°C', `${data.temperature}°C`);
    }
  
    return {
      title: randomTitle,
      content: enhancedContent
    };
  }