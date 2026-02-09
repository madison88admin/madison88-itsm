CREATE TABLE IF NOT EXISTS ticket_templates (
  template_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  business_impact TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_by UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ticket_templates_active ON ticket_templates (is_active);
CREATE INDEX IF NOT EXISTS idx_ticket_templates_category ON ticket_templates (category);
