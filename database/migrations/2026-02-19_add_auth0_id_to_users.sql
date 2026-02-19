-- Add AUTH0_ID column to USERS table for stable identity synchronization
ALTER TABLE USERS ADD COLUMN IF NOT EXISTS AUTH0_ID VARCHAR(255) UNIQUE;
