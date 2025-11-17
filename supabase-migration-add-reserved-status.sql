-- Migration: Add 'Reserved' status to rooms table
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing check constraint
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_status_check;

-- Step 2: Add new check constraint with 'Reserved' included
ALTER TABLE rooms ADD CONSTRAINT rooms_status_check
  CHECK (status IN ('Available', 'Reserved', 'Occupied', 'Maintenance', 'Blocked'));

-- Verify the constraint was added
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'rooms_status_check';
