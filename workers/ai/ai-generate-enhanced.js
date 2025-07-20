// workers/ai/ai-generate-enhanced.js - Enhanced AI generation using scored RSS data
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
        const { raw_content_id, neighborhood = 'praha4', category, force = false } = await request.json();
  
        if (!raw_content_id) {
          return Response.json({ error: 'Raw content ID required' }, { status: 400, headers: corsHeaders });
        }
  
        // Get scored raw content
        const rawContent = await env.DB.prepare(`
          SELECT * FROM raw_content 
          WHERE id = ? AND (raw_score >= 0.6 OR ?)
        `).bind(raw_content_id, force).first();
  
        if (!rawContent) {
          return Response.json({ 
            error: 'Raw content not found or score too low',
            required_score: 0.6
          }, { status: 404, headers: corsHeaders });
        }
  
        // Check if already generated
        const existing = await env.DB.prepare(`
          SELECT id FROM content WHERE raw_content_id = ?
        `).bind(raw_content_id).first();
  
        if (existing && !force) {
          return Response.json({ 
            error: 'Content already generated',
            existing_id: existing.id,
            hint: 'Use force=true to regenerate'
          }, { status: 409, headers: corsHeaders });
        }
  
        // Generate enhanced content using AI
        const generatedContent = await generateEnhancedContent(rawContent, neighborhood, env);
        
        // Save generated content
        const content_id = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO content 
          (id, neighborhood_id, category, title, content, summary, ai_confidence, 
           status, raw_content_id, created_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          content_id, neighborhood, category || rawContent.category,
          generatedContent.title, generatedContent.content, generatedContent.summary,
          generatedContent.confidence, 'generated', raw_content_id,
          Date.now(), JSON.stringify(generatedContent.metadata)
        ).run();
  
        return Response.json({
          success: true,
          content_id,
          title: generatedContent.title,
          category: category || rawContent.category,
          confidence: generatedContent.confidence,
          neighborhood,
          source_score: rawContent.raw_score,
          status: 'generated'
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Content generation failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  async function generateEnhancedContent(rawContent, neighborhood, env) {
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
          max_tokens: 800,
          messages: [{
            role: "user",
            content: `Transform this raw content into a polished local news article for ${neighborhood}, Prague:
  
  SOURCE CONTENT:
  Title: ${rawContent.title}
  Content: ${rawContent.content}
  Category: ${rawContent.category}
  Source: ${rawContent.source}
  AI Score: ${rawContent.raw_score}
  
  REQUIREMENTS:
  - Write for residents of ${neighborhood}
  - Include specific neighborhood relevance
  - Professional journalism tone
  - 200-400 words
  - Include practical implications for locals
  - Add context about Prague districts when relevant
  
  STRUCTURE:
  - Compelling headline (max 80 chars)
  - Lead paragraph with key facts
  - 2-3 body paragraphs with details
  - Closing with local impact/next steps
  
  Respond ONLY with valid JSON:
  {
    "title": "Article headline here",
    "content": "Full article text here...",
    "summary": "2-sentence summary for newsletter",
    "confidence": 0.85,
    "metadata": {
      "word_count": 250,
      "local_keywords": ["Praha 4", "Pankrác"],
      "target_audience": "residents"
    }
  }`
          }]
        })
      });
  
      const data = await response.json();
      const responseText = data.content[0].text;
      
      const cleanJson = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      
      const result = JSON.parse(cleanJson);
      
      return {
        title: result.title || rawContent.title,
        content: result.content || 'Content generation failed',
        summary: result.summary || result.content?.substring(0, 200) + '...',
        confidence: Math.min(Math.max(result.confidence || 0.5, 0), 1),
        metadata: result.metadata || {
          word_count: result.content?.split(' ').length || 0,
          source: rawContent.source,
          generated_at: Date.now()
        }
      };
  
    } catch (error) {
      console.error('AI generation error:', error);
      return {
        title: rawContent.title,
        content: `Error generating content from: ${rawContent.content.substring(0, 200)}...`,
        summary: 'Content generation failed - manual review required',
        confidence: 0.2,
        metadata: { error: error.message, source: rawContent.source }
      };
    }
  }