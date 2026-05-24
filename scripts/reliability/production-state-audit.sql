-- Production feed state audit (run on server with psql "$DATABASE_URL")
-- Usage: psql "$DATABASE_URL" -v region_code=msk -f scripts/reliability/production-state-audit.sql

\set rid '(SELECT id FROM feed_regions WHERE lower(code) = lower(:''region_code'') LIMIT 1)'

\echo '=== FEED listings by status (region ' :region_code ') ==='
SELECT status::text, COUNT(*) AS n
FROM listings
WHERE region_id = :rid AND kind = 'APARTMENT' AND data_source = 'FEED'
GROUP BY status ORDER BY n DESC;

\echo '=== FEED listings by visibility ==='
SELECT visibility::text, COUNT(*) AS n
FROM listings
WHERE region_id = :rid AND kind = 'APARTMENT' AND data_source = 'FEED'
GROUP BY visibility ORDER BY n DESC;

\echo '=== ACTIVE+published vs SOLD (FEED) ==='
SELECT
  COUNT(*) FILTER (WHERE status IN ('ACTIVE','RESERVED') AND is_published = true) AS active_published,
  COUNT(*) FILTER (WHERE status = 'SOLD') AS sold,
  COUNT(*) FILTER (WHERE block_id IS NULL AND status IN ('ACTIVE','RESERVED')) AS orphan_active
FROM listings
WHERE region_id = :rid AND kind = 'APARTMENT' AND data_source = 'FEED';

\echo '=== Top blocks by SOLD count ==='
SELECT b.name, b.external_id, COUNT(*) AS sold_count
FROM listings l
JOIN blocks b ON b.id = l.block_id
WHERE l.region_id = :rid AND l.data_source = 'FEED' AND l.status = 'SOLD' AND l.kind = 'APARTMENT'
GROUP BY b.id, b.name, b.external_id
ORDER BY sold_count DESC LIMIT 15;

\echo '=== Duplicate external_id groups (FEED) ==='
SELECT COUNT(*) AS duplicate_groups FROM (
  SELECT external_id FROM listings
  WHERE region_id = :rid AND data_source = 'FEED' AND external_id IS NOT NULL AND external_id <> ''
  GROUP BY external_id HAVING COUNT(*) > 1
) d;

\echo '=== FEED vs MANUAL apartment counts ==='
SELECT data_source::text, status::text, COUNT(*) AS n
FROM listings
WHERE region_id = :rid AND kind = 'APARTMENT'
GROUP BY data_source, status
ORDER BY data_source, n DESC;

\echo '=== Orphan blocks (no active FEED apartments) ==='
SELECT COUNT(*) AS orphan_blocks FROM blocks b
WHERE b.region_id = :rid
  AND NOT EXISTS (
    SELECT 1 FROM listings l
    WHERE l.block_id = b.id AND l.kind = 'APARTMENT' AND l.status IN ('ACTIVE','RESERVED') AND l.is_published = true
  );

\echo '=== Degraded / quarantined imports (last 10) ==='
SELECT id, finished_at,
  stats->>'degraded' AS degraded,
  stats->>'healthy_import' AS healthy,
  stats->>'integrity_checkpoint' AS checkpoint,
  stats->>'apartments_in_feed' AS in_feed
FROM import_batches
WHERE region_id = :rid AND status = 'COMPLETED'
  AND (stats->>'degraded' = 'true' OR stats->>'mark_sold_skipped' = 'true')
ORDER BY finished_at DESC LIMIT 10;

\echo '=== Last import batches ==='
SELECT id, finished_at,
  stats->>'apartments_in_feed' AS in_feed,
  stats->>'apartments_marked_sold' AS marked_sold,
  stats->>'mark_sold_skipped' AS skip_sold,
  stats->>'degraded' AS degraded,
  stats->>'healthy_import' AS healthy
FROM import_batches
WHERE region_id = :rid AND status = 'COMPLETED'
ORDER BY finished_at DESC LIMIT 5;
