-- Add user_id to counts table to track who performed the increment.
-- We add it as nullable first to avoid errors with existing data.
ALTER TABLE counts ADD COLUMN user_id INTEGER;

-- Default for existing records: set to the owner of the counter
UPDATE counts SET user_id = (SELECT "user" FROM counters WHERE counters.id = counts.counter);

-- Now that existing records are populated, set it to NOT NULL
ALTER TABLE counts ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE counts ADD CONSTRAINT fk_counts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
