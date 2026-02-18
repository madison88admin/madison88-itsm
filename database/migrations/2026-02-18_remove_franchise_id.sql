-- Migration: Remove franchise_id from all tables
-- Run this SQL to drop franchise_id columns and related constraints

ALTER TABLE users DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE tickets DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE teams DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE it_assets DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE knowledge_base_articles DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE change_requests DROP COLUMN IF EXISTS franchise_id CASCADE;
ALTER TABLE sla_rules DROP COLUMN IF EXISTS franchise_id CASCADE;
-- Add more tables if needed
