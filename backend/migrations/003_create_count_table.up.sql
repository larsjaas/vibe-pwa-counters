-- | id | counter | delta | when | deletetime |
CREATE TABLE IF NOT EXISTS count (
    id SERIAL PRIMARY KEY,
    "counter" INTEGER NOT NULL,
    delta INTEGER NOT NULL,
    "when" TIMESTAMP NOT NULL DEFAULT NOW(),
    deletetime TIMESTAMP DEFAULT NULL,
    CONSTRAINT fk_counter FOREIGN KEY ("counter") REFERENCES counters(id) ON DELETE CASCADE
);

-- Index to speed up queries filtering by counter
CREATE INDEX IF NOT EXISTS idx_count_counter ON count("counter");
