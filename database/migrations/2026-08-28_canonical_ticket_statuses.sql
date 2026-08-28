BEGIN;

-- Preserve the old values in status history while canonicalizing live tickets.
UPDATE tickets SET status = 'In Progress' WHERE status IN ('Pending', 'Reopened');

-- Keep the database contract explicit without touching other schemas.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_status_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('New', 'In Progress', 'Resolved', 'Closed'));

COMMIT;
