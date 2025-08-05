USE paydash;
SELECT COUNT(*) FROM batch_objects;
SELECT object_id, status, outcome FROM batch_objects LIMIT 3;
SELECT COUNT(*) FROM audit_entries;