-- Database Validation Queries
-- Run these after import to verify data integrity

-- 1. Count total apartments
SELECT COUNT(*) as total_apartments FROM apartments;

-- 2. Count active apartments
SELECT COUNT(*) as active_apartments FROM apartments WHERE is_active = 1;

-- 3. Count inactive apartments
SELECT COUNT(*) as inactive_apartments FROM apartments WHERE is_active = 0;

-- 4. Check for duplicates (source + external_id)
SELECT source, external_id, COUNT(*) as count
FROM apartments
GROUP BY source, external_id
HAVING COUNT(*) > 1;

-- 5. Check apartments without last_seen_at
SELECT COUNT(*) as missing_last_seen
FROM apartments
WHERE last_seen_at IS NULL;

-- 6. Check apartments by source
SELECT source, COUNT(*) as count, 
       SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count
FROM apartments
GROUP BY source;

-- 7. Check orphan apartments (no building)
SELECT COUNT(*) as orphan_apartments
FROM apartments a
LEFT JOIN buildings b ON a.building_id = b.id
WHERE b.id IS NULL;

-- 8. Check orphan buildings (no project)
SELECT COUNT(*) as orphan_buildings
FROM buildings b
LEFT JOIN projects p ON b.project_id = p.id
WHERE p.id IS NULL;

-- 9. Sample active apartments
SELECT id, source, external_id, price, rooms_count, is_active, last_seen_at
FROM apartments
WHERE is_active = 1
ORDER BY last_seen_at DESC
LIMIT 10;

-- 10. Check apartments updated in last hour
SELECT COUNT(*) as recently_updated
FROM apartments
WHERE last_seen_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
