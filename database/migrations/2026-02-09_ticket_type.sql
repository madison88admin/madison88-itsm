ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS ticket_type VARCHAR(20) DEFAULT 'incident' CHECK (ticket_type IN ('incident', 'request'));

CREATE INDEX IF NOT EXISTS idx_tickets_ticket_type ON tickets (ticket_type);
