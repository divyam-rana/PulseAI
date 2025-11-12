-- Step 1: Drop old backup (if exists) and create fresh backup
DROP TABLE IF EXISTS `pulseai-team3-ba882-fall25.raw_gnews.articles_backup`;

CREATE TABLE `pulseai-team3-ba882-fall25.raw_gnews.articles_backup` AS
SELECT * FROM `pulseai-team3-ba882-fall25.raw_gnews.articles`;

-- Step 2: Verify current state (should show all NULL ids)
SELECT 
  COUNT(*) as total_records,
  COUNTIF(id IS NULL) as null_ids,
  COUNTIF(id IS NOT NULL) as non_null_ids
FROM `pulseai-team3-ba882-fall25.raw_gnews.articles`;

-- Step 3: Create a new table WITH the same partitioning, including IDs
CREATE TABLE `pulseai-team3-ba882-fall25.raw_gnews.articles_with_ids`
PARTITION BY DATE(published_at)
AS
SELECT 
  SUBSTR(TO_HEX(SHA256(CAST(url AS BYTES))), 1, 16) as id,
  title,
  description,
  content,
  url,
  image,
  published_at,
  source,
  ingest_timestamp,
  load_timestamp,
  source_path,
  run_id
FROM `pulseai-team3-ba882-fall25.raw_gnews.articles`;

-- Step 4: Verify the new table has IDs
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT id) as unique_ids,
  COUNTIF(id IS NULL) as null_ids,
  COUNT(*) - COUNT(DISTINCT id) as duplicate_ids
FROM `pulseai-team3-ba882-fall25.raw_gnews.articles_with_ids`;

-- Step 5: Verify partitioning is preserved
SELECT 
  partition_id,
  total_rows
FROM `pulseai-team3-ba882-fall25.raw_gnews.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'articles_with_ids'
ORDER BY partition_id DESC
LIMIT 10;

-- Step 6: Sample some IDs
SELECT id, url, title, published_at
FROM `pulseai-team3-ba882-fall25.raw_gnews.articles_with_ids`
LIMIT 10;

-- Step 7: Double-check counts match before proceeding
SELECT 
  (SELECT COUNT(*) FROM `pulseai-team3-ba882-fall25.raw_gnews.articles`) as original_count,
  (SELECT COUNT(*) FROM `pulseai-team3-ba882-fall25.raw_gnews.articles_with_ids`) as new_count,
  (SELECT COUNT(*) FROM `pulseai-team3-ba882-fall25.raw_gnews.articles_backup`) as backup_count;

-- Step 8: If everything looks good, drop original and rename
DROP TABLE `pulseai-team3-ba882-fall25.raw_gnews.articles`;

ALTER TABLE `pulseai-team3-ba882-fall25.raw_gnews.articles_with_ids`
RENAME TO articles;

-- Step 9: Final verification
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT id) as unique_ids,
  COUNTIF(id IS NULL) as null_ids
FROM `pulseai-team3-ba882-fall25.raw_gnews.articles`;
