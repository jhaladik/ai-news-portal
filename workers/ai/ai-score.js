// workers/ai/ai-score.js - Advanced content scoring and analysis
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
        const url = new URL(request.url);
        const batchMode = url.searchParams.get('batch') === 'true';
        const threshold = parseFloat(url.searchParams.get('threshold')) || 0.5;
  
        if (batchMode) {
          // Batch scoring for unscored content
          const unscored = await env.DB.prepare(`
            SELECT id, title, content, category, neighborhood_id, ai_confidence
            FROM content 
            WHERE status = 'ai_generated' OR (ai_confidence IS NULL OR ai_confidence = 0)
            ORDER BY created_at DESC 
            LIMIT 10
          `).all();
  
          const results = [];
          for (const item of unscored.results) {
            const score = await calculateContentScore(item, env);
            
            await env.DB.prepare(`
              UPDATE content 
              SET ai_confidence = ?, status = ?
              WHERE id = ?
            `).bind(
              score.confidence,
              score.confidence >= threshold ? 'review' : 'needs_improvement',
              item.id
            ).run();
  
            results.push({
              id: item.id,
              title: item.title.substring(0, 50) + '...',
              old_confidence: item.ai_confidence,
              new_confidence: score.confidence,
              status: score.confidence >= threshold ? 'review' : 'needs_improvement'
            });
          }
  
          return Response.json({
            success: true,
            batch_processed: results.length,
            threshold_used: threshold,
            results
          }, { headers: corsHeaders });
  
        } else {
          // Single content scoring
          const { content_id } = await request.json();
          
          if (!content_id) {
            return Response.json({
              error: 'Missing content_id'
            }, { status: 400, headers: corsHeaders });
          }
  
          const content = await env.DB.prepare(
            'SELECT * FROM content WHERE id = ?'
          ).bind(content_id).first();
  
          if (!content) {
            return Response.json({ error: 'Content not found' }, { status: 404, headers: corsHeaders });
          }
  
          const score = await calculateContentScore(content, env);
  
          // Update database
          await env.DB.prepare(`
            UPDATE content 
            SET ai_confidence = ?
            WHERE id = ?
          `).bind(score.confidence, content_id).run();
  
          return Response.json({
            success: true,
            content_id,
            ...score
          }, { headers: corsHeaders });
        }
  
      } catch (error) {
        return Response.json({
          error: 'Content scoring failed',
          details: error.message
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Helper function for content scoring
  async function calculateContentScore(content, env) {
    const text = content.content;
    const title = content.title;
    const category = content.category;
    
    // Readability scoring
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    
    const readabilityScore = avgWordsPerSentence <= 20 ? 0.9 : 
                            avgWordsPerSentence <= 30 ? 0.7 : 0.5;
  
    // Local relevance scoring
    const localTerms = [
      'vinohrady', 'náměstí míru', 'jiřího z poděbrad', 'flora', 'strašnická',
      'korunní', 'blanická', 'vinohradská', 'americká', 'riegrovy sady'
    ];
    
    const localMentions = localTerms.filter(term => 
      text.toLowerCase().includes(term)
    ).length;
    
    const localRelevanceScore = Math.min(localMentions * 0.15, 0.8);
  
    // Content freshness (time-sensitive content scores higher)
    const freshnessBonuses = {
      'transport': /dnes|zítra|aktuálně|momentálně/.test(text.toLowerCase()) ? 0.1 : 0,
      'weather': /dnes|zítra|tento týden/.test(text.toLowerCase()) ? 0.1 : 0,
      'events': /dnes|zítra|tento víkend|příští/.test(text.toLowerCase()) ? 0.1 : 0,
      'emergency': /nyní|aktuálně|pozor|upozornění/.test(text.toLowerCase()) ? 0.15 : 0
    };
    
    const freshnessScore = freshnessBonuses[category] || 0;
  
    // Information density
    const infoMarkers = [
      /\d{1,2}:\d{2}/, // Times
      /\d{1,2}\.\d{1,2}/, // Dates
      /\d+ (minut|hodin|dní)/, // Durations
      /(od|do|mezi) \d/, // Ranges
      /telefon|email|web|adresa/ // Contact info
    ];
    
    const infoCount = infoMarkers.filter(marker => marker.test(text)).length;
    const infoScore = Math.min(infoCount * 0.05, 0.2);
  
    // Title-content alignment
    const titleWords = title.toLowerCase().split(/\s+/);
    const contentLower = text.toLowerCase();
    const titleAlignment = titleWords.filter(word => 
      word.length > 3 && contentLower.includes(word)
    ).length / titleWords.length;
  
    // Final confidence calculation
    let confidence = (
      readabilityScore * 0.25 +
      localRelevanceScore * 0.3 +
      titleAlignment * 0.2 +
      infoScore * 0.15 +
      freshnessScore * 0.1
    );
  
    // Quality bonus for well-structured content
    if (sentences.length >= 3 && sentences.length <= 8) {
      confidence += 0.05;
    }
  
    // Czech language bonus
    if (/[čšřžýáíéůúťďňě]/.test(text)) {
      confidence += 0.05;
    }
  
    confidence = Math.min(confidence, 0.95);
  
    return {
      confidence: Math.round(confidence * 100) / 100,
      breakdown: {
        readability: Math.round(readabilityScore * 100) / 100,
        local_relevance: Math.round(localRelevanceScore * 100) / 100,
        title_alignment: Math.round(titleAlignment * 100) / 100,
        information_density: Math.round(infoScore * 100) / 100,
        freshness: Math.round(freshnessScore * 100) / 100
      },
      metrics: {
        word_count: words.length,
        sentence_count: sentences.length,
        avg_sentence_length: Math.round(avgWordsPerSentence),
        local_mentions: localMentions,
        info_markers: infoCount
      }
    };
  }