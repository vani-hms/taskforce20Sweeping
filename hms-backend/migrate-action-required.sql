-- Migration script to fix existing ACTION_REQUIRED reports
-- These reports were created before the ownership transfer fix was deployed
-- They have status = 'ACTION_REQUIRED' but currentOwnerRole is still 'QC'

-- Step 1: Check current state
SELECT 
    id,
    status,
    current_owner_role,
    action_officer_id,
    bin_id
FROM litter_bin_reports
WHERE status = 'ACTION_REQUIRED'
  AND current_owner_role = 'QC';

-- Step 2: For each ACTION_REQUIRED report with currentOwnerRole = 'QC',
-- we need to:
-- 1. Find the appropriate Action Officer based on zone/ward
-- 2. Update currentOwnerRole to 'ACTION_OFFICER'
-- 3. Set actionOfficerId

-- This is a complex update that requires joining with bins and user_cities
-- We'll do it in a transaction

BEGIN;

-- Update ACTION_REQUIRED reports to transfer ownership to Action Officers
UPDATE litter_bin_reports r
SET 
    current_owner_role = 'ACTION_OFFICER',
    action_officer_id = (
        SELECT uc.user_id
        FROM user_cities uc
        INNER JOIN litter_bins b ON r.bin_id = b.id
        INNER JOIN user_module_roles umr ON uc.user_id = umr.user_id 
            AND uc.city_id = umr.city_id
        WHERE uc.role = 'ACTION_OFFICER'
          AND umr.role = 'ACTION_OFFICER'
          AND umr.module_id = (SELECT id FROM modules WHERE name = 'LITTERBINS')
          AND uc.city_id = r.city_id
          AND b.zone_id = ANY(uc.zone_ids)
          AND b.ward_id = ANY(uc.ward_ids)
        ORDER BY uc.created_at ASC
        LIMIT 1
    )
WHERE r.status = 'ACTION_REQUIRED'
  AND r.current_owner_role = 'QC';

-- Verify the update
SELECT 
    id,
    status,
    current_owner_role,
    action_officer_id,
    CASE 
        WHEN action_officer_id IS NULL THEN 'ERROR: No Action Officer found'
        ELSE 'OK'
    END as validation
FROM litter_bin_reports
WHERE status = 'ACTION_REQUIRED';

-- If everything looks good, commit
COMMIT;

-- If there are any reports with NULL action_officer_id, you need to investigate
-- Run this to see which reports couldn't find an Action Officer:
SELECT 
    r.id,
    r.status,
    r.current_owner_role,
    r.action_officer_id,
    b.zone_id,
    b.ward_id,
    b.city_id
FROM litter_bin_reports r
LEFT JOIN litter_bins b ON r.bin_id = b.id
WHERE r.status = 'ACTION_REQUIRED'
  AND r.action_officer_id IS NULL;
