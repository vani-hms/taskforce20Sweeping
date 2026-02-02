-- LitterBins ACTION_REQUIRED Ownership Transfer Verification
-- Run these queries to verify the fix is working correctly

-- 1. Check initial state (before QC marks as ACTION_REQUIRED)
-- Expected: Reports with status = SUBMITTED/PENDING_QC, current_owner_role = QC, action_officer_id = NULL
SELECT 
    id, 
    status, 
    current_owner_role, 
    action_officer_id, 
    reviewed_by_qc_id,
    created_at
FROM litter_bin_reports
WHERE status IN ('SUBMITTED', 'PENDING_QC')
ORDER BY created_at DESC
LIMIT 10;

-- 2. After QC marks report as ACTION_REQUIRED
-- Expected: status = ACTION_REQUIRED, current_owner_role = ACTION_OFFICER, action_officer_id IS NOT NULL
SELECT 
    id, 
    status, 
    current_owner_role, 
    action_officer_id, 
    reviewed_by_qc_id,
    reviewed_at,
    updated_at
FROM litter_bin_reports
WHERE status = 'ACTION_REQUIRED'
ORDER BY updated_at DESC
LIMIT 10;

-- 3. Verify ownership transfer is complete
-- This should return 0 rows (no ACTION_REQUIRED reports owned by QC)
SELECT 
    id, 
    status, 
    current_owner_role, 
    action_officer_id
FROM litter_bin_reports
WHERE status = 'ACTION_REQUIRED' 
  AND current_owner_role = 'QC';

-- 4. Verify Action Officer assignment
-- This should show all ACTION_REQUIRED reports with valid action_officer_id
SELECT 
    r.id, 
    r.status, 
    r.current_owner_role, 
    r.action_officer_id,
    u.name as action_officer_name,
    u.email as action_officer_email,
    b.zone_id,
    b.ward_id
FROM litter_bin_reports r
LEFT JOIN users u ON r.action_officer_id = u.id
LEFT JOIN litter_bins b ON r.bin_id = b.id
WHERE r.status = 'ACTION_REQUIRED'
ORDER BY r.updated_at DESC;

-- 5. Count reports by ownership
-- Useful for dashboard verification
SELECT 
    current_owner_role,
    status,
    COUNT(*) as count
FROM litter_bin_reports
GROUP BY current_owner_role, status
ORDER BY current_owner_role, status;

-- 6. Verify Action Officer can see their assigned reports
-- Replace <action_officer_user_id> with actual user ID
SELECT 
    id, 
    status, 
    current_owner_role, 
    action_officer_id,
    created_at
FROM litter_bin_reports
WHERE current_owner_role = 'ACTION_OFFICER'
  AND action_officer_id = '<action_officer_user_id>'
ORDER BY created_at DESC;
