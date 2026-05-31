ALTER TABLE counts ADD COLUMN operation VARCHAR(10) DEFAULT 'count' NOT NULL;

-- Backfill: pre-existing rows with delta=0 are legacy reset markers.
UPDATE counts SET operation = 'reset' WHERE delta = 0;

-- Backfill: initialization rows — the first non-zero count for a counter
-- created within 300ms of counter creation, or within 300ms of a reset row.
-- The 300ms window distinguishes programmatic init from human-added counts.
UPDATE counts SET operation = 'init'
WHERE delta != 0
  AND id IN (
    -- (a) first count created within 300ms of counter creation
    SELECT c.id
    FROM counts c
    JOIN counters ct ON c.counter = ct.id
    WHERE c.when BETWEEN ct.createtime AND ct.createtime + interval '300 milliseconds'
      AND c.id = (SELECT c2.id FROM counts c2 WHERE c2.counter = c.counter ORDER BY c2.when, c2.id LIMIT 1)

    UNION

    -- (b) first non-zero count within 300ms of a reset row
    SELECT c.id
    FROM counts c
    WHERE (
            SELECT c2.when
            FROM counts c2
            WHERE c2.counter = c.counter
              AND (c2.when < c.when OR (c2.when = c.when AND c2.id < c.id))
            ORDER BY c2.when DESC, c2.id DESC
            LIMIT 1
          ) BETWEEN c.when - interval '300 milliseconds' AND c.when
      AND (
            SELECT c2.delta
            FROM counts c2
            WHERE c2.counter = c.counter
              AND (c2.when < c.when OR (c2.when = c.when AND c2.id < c.id))
            ORDER BY c2.when DESC, c2.id DESC
            LIMIT 1
          ) = 0
  );
