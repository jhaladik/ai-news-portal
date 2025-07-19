// workers/ai/ai-validate.js - Content quality validation
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
        const { content_id, content_text, title_text, category, neighborhood } = await request.json();
  
        if (!content_id) {
          return Response.json({
            error: 'Missing required field: content_id'
          }, { status: 400, headers: corsHeaders });
        }
  
        let content, title;
        
        // If content not provided, fetch from database
        if (!content_text) {
          const dbContent = await env.DB.prepare(
            'SELECT * FROM content WHERE id = ?'
          ).bind(content_id).first();
          
          if (!dbContent) {
            return Response.json({ error: 'Content not found' }, { status: 404, headers: corsHeaders });
          }
          
          content = dbContent.content;
          title = dbContent.title;
        } else {
          content = content_text;
          title = title_text;
        }
  
        // Basic validation checks
        const validationChecks = {
          length_ok: content.length >= 100 && content.length <= 1000,
          has_czech: /[čšřžýáíéůúťďňě]/i.test(content),
          mentions_prague: /Praha|prague/i.test(content),
          mentions_neighborhood: neighborhood ? new RegExp(neighborhood, 'i').test(content) : true,
          no_english: !/\b(the|and|or|but|with|from|have|this|that|they|will|would|could|should)\b/i.test(content),
          proper_structure: content.includes('.') && content.split('.').length >= 3,
          title_appropriate: title && title.length >= 10 && title.length <= 80
        };
  
        // Calculate confidence score
        const passedChecks = Object.values(validationChecks).filter(Boolean).length;
        const totalChecks = Object.keys(validationChecks).length;
        let confidence = (passedChecks / totalChecks) * 0.9; // Max 0.9 from basic checks
  
        // Category-specific bonuses
        if (category === 'transport' && /tramvaj|metro|autobus|MHD|doprava/i.test(content)) {
          confidence += 0.05;
        } else if (category === 'local' && /místní|čtvrť|obyvatel|komunita/i.test(content)) {
          confidence += 0.05;
        } else if (category === 'weather' && /počasí|teplota|déšť|sníh|slunce/i.test(content)) {
          confidence += 0.05;
        }
  
        // Quality indicators
        const qualityIndicators = {
          specific_locations: /náměstí|ulice|park|stanice|zastávka/i.test(content),
          time_relevance: /dnes|zítra|tento týden|aktuálně/i.test(content),
          actionable_info: /doporučuje|můžete|sledujte|pozor/i.test(content),
          contact_info: /telefon|email|web/i.test(content)
        };
  
        const qualityScore = Object.values(qualityIndicators).filter(Boolean).length * 0.02;
        confidence = Math.min(confidence + qualityScore, 0.95);
  
        // Determine status based on confidence
        let newStatus = 'review';
        if (confidence >= 0.85) {
          newStatus = 'approved';
        } else if (confidence < 0.4) {
          newStatus = 'rejected';
        }
  
        // Update content in database
        await env.DB.prepare(`
          UPDATE content 
          SET ai_confidence = ?, status = ?
          WHERE id = ?
        `).bind(confidence, newStatus, content_id).run();
  
        return Response.json({
          success: true,
          content_id,
          confidence: Math.round(confidence * 100) / 100,
          status: newStatus,
          validation_details: {
            basic_checks: validationChecks,
            quality_indicators: qualityIndicators,
            passed_checks: passedChecks,
            total_checks: totalChecks
          },
          recommendations: confidence < 0.6 ? [
            'Content might be too short or too long',
            'Consider adding more local context',
            'Ensure Czech language quality',
            'Add specific location references'
          ] : []
        }, { headers: corsHeaders });
  
      } catch (error) {
        return Response.json({
          error: 'Content validation failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };