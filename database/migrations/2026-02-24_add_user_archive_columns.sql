-- Add archived columns to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(user_id);

-- Add index to make archived filtering efficient
CREATE INDEX IF NOT EXISTS idx_users_archived_at ON users(archived_at);
