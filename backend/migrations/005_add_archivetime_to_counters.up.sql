-- This migration adds an optional archive time column to the
-- `counters` table. The column is a NULLable timestamp that
-- defaults to NULL.
ALTER TABLE counters ADD COLUMN archivetime TIMESTAMPTZ DEFAULT NULL;
