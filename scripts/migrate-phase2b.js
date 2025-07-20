// scripts/migrate-phase2b.js - Phase 2b database migration script
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
        console.log('Starting Phase 2b database migration...');
  
        // Create raw_content table
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS raw_content (
            id TEXT PRIMARY KEY,
            source TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            url TEXT,
            published_date INTEGER,
            collected_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            processed_at INTEGER,
            raw_score REAL,
            category TEXT,
            metadata TEXT
          )
        `).run();
  
        // Create publications table
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS publications (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            neighborhood_id TEXT NOT NULL,
            category TEXT NOT NULL,
            published_at INTEGER NOT NULL,
            auto_published INTEGER DEFAULT 0,
            FOREIGN KEY (content_id) REFERENCES content(id),
            FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
          )
        `).run();
  
        // Add Phase 2b columns to content table
        const contentColumns = [
          'raw_content_id TEXT',
          'validation_notes TEXT',
          'validated_at INTEGER',
          'approved_at INTEGER',
          'rejected_at INTEGER',
          'rejection_reason TEXT',
          'admin_notes TEXT',
          'published_id TEXT'
        ];
  
        for (const column of contentColumns) {
          try {
            await env.DB.prepare(`ALTER TABLE content ADD COLUMN ${column}`).run();
          } catch (error) {
            // Column might already exist, continue
            console.log(`Column might already exist: ${column}`);
          }
        }
  
        // Create RSS sources table
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS rss_sources (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT NOT NULL,
            enabled INTEGER DEFAULT 1,
            category_hint TEXT,
            last_fetched INTEGER,
            fetch_count INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0
          )
        `).run();
  
        // Create pipeline runs table
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS pipeline_runs (
            id TEXT PRIMARY KEY,
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            status TEXT NOT NULL DEFAULT 'running',
            collected_items INTEGER DEFAULT 0,
            scored_items INTEGER DEFAULT 0,
            generated_items INTEGER DEFAULT 0,
            published_items INTEGER DEFAULT 0,
            error_message TEXT,
            metadata TEXT
          )
        `).run();
  
        // Create validation history table
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS validation_history (
            id TEXT PRIMARY KEY,
            content_id TEXT NOT NULL,
            validation_type TEXT NOT NULL,
            confidence_score REAL,
            validation_result TEXT NOT NULL,
            validation_notes TEXT,
            validated_by TEXT,
            validated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (content_id) REFERENCES content(id)
          )
        `).run();
  
        // Create indexes
        const indexes = [
          'CREATE INDEX IF NOT EXISTS idx_raw_content_score ON raw_content(raw_score DESC)',
          'CREATE INDEX IF NOT EXISTS idx_raw_content_category ON raw_content(category)',
          'CREATE INDEX IF NOT EXISTS idx_raw_content_collected ON raw_content(collected_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_content_raw_id ON content(raw_content_id)',
          'CREATE INDEX IF NOT EXISTS idx_content_confidence ON content(ai_confidence DESC)',
          'CREATE INDEX IF NOT EXISTS idx_content_status_created ON content(status, created_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_publications_neighborhood ON publications(neighborhood_id, published_at DESC)',
          'CREATE INDEX IF NOT EXISTS idx_publications_category ON publications(category, published_at DESC)'
        ];
  
        for (const indexSql of indexes) {
          await env.DB.prepare(indexSql).run();
        }
  
        // Insert default RSS sources
        const rssSources = [
          { id: 'praha4', name: 'Praha 4 Official', url: 'https://www.praha4.cz/rss', category_hint: 'local_government' },
          { id: 'praha2', name: 'Praha 2 Official', url: 'https://www.praha2.cz/rss', category_hint: 'local_government' },
          { id: 'dpp', name: 'Prague Public Transport', url: 'https://www.dpp.cz/rss', category_hint: 'transport' },
          { id: 'weather', name: 'Prague Weather', url: 'https://api.openweathermap.org/data/2.5/weather?q=Prague&appid=demo&mode=xml', category_hint: 'weather' }
        ];
  
        for (const source of rssSources) {
          await env.DB.prepare(`
            INSERT OR IGNORE INTO rss_sources (id, name, url, category_hint)
            VALUES (?, ?, ?, ?)
          `).bind(source.id, source.name, source.url, source.category_hint).run();
        }
  
        // Insert sample neighborhoods if they don't exist
        const neighborhoods = [
          { id: 'praha1', name: 'Praha 1 - Staré Město', slug: 'praha1', subscriber_count: 120 },
          { id: 'praha2', name: 'Praha 2 - Nové Město', slug: 'praha2', subscriber_count: 89 },
          { id: 'praha4', name: 'Praha 4 - Chodov, Michle', slug: 'praha4', subscriber_count: 156 },
          { id: 'praha5', name: 'Praha 5 - Smíchov', slug: 'praha5', subscriber_count: 94 },
          { id: 'vinohrady', name: 'Vinohrady', slug: 'vinohrady', subscriber_count: 78 },
          { id: 'karlin', name: 'Karlín', slug: 'karlin', subscriber_count: 45 }
        ];
  
        for (const neighborhood of neighborhoods) {
          await env.DB.prepare(`
            INSERT OR IGNORE INTO neighborhoods (id, name, slug, subscriber_count)
            VALUES (?, ?, ?, ?)
          `).bind(neighborhood.id, neighborhood.name, neighborhood.slug, neighborhood.subscriber_count).run();
        }
  
        // Create admin dashboard view
        await env.DB.prepare(`
          CREATE VIEW IF NOT EXISTS admin_dashboard_stats AS
          SELECT 
            'content_stats' as metric_type,
            status,
            category,
            COUNT(*) as count,
            AVG(ai_confidence) as avg_confidence
          FROM content 
          WHERE created_at > (strftime('%s', 'now') - 7*24*3600)
          GROUP BY status, category
  
          UNION ALL
  
          SELECT 
            'pipeline_stats' as metric_type,
            status as status,
            NULL as category,
            COUNT(*) as count,
            AVG(scored_items) as avg_confidence
          FROM pipeline_runs 
          WHERE started_at > (strftime('%s', 'now') - 7*24*3600)
          GROUP BY status
        `).run();
  
        // Create content with source view
        await env.DB.prepare(`
          CREATE VIEW IF NOT EXISTS content_with_source AS
          SELECT 
            c.*,
            r.source as raw_source,
            r.raw_score,
            r.url as source_url,
            r.collected_at as source_collected_at,
            n.name as neighborhood_name
          FROM content c
          LEFT JOIN raw_content r ON c.raw_content_id = r.id
          LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id
        `).run();
  
        // Verify migration
        const tables = await env.DB.prepare(`
          SELECT name FROM sqlite_master WHERE type='table'
        `).all();
  
        const views = await env.DB.prepare(`
          SELECT name FROM sqlite_master WHERE type='view'
        `).all();
  
        const sources = await env.DB.prepare(`
          SELECT COUNT(*) as count FROM rss_sources
        `).first();
  
        return Response.json({
          success: true,
          message: 'Phase 2b migration completed successfully',
          migration_details: {
            tables_created: tables.results.map(t => t.name),
            views_created: views.results.map(v => v.name),
            rss_sources_added: sources.count,
            timestamp: Date.now()
          }
        }, { headers: corsHeaders });
  
      } catch (error) {
        console.error('Migration failed:', error);
        return Response.json({
          success: false,
          error: 'Migration failed',
          details: error.message,
          timestamp: Date.now()
        }, { status: 500, headers: corsHeaders });
      }
    }
  };