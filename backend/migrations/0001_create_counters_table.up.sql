-- | id   | name   | count  |
CREATE TABLE IF NOT EXISTS counters (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0
);
