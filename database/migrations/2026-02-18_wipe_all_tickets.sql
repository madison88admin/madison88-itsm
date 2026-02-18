-- Danger: This will delete ALL tickets and related data!
-- Run this SQL to wipe out all tickets and their dependencies.

-- Delete ticket attachments
DELETE FROM ticket_attachments;
-- Delete ticket comments
DELETE FROM ticket_comments;
-- Delete ticket status history
DELETE FROM ticket_status_history;
-- Delete ticket escalations
DELETE FROM ticket_escalations;
-- Delete audit logs related to tickets
DELETE FROM audit_logs WHERE entity_type = 'ticket';
-- Delete the tickets themselves
DELETE FROM tickets;
