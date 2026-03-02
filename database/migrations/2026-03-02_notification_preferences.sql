CREATE TABLE IF NOT EXISTS user_notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  ticket_updates_enabled boolean NOT NULL DEFAULT true,
  broadcast_enabled boolean NOT NULL DEFAULT true,
  browser_push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start time NOT NULL DEFAULT '22:00',
  quiet_hours_end time NOT NULL DEFAULT '07:00',
  timezone varchar(80) NOT NULL DEFAULT 'Asia/Manila',
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notification_preferences_user
  ON user_notification_preferences(user_id);
