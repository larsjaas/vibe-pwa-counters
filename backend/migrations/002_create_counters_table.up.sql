-- | id | user | name | createtime | deletetime |
CREATE TABLE IF NOT EXISTS counters (
    id SERIAL PRIMARY KEY,
    "user" INTEGER NOT NULL,
    name VARCHAR(64) NOT NULL,
    createtime TIMESTAMP NOT NULL DEFAULT NOW(),
    deletetime TIMESTAMP,
    CONSTRAINT fk_user FOREIGN KEY ("user") REFERENCES users(id) ON DELETE CASCADE
);

-- Index to speed up queries filtering by user
CREATE INDEX IF NOT EXISTS idx_counters_user ON counters("user");
