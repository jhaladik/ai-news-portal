// workers/ai/ai-data-score.js - AI-powered content scoring & categorization
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
        // Get unprocessed raw content
        const unprocessed = await env.DB.prepare(`
          SELECT * FROM raw_content 
          WHERE raw_score IS NULL 
          ORDER BY collected_at DESC 
          LIMIT 20
        `).all();
  
        const scored_items = [];
        
        for (const item of unprocessed.results) {
          const scoreData = await scoreContent(item, env);
          
          // Update raw_content with score and category
          await env.DB.prepare(`
            UPDATE raw_content 
            SET raw_score = ?, category = ?, processed_at = ?
            WHERE id = ?
          `).bind(scoreData.score, scoreData.category, Date.now(), item.id).run();
  
          if (scoreData.score >= 0.6) {
            scored_items.push({
              ...item,
              ...scoreData,
              ready_for_generation: true
            });
          }
        }
  
        return Response.json({
          processed: unprocessed.results.length,
          qualified: scored_items.length,
          qualification_rate: scored_items.length / (unprocessed.results.length || 1),
          items: scored_items
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'AI scoring failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  async function scoreContent(item, env) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "x-api-key": env.CLAUDE_API_KEY,
            "anthropic-version": "2023-06-01"
          },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [{
            role: "user",
            // Update the scoring prompt in ai-data-score.js:
            content: `Analyze this Prague content and assign to relevant neighborhoods:

            Title: ${item.title}
            Content: ${item.content.substring(0, 500)}...
            Source: ${item.source}

            EXISTING NEIGHBORHOODS (use these IDs):
            - vinohrady, karlin, smichov, zizkov
            - praha1, praha2, praha4, praha5

            Score from 0.0-1.0 AND assign neighborhood IDs:

            Respond ONLY with valid JSON:
            {
            "score": 0.85,
            "category": "transport",
            "neighborhood_ids": ["vinohrady", "karlin"],
            "reasoning": "Metro line A disruption affects Vinohrady and Karlín stations"
            }`
          }]
        })
      });
  
      const data = await response.json();
      const responseText = data.content[0].text;
      
      // Clean and parse JSON response
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const result = JSON.parse(cleanJson);
      
      return {
        score: Math.min(Math.max(result.score || 0, 0), 1), // Clamp 0-1
        category: result.category || 'other',
        reasoning: result.reasoning || 'No reasoning provided'
      };
  
    } catch (error) {
      console.error('AI scoring error:', error);
      return {
        score: 0.3, // Default low score on error
        category: 'other',
        reasoning: 'Scoring failed - manual review required'
      };
    }
  }