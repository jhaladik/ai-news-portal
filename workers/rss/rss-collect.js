// workers/rss/rss-collect.js - Complete RSS collection worker with raw content viewing
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
        const includeRaw = url.searchParams.get('include_raw') === 'true';
        const sourceFilter = url.searchParams.get('sources')?.split(',');
        const limit = parseInt(url.searchParams.get('limit')) || 50;
  
        // If requesting raw data view, return from database
        if (includeRaw) {
          const rawItems = await env.DB.prepare(`
            SELECT * FROM raw_content 
            ORDER BY collected_at DESC 
            LIMIT ?
          `).bind(limit).all();
  
          const qualifiedCount = rawItems.results.filter(item => 
            item.raw_score && item.raw_score >= 0.6
          ).length;
  
          return Response.json({
            items: rawItems.results,
            total: rawItems.results.length,
            qualified: qualifiedCount,
            qualification_rate: rawItems.results.length > 0 ? qualifiedCount / rawItems.results.length : 0,
            view: 'all_raw_content'
          }, { headers: corsHeaders });
        }
  
        // RSS Collection Mode
        const RSS_SOURCES = {
          'praha4': {
            url: 'https://www.praha4.cz/rss',
            name: 'Praha 4 Official',
            category_hint: 'local_government'
          },
          'praha2': {
            url: 'https://www.praha2.cz/rss', 
            name: 'Praha 2 Official',
            category_hint: 'local_government'
          },
          'dpp': {
            url: 'https://www.dpp.cz/rss',
            name: 'Prague Public Transport', 
            category_hint: 'transport'
          },
          'weather': {
            url: 'https://api.openweathermap.org/data/2.5/weather?q=Prague&appid=demo&mode=xml',
            name: 'Prague Weather',
            category_hint: 'weather'
          }
        };
  
        const collectionResults = {
          started_at: Date.now(),
          collected: 0,
          sources: [],
          errors: []
        };
  
        // Filter sources if specified
        const sourcesToCollect = sourceFilter 
          ? Object.entries(RSS_SOURCES).filter(([id]) => sourceFilter.includes(id))
          : Object.entries(RSS_SOURCES);
  
        for (const [sourceId, sourceConfig] of sourcesToCollect) {
          const sourceResult = {
            source: sourceId,
            name: sourceConfig.name,
            collected: 0,
            errors: [],
            items: []
          };
  
          try {
            console.log(`Collecting from ${sourceId}: ${sourceConfig.url}`);
            
            const response = await fetch(sourceConfig.url, {
              headers: {
                'User-Agent': 'AI-News-Portal/1.0 RSS Collector',
                'Accept': 'application/rss+xml, application/xml, text/xml'
              },
              timeout: 10000
            });
  
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
  
            const rssText = await response.text();
            const items = parseRSSFeed(rssText, sourceId, sourceConfig);
            
            // Store each item in database
            for (const item of items) {
              try {
                const itemId = crypto.randomUUID();
                
                await env.DB.prepare(`
                  INSERT OR IGNORE INTO raw_content 
                  (id, source, title, content, url, published_date, collected_at, metadata)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `).bind(
                  itemId,
                  sourceId,
                  item.title || 'Untitled',
                  item.content || item.description || '',
                  item.link || sourceConfig.url,
                  item.pubDate ? new Date(item.pubDate).getTime() : Date.now(),
                  Date.now(),
                  JSON.stringify({
                    category_hint: sourceConfig.category_hint,
                    original_guid: item.guid,
                    author: item.author
                  })
                ).run();
  
                sourceResult.items.push({
                  id: itemId,
                  title: item.title,
                  content: (item.content || item.description || '').substring(0, 200) + '...',
                  category: sourceConfig.category_hint
                });
  
                sourceResult.collected++;
                collectionResults.collected++;
  
              } catch (dbError) {
                console.error(`DB error for ${sourceId}:`, dbError);
                sourceResult.errors.push(`Database error: ${dbError.message}`);
              }
            }
  
            console.log(`✅ ${sourceId}: ${sourceResult.collected} items collected`);
  
          } catch (error) {
            console.error(`❌ ${sourceId} collection failed:`, error);
            sourceResult.errors.push(error.message);
            collectionResults.errors.push(`${sourceId}: ${error.message}`);
          }
  
          collectionResults.sources.push(sourceResult);
        }
  
        // Update source statistics
        for (const [sourceId, sourceConfig] of sourcesToCollect) {
          const sourceStats = collectionResults.sources.find(s => s.source === sourceId);
          if (sourceStats) {
            await env.AI_NEWS_KV.put(
              `rss-source-${sourceId}`,
              JSON.stringify({
                name: sourceConfig.name,
                url: sourceConfig.url,
                last_fetched: Date.now(),
                fetch_count: (await getRSSSourceStats(sourceId, env)).fetch_count + 1,
                error_count: (await getRSSSourceStats(sourceId, env)).error_count + sourceStats.errors.length,
                last_collected: sourceStats.collected
              }),
              { expirationTtl: 7 * 24 * 3600 } // 7 days
            );
          }
        }
  
        collectionResults.completed_at = Date.now();
        collectionResults.duration_ms = collectionResults.completed_at - collectionResults.started_at;
  
        // Store pipeline run result
        await env.AI_NEWS_KV.put(
          `rss-collection-${Date.now()}`,
          JSON.stringify(collectionResults),
          { expirationTtl: 24 * 3600 } // 24 hours
        );
  
        return Response.json({
          success: true,
          ...collectionResults,
          sources_processed: sourcesToCollect.length,
          by_source: collectionResults.sources.reduce((acc, s) => {
            acc[s.source] = {
              collected: s.collected,
              errors: s.errors.length
            };
            return acc;
          }, {})
        }, { headers: corsHeaders });
  
      } catch (error) {
        console.error('RSS collection failed:', error);
        
        return Response.json({
          success: false,
          error: 'RSS collection failed',
          details: error.message,
          timestamp: Date.now()
        }, { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }
  };
  
  // RSS Feed Parser
  function parseRSSFeed(xmlText, sourceId, sourceConfig) {
    const items = [];
    
    try {
      // Basic RSS/XML parsing - extract items/entries
      const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || 
                         xmlText.match(/<entry[^>]*>[\s\S]*?<\/entry>/gi) || [];
  
      for (const itemXml of itemMatches.slice(0, 10)) { // Limit to 10 items per source
        const item = {};
  
        // Extract title
        const titleMatch = itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        item.title = titleMatch ? cleanXMLContent(titleMatch[1]) : 'No title';
  
        // Extract description/content
        const descMatch = itemXml.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
                         itemXml.match(/<content[^>]*>([\s\S]*?)<\/content>/i) ||
                         itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
        item.description = descMatch ? cleanXMLContent(descMatch[1]) : '';
  
        // Extract link
        const linkMatch = itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                         itemXml.match(/<link[^>]*href="([^"]*)"[^>]*>/i);
        item.link = linkMatch ? cleanXMLContent(linkMatch[1]) : '';
  
        // Extract publication date
        const pubDateMatch = itemXml.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
                            itemXml.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
                            itemXml.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i);
        item.pubDate = pubDateMatch ? cleanXMLContent(pubDateMatch[1]) : null;
  
        // Extract GUID/ID
        const guidMatch = itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) ||
                         itemXml.match(/<id[^>]*>([\s\S]*?)<\/id>/i);
        item.guid = guidMatch ? cleanXMLContent(guidMatch[1]) : null;
  
        // Only add items with meaningful content
        if (item.title && item.title.length > 10 && item.description && item.description.length > 20) {
          items.push(item);
        }
      }
  
    } catch (parseError) {
      console.error(`RSS parsing error for ${sourceId}:`, parseError);
    }
  
    return items;
  }
  
  // Clean XML content
  function cleanXMLContent(content) {
    return content
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') // Remove CDATA
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') // Decode entities
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .trim();
  }
  
  // Get RSS source statistics
  async function getRSSSourceStats(sourceId, env) {
    try {
      const stats = await env.AI_NEWS_KV.get(`rss-source-${sourceId}`);
      return stats ? JSON.parse(stats) : { fetch_count: 0, error_count: 0 };
    } catch {
      return { fetch_count: 0, error_count: 0 };
    }
  }