-- Reverts the step column addition.
ALTER TABLE IF EXISTS counters
    DROP COLUMN IF EXISTS step;