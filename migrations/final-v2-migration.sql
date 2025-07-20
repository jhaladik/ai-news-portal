-- final-v2-migration.sql - Create only the final missing v2 tables
-- Safe to run multiple times

-- Content edit history for admin overrides (if missing)
CREATE TABLE IF NOT EXISTS content_edit_history (
  id TEXT PRIMARY KEY,
  content_id TEXT,
  action TEXT, -- manual_override, delete, etc.
  changes TEXT, -- JSON of what changed
  override_reason TEXT,
  edited_by TEXT,
  edited_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- RSS source health monitoring (if missing)
CREATE TABLE IF NOT EXISTS rss_source_health (
  source_id TEXT PRIMARY KEY,
  last_check INTEGER,
  last_success INTEGER,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  items_fetched INTEGER DEFAULT 0
);

-- Create indexes for these tables
CREATE INDEX IF NOT EXISTS idx_content_edit_history_content_id ON content_edit_history(content_id);
CREATE INDEX IF NOT EXISTS idx_content_edit_history_edited_by ON content_edit_history(edited_by);
CREATE INDEX IF NOT EXISTS idx_rss_source_health_last_check ON rss_source_health(last_check);

-- Verify tables were created
SELECT 'Final v2 migration completed! All tables ready for workers.' as result;