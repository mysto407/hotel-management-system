-- Migration: Add support for multiple guests per reservation
-- This migration adds an additional_guest_ids field to store multiple guest IDs per reservation

-- Add additional_guest_ids column to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS additional_guest_ids JSONB DEFAULT '[]'::jsonb;

-- Add a comment to the column
COMMENT ON COLUMN reservations.additional_guest_ids IS 'Array of guest IDs for additional guests in this reservation (beyond the primary guest)';

-- Create an index for better query performance when searching by additional guest IDs
CREATE INDEX IF NOT EXISTS idx_reservations_additional_guest_ids
ON reservations USING GIN (additional_guest_ids);

-- Example query to find all reservations that include a specific guest (either as primary or additional):
-- SELECT * FROM reservations
-- WHERE guest_id = 'guest-uuid-here'
-- OR additional_guest_ids @> '["guest-uuid-here"]'::jsonb;
