-- Quick diagnostic query to check ACTION_REQUIRED reports
-- Run this to see what's in the database

SELECT 
    r.id,
    r.status,
    r.current_owner_role,
    r.action_officer_id,
    r.reviewed_by_qc_id,
    r.created_at,
    r.updated_at,
    b.zone_id,
    b.ward_id,
    b.area_name
FROM litter_bin_reports r
LEFT JOIN litter_bins b ON r.bin_id = b.id
WHERE r.status = 'ACTION_REQUIRED'
ORDER BY r.updated_at DESC;
