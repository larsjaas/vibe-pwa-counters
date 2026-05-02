-- Add access_level to tag_shares table
-- 1: Read-Only
-- 2: Edit/Increment
ALTER TABLE tag_shares ADD COLUMN access_level INTEGER NOT NULL DEFAULT 2;
