-- Migration: Add franchise_id to TICKETS and USERS tables
-- Run this SQL to add the missing column for multi-franchise support

ALTER TABLE TICKETS ADD COLUMN IF NOT EXISTS franchise_id UUID;
ALTER TABLE USERS ADD COLUMN IF NOT EXISTS franchise_id UUID;

-- Optionally, add a foreign key constraint if you have a FRANCHISES table:
-- ALTER TABLE TICKETS ADD CONSTRAINT fk_franchise FOREIGN KEY (franchise_id) REFERENCES FRANCHISES(franchise_id);
-- ALTER TABLE USERS ADD CONSTRAINT fk_franchise_user FOREIGN KEY (franchise_id) REFERENCES FRANCHISES(franchise_id);
