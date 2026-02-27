ALTER TABLE change_requests
  ADD COLUMN IF NOT EXISTS business_impact TEXT,
  ADD COLUMN IF NOT EXISTS communication_plan TEXT,
  ADD COLUMN IF NOT EXISTS dependency_map TEXT,
  ADD COLUMN IF NOT EXISTS role_assignments JSONB,
  ADD COLUMN IF NOT EXISTS technical_checklist JSONB,
  ADD COLUMN IF NOT EXISTS emergency_justification TEXT,
  ADD COLUMN IF NOT EXISTS retro_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_downtime_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS post_implementation_notes TEXT,
  ADD COLUMN IF NOT EXISTS pir_required BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pir_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pir_notes TEXT,
  ADD COLUMN IF NOT EXISTS approval_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_within_sla BOOLEAN;

CREATE INDEX IF NOT EXISTS idx_change_requests_approval_due_at
  ON change_requests (approval_due_at);

CREATE INDEX IF NOT EXISTS idx_change_requests_retro_due_at
  ON change_requests (retro_due_at);
