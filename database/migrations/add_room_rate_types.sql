-- Migration: Add Room Rate Types System
-- Description: Adds support for multiple rate plans per room type (Standard, Non-Refundable, Corporate, etc.)

-- Create room_rate_types table
CREATE TABLE IF NOT EXISTS room_rate_types (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
    rate_name TEXT NOT NULL,
    rate_code TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    inclusions TEXT,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    cancellation_policy TEXT,
    advance_booking_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure rate code is unique per room type
    UNIQUE(room_type_id, rate_code)
);

-- Add index for better query performance
CREATE INDEX idx_room_rate_types_room_type_id ON room_rate_types(room_type_id);
CREATE INDEX idx_room_rate_types_is_active ON room_rate_types(is_active);
CREATE INDEX idx_room_rate_types_valid_dates ON room_rate_types(valid_from, valid_to);

-- Add rate_type_id to reservations table
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS rate_type_id UUID REFERENCES room_rate_types(id) ON DELETE SET NULL;

-- Add index for reservations.rate_type_id
CREATE INDEX IF NOT EXISTS idx_reservations_rate_type_id ON reservations(rate_type_id);

-- Create a function to automatically set updated_at
CREATE OR REPLACE FUNCTION update_room_rate_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_room_rate_types_updated_at
    BEFORE UPDATE ON room_rate_types
    FOR EACH ROW
    EXECUTE FUNCTION update_room_rate_types_updated_at();

-- Migrate existing room types to have a default rate type
-- This creates a "Standard Rate" for each existing room type using their base_price
INSERT INTO room_rate_types (room_type_id, rate_name, rate_code, base_price, is_default, description, is_active)
SELECT
    id,
    'Standard Rate',
    'STD',
    base_price,
    true,
    'Standard rack rate with full flexibility',
    true
FROM room_types
ON CONFLICT (room_type_id, rate_code) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE room_rate_types IS 'Stores different rate plans for each room type (Standard, Non-Refundable, Corporate, Seasonal, etc.)';
