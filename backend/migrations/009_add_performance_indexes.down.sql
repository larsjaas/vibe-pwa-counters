-- Remove performance indexes
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_apikeys_userid;
DROP INDEX IF EXISTS idx_counts_when_active;
