-- User Confirmation Workflow for Ticket Resolution
-- This migration adds fields to support user confirmation of ticket resolution/closure
-- and SLA pause/resume functionality

-- Add user confirmation fields
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS user_confirmed_resolution BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS user_confirmed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS resolution_pending_confirmation_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sla_paused_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS sla_paused_duration_minutes INTEGER DEFAULT 0;

-- Create index for finding tickets pending user confirmation
CREATE INDEX IF NOT EXISTS idx_tickets_pending_confirmation 
  ON tickets(resolution_pending_confirmation_at) 
  WHERE status IN ('Resolved', 'Closed') 
    AND user_confirmed_resolution = FALSE
    AND resolution_pending_confirmation_at IS NOT NULL;

-- Create index for SLA paused tickets
CREATE INDEX IF NOT EXISTS idx_tickets_sla_paused 
  ON tickets(sla_paused_at) 
  WHERE sla_paused_at IS NOT NULL;

