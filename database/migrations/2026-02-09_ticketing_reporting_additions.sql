-- Ticketing and Reporting Enhancements

-- Add resolution and response tracking fields to tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS closed_by UUID REFERENCES users(user_id),
  ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolution_summary TEXT,
  ADD COLUMN IF NOT EXISTS resolution_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS root_cause VARCHAR(255);

-- Status history table
CREATE TABLE IF NOT EXISTS ticket_status_history (
  status_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES users(user_id),
  change_reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_status_history_ticket_id ON ticket_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_status_history_changed_at ON ticket_status_history(changed_at);

-- Escalations table
CREATE TABLE IF NOT EXISTS ticket_escalations (
  escalation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  escalated_by UUID REFERENCES users(user_id),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  resolved_by UUID REFERENCES users(user_id),
  escalated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_escalations_ticket_id ON ticket_escalations(ticket_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON ticket_escalations(status);
