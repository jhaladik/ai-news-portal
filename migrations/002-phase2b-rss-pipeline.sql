-- migrations/002-phase2b-rss-pipeline.sql
-- Phase 2b: RSS Pipeline Database Schema

-- Raw content table for RSS feed data
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
  metadata TEXT -- JSON string for additional data
);

-- Publications table for tracking where content is published
CREATE TABLE IF NOT EXISTS publications (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  neighborhood_id TEXT NOT NULL,
  category TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  auto_published INTEGER DEFAULT 0,
  FOREIGN KEY (content_id) REFERENCES content(id),
  FOREIGN KEY (neighborhood_id) REFERENCES neighborhoods(id)
);

-- Add Phase 2b columns to existing content table
ALTER TABLE content ADD COLUMN raw_content_id TEXT;
ALTER TABLE content ADD COLUMN validation_notes TEXT;
ALTER TABLE content ADD COLUMN validated_at INTEGER;
ALTER TABLE content ADD COLUMN approved_at INTEGER;
ALTER TABLE content ADD COLUMN rejected_at INTEGER;
ALTER TABLE content ADD COLUMN rejection_reason TEXT;
ALTER TABLE content ADD COLUMN admin_notes TEXT;
ALTER TABLE content ADD COLUMN published_id TEXT;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_raw_content_score ON raw_content(raw_score DESC);
CREATE INDEX IF NOT EXISTS idx_raw_content_category ON raw_content(category);
CREATE INDEX IF NOT EXISTS idx_raw_content_collected ON raw_content(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_raw_id ON content(raw_content_id);
CREATE INDEX IF NOT EXISTS idx_content_confidence ON content(ai_confidence DESC);
CREATE INDEX IF NOT EXISTS idx_content_status_created ON content(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_neighborhood ON publications(neighborhood_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_publications_category ON publications(category, published_at DESC);

-- Sample RSS sources configuration (can be managed via admin later)
CREATE TABLE IF NOT EXISTS rss_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  category_hint TEXT,
  last_fetched INTEGER,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0
);

-- Insert default RSS sources
INSERT OR IGNORE INTO rss_sources (id, name, url, category_hint) VALUES
('praha4', 'Praha 4 Official', 'https://www.praha4.cz/rss', 'local_government'),
('praha2', 'Praha 2 Official', 'https://www.praha2.cz/rss', 'local_government'),
('dpp', 'Prague Public Transport', 'https://www.dpp.cz/rss', 'transport'),
('weather', 'Prague Weather', 'https://api.openweathermap.org/data/2.5/weather?q=Prague&appid=demo&mode=xml', 'weather');

-- Pipeline run logs table for monitoring
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
  metadata TEXT -- JSON string for additional data
);

-- Content validation history
CREATE TABLE IF NOT EXISTS validation_history (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL,
  validation_type TEXT NOT NULL, -- 'ai', 'manual', 'auto'
  confidence_score REAL,
  validation_result TEXT NOT NULL, -- 'approved', 'rejected', 'flagged'
  validation_notes TEXT,
  validated_by TEXT, -- user_id or 'system'
  validated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (content_id) REFERENCES content(id)
);

-- Add sample neighborhoods if they don't exist
INSERT OR IGNORE INTO neighborhoods (id, name, slug, subscriber_count) VALUES
('praha1', 'Praha 1 - Staré Město', 'praha1', 120),
('praha2', 'Praha 2 - Nové Město', 'praha2', 89),
('praha4', 'Praha 4 - Chodov, Michle', 'praha4', 156),
('praha5', 'Praha 5 - Smíchov', 'praha5', 94),
('vinohrady', 'Vinohrady', 'vinohrady', 78),
('karlin', 'Karlín', 'karlin', 45);

-- Update existing content categories if needed
UPDATE content SET category = 'local_government' WHERE category IS NULL OR category = '';

-- Create view for admin dashboard
CREATE VIEW IF NOT EXISTS admin_dashboard_stats AS
SELECT 
  'content_stats' as metric_type,
  status,
  category,
  COUNT(*) as count,
  AVG(ai_confidence) as avg_confidence
FROM content 
WHERE created_at > (strftime('%s', 'now') - 7*24*3600) -- Last 7 days
GROUP BY status, category

UNION ALL

SELECT 
  'pipeline_stats' as metric_type,
  status as status,
  NULL as category,
  COUNT(*) as count,
  AVG(scored_items) as avg_confidence
FROM pipeline_runs 
WHERE started_at > (strftime('%s', 'now') - 7*24*3600) -- Last 7 days
GROUP BY status;

-- Create view for content with source information
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
LEFT JOIN neighborhoods n ON c.neighborhood_id = n.id;