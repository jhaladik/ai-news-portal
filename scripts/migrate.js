// scripts/migrate.js - Database setup for remote D1
export default {
    async fetch(request, env) {
      try {
        // Phase 1 database schema
        const migrations = [
          // Neighborhoods table
          `CREATE TABLE IF NOT EXISTS neighborhoods (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            slug TEXT UNIQUE,
            bounds TEXT,
            subscriber_count INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            created_at INTEGER DEFAULT (strftime('%s', 'now'))
          )`,
  
          // Content table (main news articles)
          `CREATE TABLE IF NOT EXISTS content (
            id TEXT PRIMARY KEY,
            neighborhood_id TEXT,
            category TEXT NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            ai_confidence REAL DEFAULT 0,
            status TEXT DEFAULT 'draft',
            created_by TEXT,
            published_at INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
          )`,
  
          // Users table (subscribers and admins)
          `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            neighborhood_id TEXT,
            role TEXT DEFAULT 'subscriber',
            verified INTEGER DEFAULT 0,
            last_login INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
          )`,
  
          // Businesses table
          `CREATE TABLE IF NOT EXISTS businesses (
            id TEXT PRIMARY KEY,
            neighborhood_id TEXT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            business_type TEXT,
            status TEXT DEFAULT 'prospect',
            outreach_score INTEGER DEFAULT 0,
            last_contact INTEGER,
            created_at INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
          )`,
  
          // GDPR consents (prepared for Phase 4)
          `CREATE TABLE IF NOT EXISTS consents (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            consent_type TEXT NOT NULL,
            granted INTEGER NOT NULL,
            timestamp INTEGER DEFAULT (strftime('%s', 'now')),
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`,
  
          // Indexes for performance
          `CREATE INDEX IF NOT EXISTS idx_content_neighborhood ON content(neighborhood_id)`,
          `CREATE INDEX IF NOT EXISTS idx_content_status ON content(status)`,
          `CREATE INDEX IF NOT EXISTS idx_content_category ON content(category)`,
          `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
          `CREATE INDEX IF NOT EXISTS idx_businesses_neighborhood ON businesses(neighborhood_id)`,
          `CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status)`
        ];
  
        // Execute all migrations
        for (const sql of migrations) {
          await env.DB.prepare(sql).run();
        }
  
        // Insert sample neighborhoods
        const sampleNeighborhoods = [
          { id: 'vinohrady', name: 'Vinohrady', slug: 'vinohrady' },
          { id: 'karlin', name: 'Karlín', slug: 'karlin' },
          { id: 'smichov', name: 'Smíchov', slug: 'smichov' },
          { id: 'zizkov', name: 'Žižkov', slug: 'zizkov' }
        ];
  
        for (const neighborhood of sampleNeighborhoods) {
          await env.DB.prepare(
            'INSERT OR IGNORE INTO neighborhoods (id, name, slug) VALUES (?, ?, ?)'
          ).bind(neighborhood.id, neighborhood.name, neighborhood.slug).run();
        }
  
        // Create admin user
        await env.DB.prepare(
          'INSERT OR IGNORE INTO users (id, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).bind('admin-1', 'admin@mistni-zpravy.cz', 'admin123', 'admin').run();
  
        // Verification
        const tableCount = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
        ).first();
  
        const userCount = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM users"
        ).first();
  
        const neighborhoodCount = await env.DB.prepare(
          "SELECT COUNT(*) as count FROM neighborhoods"
        ).first();
  
        return Response.json({
          success: true,
          message: 'Remote database migration completed',
          tablesCreated: tableCount.count,
          usersCreated: userCount.count,
          neighborhoodsCreated: neighborhoodCount.count,
          environment: 'remote',
          timestamp: new Date().toISOString()
        });
  
      } catch (error) {
        return Response.json({
          success: false,
          error: error.message,
          stack: error.stack
        }, { status: 500 });
      }
    }
  };