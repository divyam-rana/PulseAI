-- This approach preserves the original table until you're satisfied
-- Step 1: Create backup
CREATE TABLE `pulseai-team3-ba882-fall25.raw_arxiv.papers_backup` AS
SELECT * FROM `pulseai-team3-ba882-fall25.raw_arxiv.papers`;

-- Step 2: Delete duplicates, keeping most recent
DELETE FROM `pulseai-team3-ba882-fall25.raw_arxiv.papers`
WHERE CONCAT(arxiv_id, '_', CAST(load_timestamp AS STRING)) IN (
  SELECT CONCAT(arxiv_id, '_', CAST(load_timestamp AS STRING))
  FROM (
    SELECT 
      arxiv_id,
      load_timestamp,
      ROW_NUMBER() OVER (PARTITION BY arxiv_id ORDER BY load_timestamp DESC) as rn
    FROM `pulseai-team3-ba882-fall25.raw_arxiv.papers`
  )
  WHERE rn > 1
);

-- Step 3: Verify and if satisfied, drop backup
DROP TABLE `pulseai-team3-ba882-fall25.raw_arxiv.papers_backup`;
