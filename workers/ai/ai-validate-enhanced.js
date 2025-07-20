// workers/ai/ai-validate-enhanced.js - Enhanced content validation
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
        const { content_id, content_text, category, bypass = false } = await request.json();
  
        if (!content_text) {
          return Response.json({ error: 'Content text required' }, { status: 400, headers: corsHeaders });
        }
  
        const validation = await validateContent(content_text, category, env);
        
        // Update content record with validation results
        if (content_id) {
          await env.DB.prepare(`
            UPDATE content 
            SET ai_confidence = ?, validation_notes = ?, validated_at = ?
            WHERE id = ?
          `).bind(validation.confidence, validation.notes, Date.now(), content_id).run();
        }
  
        const shouldAutoApprove = validation.confidence >= 0.85 && 
                                 validation.checks.accuracy && 
                                 validation.checks.safety &&
                                 !validation.flags.length;
  
        return Response.json({
          validation_id: crypto.randomUUID(),
          confidence: validation.confidence,
          approved: shouldAutoApprove || bypass,
          checks: validation.checks,
          flags: validation.flags,
          notes: validation.notes,
          auto_approved: shouldAutoApprove
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Validation failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  async function validateContent(content, category, env) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 300,
          messages: [{
            role: "user",
            content: `Validate this Prague news content for publication:
  
  Content: ${content}
  Category: ${category}
  
  Check for:
  1. Factual accuracy (verifiable claims)
  2. Local relevance to Prague neighborhoods
  3. Safety (no harmful/misleading info)
  4. Grammar and readability
  5. Appropriate tone for local news
  
  Flag any issues:
  - Unverified claims
  - Inappropriate content
  - Poor quality writing
  - Misleading information
  
  Rate confidence 0.0-1.0 for auto-publication.
  
  Respond ONLY with valid JSON:
  {
    "confidence": 0.87,
    "checks": {
      "accuracy": true,
      "relevance": true,
      "safety": true,
      "quality": true
    },
    "flags": [],
    "notes": "Brief assessment"
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
        confidence: Math.min(Math.max(result.confidence || 0, 0), 1),
        checks: result.checks || {
          accuracy: false,
          relevance: false,
          safety: false,
          quality: false
        },
        flags: result.flags || [],
        notes: result.notes || 'No validation notes'
      };
  
    } catch (error) {
      console.error('Validation error:', error);
      return {
        confidence: 0.3,
        checks: { accuracy: false, relevance: false, safety: false, quality: false },
        flags: ['validation_error'],
        notes: 'Validation failed - requires manual review'
      };
    }
  }