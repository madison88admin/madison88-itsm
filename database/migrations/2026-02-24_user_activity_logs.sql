/**
 * Migration: Create User Activity Logs Table
 * Date: 2026-02-24
 * Purpose: Track user logins, logouts, and real-time activity
 */

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  activity_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, TICKET_VIEW, COMMENT, SEARCH, etc.
  resource_id UUID, -- ticket_id, kb_article_id, etc.
  resource_type VARCHAR(50), -- TICKET, KB_ARTICLE, ASSET, etc.
  ip_address INET, -- User's IP address
  user_agent TEXT, -- Browser/device info
  location VARCHAR(100), -- Geographic location if available
  activity_details JSONB, -- Extra data (search query, etc.)
  activity_timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_user_activity_timestamp ON user_activity_logs(activity_timestamp DESC);
CREATE INDEX idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX idx_user_activity_login_logout ON user_activity_logs(user_id, activity_type, activity_timestamp DESC);

-- View: Active users (logged in within last 15 minutes)
CREATE OR REPLACE VIEW active_users_view AS
SELECT DISTINCT ON (u.user_id)
  u.user_id,
  u.email,
  u.full_name,
  u.role,
  u.location,
  ual.activity_type,
  ual.activity_timestamp,
  ual.ip_address,
  ROUND(EXTRACT(EPOCH FROM (NOW() - ual.activity_timestamp))/60)::INT as minutes_since_activity
FROM users u
LEFT JOIN user_activity_logs ual ON u.user_id = ual.user_id
WHERE u.is_active = true
  AND ual.activity_timestamp > NOW() - INTERVAL '15 MINUTES'
ORDER BY u.user_id, ual.activity_timestamp DESC;

-- View: User session summary
CREATE OR REPLACE VIEW user_sessions_view AS
SELECT 
  u.user_id,
  u.email,
  u.full_name,
  u.role,
  u.location,
  (SELECT activity_timestamp FROM user_activity_logs 
   WHERE user_id = u.user_id AND activity_type = 'LOGIN' 
   ORDER BY activity_timestamp DESC LIMIT 1) as last_login,
  (SELECT activity_timestamp FROM user_activity_logs 
   WHERE user_id = u.user_id AND activity_type = 'LOGOUT' 
   ORDER BY activity_timestamp DESC LIMIT 1) as last_logout,
  (SELECT activity_timestamp FROM user_activity_logs 
   WHERE user_id = u.user_id 
   ORDER BY activity_timestamp DESC LIMIT 1) as last_activity,
  (SELECT COUNT(*) FROM user_activity_logs 
   WHERE user_id = u.user_id 
   AND activity_timestamp > NOW() - INTERVAL '24 HOURS') as activities_in_24h
FROM users u
WHERE u.is_active = true;

-- View: Daily activity summary
CREATE OR REPLACE VIEW daily_activity_summary AS
SELECT 
  DATE(activity_timestamp) as activity_date,
  activity_type,
  COUNT(*) as activity_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT resource_id) as unique_resources
FROM user_activity_logs
WHERE activity_timestamp > NOW() - INTERVAL '30 DAYS'
GROUP BY DATE(activity_timestamp), activity_type
ORDER BY activity_date DESC, activity_type;
