-- Add performance indexes to existing tables
-- | users | email | Unique index for fast auth and user lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- | apikeys | userid | Index for user-scoped API key management
CREATE INDEX IF NOT EXISTS idx_apikeys_userid ON apikeys(userid);

-- | counts | when | Partial index for chronological history retrieval of active counts
CREATE INDEX IF NOT EXISTS idx_counts_when_active ON counts("when")
WHERE deletetime IS NULL;
