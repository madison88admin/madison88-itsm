-- ============================================================
-- Revert Franchise Multi-tenancy
-- ============================================================

-- 1. Drop columns from core tables (CASCADE handles constraints/indexes/policies)
ALTER TABLE users DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE teams DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE it_assets DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE knowledge_base_articles DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE change_requests DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE sla_rules DROP COLUMN IF EXISTS franchise_id CASCADE;

-- 2. Restore global unique constraint for SLA rules (was modified in 001_franchises.sql)
ALTER TABLE sla_rules ADD CONSTRAINT sla_rules_priority_key UNIQUE (priority);

-- 3. Drop the franchises table
DROP TABLE IF EXISTS franchises CASCADE;

-- 4. Disable RLS on core tables (which were enabled in 002_rls_policies.sql)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE it_assets DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base_articles DISABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE sla_rules DISABLE ROW LEVEL SECURITY;
