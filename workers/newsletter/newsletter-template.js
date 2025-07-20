// workers/newsletter/newsletter-template.js - Email template management micro-worker
export default {
    async fetch(request, env) {
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      };
  
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
      }
  
      try {
        if (request.method === 'GET') {
          const url = new URL(request.url);
          const action = url.searchParams.get('action');
          const neighborhood_id = url.searchParams.get('neighborhood_id');
          const template = url.searchParams.get('template');
  
          if (action === 'generate') {
            // Generate newsletter from published content
            return await generateNewsletterFromContent(env, neighborhood_id);
          }
  
          if (template) {
            // Get specific template
            return Response.json({
              template: getEmailTemplate(template)
            }, { headers: corsHeaders });
          }
  
          // List available templates
          return Response.json({
            templates: [
              {
                id: 'daily_digest',
                name: 'Daily Digest',
                description: 'Daily summary of local news',
                preview_image: '/templates/daily_digest_preview.png'
              },
              {
                id: 'emergency_alert',
                name: 'Emergency Alert',
                description: 'Urgent neighborhood alerts',
                preview_image: '/templates/emergency_alert_preview.png'
              },
              {
                id: 'weekly_summary',
                name: 'Weekly Summary',
                description: 'Weekly neighborhood roundup',
                preview_image: '/templates/weekly_summary_preview.png'
              },
              {
                id: 'business_spotlight',
                name: 'Business Spotlight',
                description: 'Local business highlights',
                preview_image: '/templates/business_spotlight_preview.png'
              }
            ]
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'POST') {
          // Create newsletter from template
          const { template_id, neighborhood_id, subject, content_items } = await request.json();
  
          if (!template_id || !neighborhood_id) {
            return Response.json({ error: 'Template ID and neighborhood required' }, { status: 400, headers: corsHeaders });
          }
  
          // Get content for newsletter
          const contentQuery = content_items && content_items.length > 0
            ? 'SELECT * FROM content WHERE id IN (' + content_items.map(() => '?').join(',') + ')'
            : `SELECT * FROM content 
               WHERE neighborhood_id = ? AND status = 'published' 
               ORDER BY created_at DESC 
               LIMIT 10`;
  
          const params = content_items && content_items.length > 0 
            ? content_items 
            : [neighborhood_id];
  
          const content = await env.DB.prepare(contentQuery).bind(...params).all();
  
          // Get neighborhood info
          const neighborhood = await env.DB.prepare(
            'SELECT * FROM neighborhoods WHERE id = ?'
          ).bind(neighborhood_id).first();
  
          if (!neighborhood) {
            return Response.json({ error: 'Neighborhood not found' }, { status: 404, headers: corsHeaders });
          }
  
          // Generate newsletter content
          const template = getEmailTemplate(template_id);
          const newsletterContent = generateNewsletterContent(template, {
            neighborhood,
            content: content.results,
            subject: subject || `${neighborhood.name} News Update - ${new Date().toLocaleDateString()}`
          });
  
          // Create newsletter record
          const newsletterId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO newsletters (
              id, neighborhood_id, template_id, subject, content_html, content_text, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            newsletterId,
            neighborhood_id,
            template_id,
            newsletterContent.subject,
            newsletterContent.html,
            newsletterContent.text,
            'draft',
            Date.now()
          ).run();
  
          return Response.json({
            success: true,
            newsletter: {
              id: newsletterId,
              subject: newsletterContent.subject,
              html_preview: newsletterContent.html.substring(0, 500) + '...',
              text_preview: newsletterContent.text.substring(0, 300) + '...',
              content_count: content.results.length
            }
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Template processing failed', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Get newsletter content from recent published articles
  async function generateNewsletterFromContent(env, neighborhood_id) {
    const content = await env.DB.prepare(`
      SELECT 
        c.*,
        n.name as neighborhood_name
      FROM content c
      LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
      WHERE c.status = 'published' 
      ${neighborhood_id ? 'AND c.neighborhood_id = ?' : ''}
      ORDER BY c.created_at DESC
      LIMIT 15
    `).bind(...(neighborhood_id ? [neighborhood_id] : [])).all();
  
    if (content.results.length === 0) {
      return Response.json({ 
        error: 'No published content found for newsletter generation' 
      }, { status: 404 });
    }
  
    // Group content by category
    const contentByCategory = content.results.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  
    const subject = neighborhood_id 
      ? `${content.results[0].neighborhood_name} News Update - ${new Date().toLocaleDateString()}`
      : `Prague News Update - ${new Date().toLocaleDateString()}`;
  
    return Response.json({
      generated_content: {
        subject,
        content_by_category: contentByCategory,
        total_articles: content.results.length,
        neighborhood_name: content.results[0]?.neighborhood_name || 'Prague'
      }
    });
  }
  
  // Email template definitions
  function getEmailTemplate(templateId) {
    const templates = {
      daily_digest: {
        name: 'Daily Digest',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
              .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { padding: 20px; }
              .article { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .article h3 { color: #2563eb; margin-top: 0; }
              .category { background: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
              .unsubscribe { color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🏙️ {{neighborhood_name}} Daily News</h1>
                <p>{{formatted_date}}</p>
              </div>
              <div class="content">
                {{content_sections}}
              </div>
              <div class="footer">
                <p>Stay informed about your neighborhood!</p>
                <p class="unsubscribe">
                  <a href="{{unsubscribe_url}}">Unsubscribe</a> | 
                  <a href="https://ai-news-prague.com">Visit Website</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
  {{neighborhood_name}} Daily News - {{formatted_date}}
  
  {{content_text}}
  
  ---
  Stay informed about your neighborhood!
  Unsubscribe: {{unsubscribe_url}}
  Visit our website: https://ai-news-prague.com
        `
      },
      emergency_alert: {
        name: 'Emergency Alert',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #fef2f2; }
              .container { max-width: 600px; margin: 0 auto; background: white; border: 2px solid #dc2626; border-radius: 10px; }
              .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 20px; }
              .alert-icon { font-size: 48px; margin-bottom: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="alert-icon">🚨</div>
                <h1>Emergency Alert</h1>
                <p>{{neighborhood_name}} - {{formatted_date}}</p>
              </div>
              <div class="content">
                {{content_sections}}
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
  🚨 EMERGENCY ALERT - {{neighborhood_name}}
  {{formatted_date}}
  
  {{content_text}}
        `
      },
      weekly_summary: {
        name: 'Weekly Summary',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>{{subject}}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f0f9ff; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; }
              .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center; }
              .content { padding: 30px; }
              .week-stats { background: #f8fafc; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
              .stat-item { display: inline-block; margin: 0 15px; text-align: center; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📊 {{neighborhood_name}} Weekly Summary</h1>
                <p>{{week_range}}</p>
              </div>
              <div class="content">
                <div class="week-stats">
                  <h3>This Week's Highlights</h3>
                  {{stats_content}}
                </div>
                {{content_sections}}
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
  📊 {{neighborhood_name}} Weekly Summary
  {{week_range}}
  
  This Week's Highlights:
  {{stats_text}}
  
  {{content_text}}
        `
      }
    };
  
    return templates[templateId] || templates.daily_digest;
  }
  
  // Generate newsletter content from template
  function generateNewsletterContent(template, data) {
    const { neighborhood, content, subject } = data;
    
    // Group content by category
    const contentByCategory = content.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {});
  
    // Generate content sections
    const htmlSections = Object.entries(contentByCategory).map(([category, articles]) => {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      const articleHtml = articles.map(article => `
        <div class="article">
          <h3>${article.title}</h3>
          <span class="category">${categoryTitle}</span>
          <p>${article.content.substring(0, 200)}...</p>
          ${article.ai_confidence ? `<small>AI Confidence: ${Math.round(article.ai_confidence * 100)}%</small>` : ''}
        </div>
      `).join('');
      
      return `<h2>${categoryTitle} News</h2>${articleHtml}`;
    }).join('');
  
    const textSections = Object.entries(contentByCategory).map(([category, articles]) => {
      const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
      const articleText = articles.map(article => `
  • ${article.title}
    ${article.content.substring(0, 150)}...
      `).join('');
      
      return `${categoryTitle.toUpperCase()}\n${articleText}`;
    }).join('\n\n');
  
    // Replace template variables
    const html = template.html
      .replace(/{{subject}}/g, subject)
      .replace(/{{neighborhood_name}}/g, neighborhood.name)
      .replace(/{{formatted_date}}/g, new Date().toLocaleDateString())
      .replace(/{{content_sections}}/g, htmlSections)
      .replace(/{{unsubscribe_url}}/g, '{{unsubscribe_url}}'); // Keep placeholder for personalization
  
    const text = template.text
      .replace(/{{subject}}/g, subject)
      .replace(/{{neighborhood_name}}/g, neighborhood.name)
      .replace(/{{formatted_date}}/g, new Date().toLocaleDateString())
      .replace(/{{content_text}}/g, textSections)
      .replace(/{{unsubscribe_url}}/g, '{{unsubscribe_url}}'); // Keep placeholder for personalization
  
    return {
      subject,
      html,
      text
    };
  }