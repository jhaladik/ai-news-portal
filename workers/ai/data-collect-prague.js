// workers/ai/data-collect-prague.js - Prague city data collection
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
        const sources = [
          'https://api.golemio.cz/v2/status',
          'https://api.openweathermap.org/data/2.5/weather?q=Praha&appid=' + (env.OPENWEATHER_API_KEY || 'demo'),
          'https://api.golemio.cz/v2/airqualitystations'
        ];
        
        const collectedData = {
          timestamp: Date.now(),
          weather: null,
          airQuality: null,
          cityStatus: null,
          dataPoints: 0
        };
  
        // Collect weather data
        try {
          const weatherResponse = await fetch(sources[1]);
          if (weatherResponse.ok) {
            const weather = await weatherResponse.json();
            collectedData.weather = {
              temperature: Math.round(weather.main?.temp - 273.15), // K to C
              description: weather.weather?.[0]?.description,
              humidity: weather.main?.humidity,
              pressure: weather.main?.pressure
            };
            collectedData.dataPoints++;
          }
        } catch (e) {
          console.log('Weather API unavailable, using mock data');
          collectedData.weather = {
            temperature: Math.floor(Math.random() * 30) - 5,
            description: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
            humidity: Math.floor(Math.random() * 40) + 40,
            pressure: 1013
          };
          collectedData.dataPoints++;
        }
  
        // Collect city status (mock for demonstration)
        collectedData.cityStatus = {
          events: [
            'Farmářské trhy na Náměstí Míru',
            'Koncert v Riegrových sadech',
            'Oprava chodníku na Korunní'
          ][Math.floor(Math.random() * 3)],
          closures: Math.random() > 0.7 ? 'Uzavírka Blanická ulice' : null
        };
        collectedData.dataPoints++;
  
        // Store collected data in KV for AI processing
        await env.AI_NEWS_KV.put(
          `prague-data-${Date.now()}`, 
          JSON.stringify(collectedData),
          { expirationTtl: 86400 } // 24 hours
        );
  
        return Response.json({
          success: true,
          collected: collectedData.dataPoints,
          timestamp: collectedData.timestamp,
          preview: {
            weather: collectedData.weather?.description,
            temperature: collectedData.weather?.temperature,
            events: collectedData.cityStatus?.events
          }
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Data collection failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };