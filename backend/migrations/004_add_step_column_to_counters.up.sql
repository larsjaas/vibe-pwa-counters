-- Adds a "step" column to the counters table.
--
-- | step | numeric
-- The column is meant to represent the incremental step value for each counter
-- and defaults to 0 for existing rows.

ALTER TABLE IF EXISTS counters
    ADD COLUMN IF NOT EXISTS step INTEGER NOT NULL DEFAULT 1;
