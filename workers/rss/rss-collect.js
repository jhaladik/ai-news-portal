// workers/rss/rss-collect.js - Multi-source RSS aggregator
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
  
      const RSS_SOURCES = {
        'praha4': 'https://www.praha4.cz/rss',
        'praha2': 'https://www.praha2.cz/rss', 
        'dpp': 'https://www.dpp.cz/rss',
        'weather': 'https://api.openweathermap.org/data/2.5/weather?q=Prague&appid=demo&mode=xml'
      };
  
      const collected = [];
      let results = { success: 0, failed: 0 };
  
      for (const [source, url] of Object.entries(RSS_SOURCES)) {
        try {
          const response = await fetch(url, { 
            headers: { 'User-Agent': 'AI-News-Bot/1.0' },
            timeout: 10000 
          });
          
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const rssText = await response.text();
          const items = parseRSS(rssText, source);
          
          for (const item of items) {
            const id = crypto.randomUUID();
            await env.DB.prepare(`
              INSERT OR IGNORE INTO raw_content 
              (id, source, title, content, url, published_date, collected_at, raw_score, category)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              id, source, item.title, item.content, item.url || '',
              item.pubDate || Date.now(), Date.now(), null, null
            ).run();
            
            collected.push({ id, source, title: item.title });
          }
          results.success++;
        } catch (error) {
          console.error(`Failed to collect ${source}:`, error);
          results.failed++;
        }
      }
  
      return Response.json({
        message: 'RSS collection completed',
        collected: collected.length,
        sources: results,
        items: collected
      }, { headers: corsHeaders });
    }
  };
  
  function parseRSS(xmlText, source) {
    const items = [];
    try {
      // Basic XML parsing for RSS items
      const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
      
      for (const itemXml of itemMatches.slice(0, 10)) { // Limit to 10 items per source
        const title = extractTag(itemXml, 'title');
        const description = extractTag(itemXml, 'description');
        const link = extractTag(itemXml, 'link');
        const pubDate = extractTag(itemXml, 'pubDate');
        
        if (title && description) {
          items.push({
            title: cleanText(title),
            content: cleanText(description),
            url: link,
            pubDate: pubDate ? new Date(pubDate).getTime() : Date.now()
          });
        }
      }
    } catch (error) {
      console.error(`RSS parsing error for ${source}:`, error);
    }
    
    return items;
  }
  
  function extractTag(xml, tagName) {
    const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
  }
  
  function cleanText(text) {
    return text
      .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }