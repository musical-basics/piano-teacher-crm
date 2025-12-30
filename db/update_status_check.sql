-- Run this in your Supabase SQL Editor to allow the new status values

-- 1. Drop the existing check constraint
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_status_check;

-- 2. Add the new check constraint with expanded values
ALTER TABLE students 
ADD CONSTRAINT students_status_check 
CHECK (status IN ('Lead', 'Discussion', 'Trial', 'Active', 'Inactive', 'new', 'active', 'archived')); 
-- Note: We keep the old values ('new', 'active', 'archived') temporarily to avoid breaking existing rows, 
-- but we will migrate them below.

-- 3. Migrate existing data to new statuses
-- 'new' -> 'Lead'
-- 'active' -> 'Active'
-- 'archived' -> 'Inactive'
UPDATE students SET status = 'Lead' WHERE status = 'new';
UPDATE students SET status = 'Active' WHERE status = 'active';
UPDATE students SET status = 'Inactive' WHERE status = 'archived';

-- 4. Optional: Clean up the constraint to strictly enforce ONLY the new values
-- Only run this if you are sure all data has been migrated successfully above.
/*
ALTER TABLE students DROP CONSTRAINT students_status_check;
ALTER TABLE students 
ADD CONSTRAINT students_status_check 
CHECK (status IN ('Lead', 'Discussion', 'Trial', 'Active', 'Inactive'));
*/
