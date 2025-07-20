// workers/newsletter/newsletter-send.js - Email delivery micro-worker
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
        // Extract JWT token for admin operations
        const authHeader = request.headers.get('Authorization');
        let isAdmin = false;
        
        if (authHeader?.startsWith('Bearer ')) {
          try {
            const token = authHeader.substring(7);
            const payload = JSON.parse(atob(token.split('.')[1]));
            isAdmin = payload.role === 'admin';
          } catch (e) {
            // Invalid token, continue as non-admin
          }
        }
  
        if (request.method === 'POST') {
          // Send newsletter
          const { newsletter_id, neighborhood_id, test_email, preview_only } = await request.json();
  
          if (!newsletter_id) {
            return Response.json({ error: 'Newsletter ID required' }, { status: 400, headers: corsHeaders });
          }
  
          // Get newsletter content
          const newsletter = await env.DB.prepare(`
            SELECT * FROM newsletters WHERE id = ? AND status = 'draft'
          `).bind(newsletter_id).first();
  
          if (!newsletter) {
            return Response.json({ error: 'Newsletter not found or already sent' }, { status: 404, headers: corsHeaders });
          }
  
          // If preview only, return newsletter content
          if (preview_only) {
            return Response.json({
              preview: {
                subject: newsletter.subject,
                html_content: newsletter.content_html,
                text_content: newsletter.content_text,
                neighborhood_id: newsletter.neighborhood_id
              }
            }, { headers: corsHeaders });
          }
  
          // If test email, send to specific address
          if (test_email && isAdmin) {
            await sendEmail(env, {
              to: test_email,
              subject: `[TEST] ${newsletter.subject}`,
              html: newsletter.content_html,
              text: newsletter.content_text
            });
  
            return Response.json({
              success: true,
              message: 'Test email sent',
              test_email
            }, { headers: corsHeaders });
          }
  
          if (!isAdmin) {
            return Response.json({ error: 'Admin access required' }, { status: 403, headers: corsHeaders });
          }
  
          // Get subscribers for the newsletter
          let subscribersQuery = `
            SELECT u.id, u.email, u.name, u.neighborhood_id 
            FROM users u 
            WHERE u.role = 'subscriber' AND u.verified = 1
          `;
          let params = [];
  
          if (newsletter.neighborhood_id) {
            subscribersQuery += ' AND u.neighborhood_id = ?';
            params.push(newsletter.neighborhood_id);
          } else if (neighborhood_id) {
            subscribersQuery += ' AND u.neighborhood_id = ?';
            params.push(neighborhood_id);
          }
  
          const subscribers = await env.DB.prepare(subscribersQuery).bind(...params).all();
  
          if (subscribers.results.length === 0) {
            return Response.json({ error: 'No subscribers found' }, { status: 400, headers: corsHeaders });
          }
  
          // Send emails in batches to avoid rate limits
          const batchSize = 50;
          let sentCount = 0;
          let failedCount = 0;
          const failedEmails = [];
  
          for (let i = 0; i < subscribers.results.length; i += batchSize) {
            const batch = subscribers.results.slice(i, i + batchSize);
            
            await Promise.all(batch.map(async (subscriber) => {
              try {
                // Personalize email content
                const personalizedHtml = newsletter.content_html
                  .replace(/{{user_name}}/g, subscriber.name || 'Neighbor')
                  .replace(/{{unsubscribe_url}}/g, `https://ai-news-frontend.pages.dev/unsubscribe?token=${generateUnsubscribeToken(subscriber.id)}`);
  
                const personalizedText = newsletter.content_text
                  .replace(/{{user_name}}/g, subscriber.name || 'Neighbor')
                  .replace(/{{unsubscribe_url}}/g, `https://ai-news-frontend.pages.dev/unsubscribe?token=${generateUnsubscribeToken(subscriber.id)}`);
  
                await sendEmail(env, {
                  to: subscriber.email,
                  subject: newsletter.subject,
                  html: personalizedHtml,
                  text: personalizedText
                });
  
                // Record successful send
                await env.DB.prepare(`
                  INSERT INTO newsletter_sends (newsletter_id, user_id, sent_at)
                  VALUES (?, ?, ?)
                  ON CONFLICT(newsletter_id, user_id) DO UPDATE SET sent_at = excluded.sent_at
                `).bind(newsletter_id, subscriber.id, Date.now()).run();
  
                sentCount++;
              } catch (error) {
                console.error(`Failed to send to ${subscriber.email}:`, error);
                failedEmails.push(subscriber.email);
                failedCount++;
              }
            }));
  
            // Add delay between batches to respect rate limits
            if (i + batchSize < subscribers.results.length) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
  
          // Update newsletter status
          await env.DB.prepare(`
            UPDATE newsletters 
            SET status = 'sent', sent_at = ?, sent_count = ?
            WHERE id = ?
          `).bind(Date.now(), sentCount, newsletter_id).run();
  
          return Response.json({
            success: true,
            message: 'Newsletter sent successfully',
            statistics: {
              total_subscribers: subscribers.results.length,
              sent_count: sentCount,
              failed_count: failedCount,
              failed_emails: failedEmails.slice(0, 10) // Limit failed emails in response
            }
          }, { headers: corsHeaders });
        }
  
        if (request.method === 'GET') {
          // Get sending status/history
          if (!isAdmin) {
            return Response.json({ error: 'Admin access required' }, { status: 403, headers: corsHeaders });
          }
  
          const recentSends = await env.DB.prepare(`
            SELECT 
              n.id,
              n.subject,
              n.sent_at,
              n.sent_count,
              COUNT(ns.user_id) as delivery_count,
              COUNT(ns.opened_at) as open_count
            FROM newsletters n
            LEFT JOIN newsletter_sends ns ON n.id = ns.newsletter_id
            WHERE n.status = 'sent'
            GROUP BY n.id, n.subject, n.sent_at, n.sent_count
            ORDER BY n.sent_at DESC
            LIMIT 20
          `).all();
  
          return Response.json({
            recent_sends: recentSends.results.map(send => ({
              id: send.id,
              subject: send.subject,
              sent_at: send.sent_at,
              sent_count: send.sent_count,
              delivery_count: send.delivery_count,
              open_count: send.open_count,
              open_rate: send.delivery_count > 0 ? Math.round((send.open_count / send.delivery_count) * 100) : 0
            }))
          }, { headers: corsHeaders });
        }
  
        return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
  
      } catch (error) {
        return Response.json({ 
          error: 'Newsletter sending failed', 
          details: error.message 
        }, { status: 500, headers: corsHeaders });
      }
    }
  };
  
  // Email sending function using Cloudflare Workers Email API
  async function sendEmail(env, { to, subject, html, text }) {
    // Note: This uses Cloudflare's Email Workers API
    // You'll need to configure this in your wrangler.toml
    
    const emailData = {
      personalizations: [{
        to: [{ email: to }],
      }],
      from: { 
        email: env.FROM_EMAIL || 'news@ai-news-prague.com',
        name: 'AI News Prague'
      },
      subject: subject,
      content: [
        {
          type: 'text/plain',
          value: text
        },
        {
          type: 'text/html',
          value: html
        }
      ]
    };
  
    // Using SendGrid API as backup (configure API key in environment)
    if (env.SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
  
      if (!response.ok) {
        throw new Error(`SendGrid API error: ${response.status}`);
      }
    } else {
      // Fallback: log email content (for development)
      console.log(`Email to ${to}: ${subject}`);
      console.log(`HTML: ${html.substring(0, 100)}...`);
    }
  }
  
  // Generate unsubscribe token
  function generateUnsubscribeToken(userId) {
    // Simple base64 encoding (in production, use proper JWT or signed tokens)
    return btoa(`unsubscribe:${userId}:${Date.now()}`);
  }