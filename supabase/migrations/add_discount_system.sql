-- Migration: Add Discount System
-- Description: Creates tables for managing discounts and tracking discount applications

-- Create discounts table
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) NOT NULL, -- 'percentage', 'fixed_amount', 'promo_code', 'seasonal', 'long_stay'
    value DECIMAL(10, 2) NOT NULL, -- percentage (0-100) or fixed amount
    applies_to VARCHAR(50) NOT NULL DEFAULT 'room_rates', -- 'room_rates', 'addons', 'total_bill'
    enabled BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_to DATE,
    applicable_room_types JSONB DEFAULT '[]'::jsonb, -- Array of room_type IDs
    promo_code VARCHAR(50) UNIQUE, -- Only for promo_code type
    minimum_nights INTEGER DEFAULT 0, -- For long_stay discounts
    maximum_uses INTEGER, -- NULL for unlimited
    current_uses INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0, -- Higher priority applied first
    can_combine BOOLEAN DEFAULT false, -- Can be combined with other discounts
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_discount_type CHECK (discount_type IN ('percentage', 'fixed_amount', 'promo_code', 'seasonal', 'long_stay')),
    CONSTRAINT valid_applies_to CHECK (applies_to IN ('room_rates', 'addons', 'total_bill')),
    CONSTRAINT valid_percentage CHECK (
        (discount_type = 'percentage' AND value >= 0 AND value <= 100) OR
        discount_type != 'percentage'
    ),
    CONSTRAINT valid_fixed_amount CHECK (
        (discount_type = 'fixed_amount' AND value >= 0) OR
        discount_type != 'fixed_amount'
    )
);

-- Create discount_applications table to track applied discounts
CREATE TABLE IF NOT EXISTS discount_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_discounts_enabled ON discounts(enabled);
CREATE INDEX idx_discounts_type ON discounts(discount_type);
CREATE INDEX idx_discounts_promo_code ON discounts(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX idx_discounts_validity ON discounts(valid_from, valid_to);
CREATE INDEX idx_discount_applications_reservation ON discount_applications(reservation_id);
CREATE INDEX idx_discount_applications_bill ON discount_applications(bill_id);
CREATE INDEX idx_discount_applications_discount ON discount_applications(discount_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_discounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_discounts_updated_at
    BEFORE UPDATE ON discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_discounts_updated_at();

-- Create function to increment discount usage
CREATE OR REPLACE FUNCTION increment_discount_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE discounts
    SET current_uses = current_uses + 1
    WHERE id = NEW.discount_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-increment usage
CREATE TRIGGER trigger_increment_discount_usage
    AFTER INSERT ON discount_applications
    FOR EACH ROW
    EXECUTE FUNCTION increment_discount_usage();

-- Insert some sample discounts
INSERT INTO discounts (name, description, discount_type, value, applies_to, enabled, valid_from, valid_to, minimum_nights, priority, can_combine) VALUES
('Early Bird - 10% Off', 'Book 30 days in advance and get 10% off your stay', 'percentage', 10.00, 'room_rates', true, '2025-01-01', '2025-12-31', 0, 1, true),
('Weekend Special', 'Flat ₹500 off on weekend stays', 'fixed_amount', 500.00, 'room_rates', true, '2025-01-01', '2025-12-31', 0, 2, true),
('Long Stay Discount', '15% off for stays of 7 nights or more', 'percentage', 15.00, 'room_rates', true, '2025-01-01', '2025-12-31', 7, 3, false),
('Seasonal Summer Sale', '20% off all room types during summer', 'seasonal', 20.00, 'room_rates', true, '2025-05-01', '2025-08-31', 0, 2, false),
('WELCOME2025', 'Promo code for new guests - 12% off', 'promo_code', 12.00, 'total_bill', true, '2025-01-01', '2025-03-31', 0, 4, true);

UPDATE discounts SET promo_code = 'WELCOME2025' WHERE name = 'WELCOME2025';

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE discount_applications ENABLE ROW LEVEL SECURITY;

-- Add comment to tables
COMMENT ON TABLE discounts IS 'Stores discount configurations for hotel bookings';
COMMENT ON TABLE discount_applications IS 'Tracks which discounts have been applied to reservations and bills';
