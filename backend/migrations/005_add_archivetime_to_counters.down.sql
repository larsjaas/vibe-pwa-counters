-- Rollback for the archivetime column on the `counters` table.
ALTER TABLE counters DROP COLUMN IF EXISTS archivetime;
