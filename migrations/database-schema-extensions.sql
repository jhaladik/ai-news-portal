-- Database Schema Extensions for AI News Portal v2
-- Add these tables to support the new workers

-- User preferences table
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  categories TEXT, -- JSON array of preferred categories
  neighborhoods TEXT, -- JSON array of preferred neighborhoods
  notification_frequency TEXT DEFAULT 'daily', -- daily, weekly, monthly
  email_enabled INTEGER DEFAULT 1,
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Newsletter tracking tables
CREATE TABLE newsletters (
  id TEXT PRIMARY KEY,
  neighborhood_id TEXT,
  template_id TEXT,
  subject TEXT NOT NULL,
  content_html TEXT,
  content_text TEXT,
  status TEXT DEFAULT 'draft', -- draft, sent
  sent_at INTEGER,
  sent_count INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY(neighborhood_id) REFERENCES neighborhoods(id)
);

CREATE TABLE newsletter_sends (
  newsletter_id TEXT,
  user_id TEXT,
  sent_at INTEGER,
  opened_at INTEGER,
  clicked_at INTEGER,
  PRIMARY KEY(newsletter_id, user_id),
  FOREIGN KEY(newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Content edit history for admin overrides
CREATE TABLE content_edit_history (
  id TEXT PRIMARY KEY,
  content_id TEXT,
  action TEXT, -- manual_override, delete, etc.
  changes TEXT, -- JSON of what changed
  override_reason TEXT,
  edited_by TEXT,
  edited_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY(content_id) REFERENCES content(id) ON DELETE CASCADE,
  FOREIGN KEY(edited_by) REFERENCES users(id)
);

-- RSS source management
CREATE TABLE rss_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT UNIQUE NOT NULL,
  category TEXT,
  neighborhood_id TEXT,
  priority INTEGER DEFAULT 5,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER,
  created_by TEXT,
  FOREIGN KEY(neighborhood_id) REFERENCES neighborhoods(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE rss_source_health (
  source_id TEXT PRIMARY KEY,
  last_check INTEGER,
  last_success INTEGER,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  items_fetched INTEGER DEFAULT 0,
  FOREIGN KEY(source_id) REFERENCES rss_sources(id) ON DELETE CASCADE
);

-- Add missing columns to existing tables
ALTER TABLE content ADD COLUMN manual_override INTEGER DEFAULT 0;
ALTER TABLE content ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN name TEXT;
ALTER TABLE users ADD COLUMN last_login INTEGER;
ALTER TABLE users ADD COLUMN updated_at INTEGER;

-- Create indexes for performance
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_newsletter_sends_user_id ON newsletter_sends(user_id);
CREATE INDEX idx_newsletter_sends_newsletter_id ON newsletter_sends(newsletter_id);
CREATE INDEX idx_content_edit_history_content_id ON content_edit_history(content_id);
CREATE INDEX idx_content_edit_history_edited_by ON content_edit_history(edited_by);
CREATE INDEX idx_rss_sources_active ON rss_sources(active);
CREATE INDEX idx_rss_sources_neighborhood ON rss_sources(neighborhood_id);
CREATE INDEX idx_content_manual_override ON content(manual_override);
CREATE INDEX idx_users_last_login ON users(last_login);