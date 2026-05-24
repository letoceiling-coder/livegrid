-- Iter 71: Restore FEED catalog visibility for apartments wrongly hidden or expired INACTIVE.
-- Targets HIDDEN ACTIVE and INACTIVE (from LISTINGS_EXPIRE) FEED rows with block_id.
-- Usage: psql "$DATABASE_URL" -v region_id=1 -f scripts/reliability/production-visibility-restore.sql

\echo '=== BEFORE ==='
SELECT
  COUNT(*) FILTER (WHERE status IN ('ACTIVE','RESERVED') AND is_published AND visibility = 'PUBLIC' AND block_id IS NOT NULL) AS vitrine_eligible,
  COUNT(*) FILTER (WHERE status = 'ACTIVE' AND visibility = 'HIDDEN') AS active_hidden,
  COUNT(*) FILTER (WHERE status = 'INACTIVE' AND block_id IS NOT NULL) AS inactive_with_block
FROM listings
WHERE region_id = :region_id AND kind = 'APARTMENT' AND data_source = 'FEED';

BEGIN;

UPDATE listings
SET
  status = 'ACTIVE',
  visibility = 'PUBLIC',
  is_published = true,
  published_at = NOW(),
  archived_at = NULL,
  last_activity_at = NOW(),
  updated_at = NOW()
WHERE region_id = :region_id
  AND kind = 'APARTMENT'
  AND data_source = 'FEED'
  AND block_id IS NOT NULL
  AND (
    (status = 'ACTIVE' AND visibility = 'HIDDEN')
    OR (status = 'INACTIVE' AND visibility IN ('PUBLIC', 'HIDDEN'))
  );

\echo 'Rows updated:' 
SELECT COUNT(*) AS restored FROM listings
WHERE region_id = :region_id AND kind = 'APARTMENT' AND data_source = 'FEED'
  AND status = 'ACTIVE' AND visibility = 'PUBLIC' AND is_published = true;

COMMIT;

\echo '=== Refresh catalog MV ==='
REFRESH MATERIALIZED VIEW CONCURRENTLY catalog_apartment_active_mv;

\echo '=== AFTER ==='
SELECT
  COUNT(*) FILTER (WHERE status IN ('ACTIVE','RESERVED') AND is_published AND visibility = 'PUBLIC' AND block_id IS NOT NULL) AS vitrine_eligible,
  COUNT(DISTINCT block_id) FILTER (WHERE status IN ('ACTIVE','RESERVED') AND is_published AND visibility = 'PUBLIC' AND block_id IS NOT NULL) AS vitrine_blocks
FROM listings
WHERE region_id = :region_id AND kind = 'APARTMENT';
