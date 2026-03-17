ALTER TABLE ticket_escalations
ADD COLUMN IF NOT EXISTS old_priority VARCHAR(10);

UPDATE ticket_escalations e
SET old_priority = COALESCE(e.old_priority, t.priority)
FROM tickets t
WHERE e.ticket_id = t.ticket_id
  AND e.old_priority IS NULL;
