ALTER TABLE counters ADD COLUMN initial_value INTEGER DEFAULT 0;

-- Backfill from the earliest 'init' operation row per counter.
UPDATE counters SET initial_value = sub.delta
FROM (
    SELECT c.counter, c.delta
    FROM counts c
    WHERE c.operation = 'init'
      AND c.deletetime IS NULL
      AND c.id = (
          SELECT c2.id
          FROM counts c2
          WHERE c2.counter = c.counter
            AND c2.operation = 'init'
            AND c2.deletetime IS NULL
          ORDER BY c2.when ASC, c2.id ASC
          LIMIT 1
      )
) sub
WHERE sub.counter = counters.id;
