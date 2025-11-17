-- Migration: Add value_type column to discounts table
-- Description: Separates discount category from value type (percentage vs fixed amount)
-- This allows all discount categories to support both percentage and fixed amount discounts

-- Add value_type column
ALTER TABLE discounts
ADD COLUMN IF NOT EXISTS value_type VARCHAR(50);

-- Migrate existing data: Set value_type based on current discount_type
UPDATE discounts
SET value_type = CASE
    WHEN discount_type = 'percentage' THEN 'percentage'
    WHEN discount_type = 'fixed_amount' THEN 'fixed_amount'
    -- For other types, infer from value (old logic)
    WHEN value <= 100 THEN 'percentage'
    ELSE 'fixed_amount'
END
WHERE value_type IS NULL;

-- Update discount_type for old 'percentage' and 'fixed_amount' types to 'manual'
UPDATE discounts
SET discount_type = 'manual'
WHERE discount_type IN ('percentage', 'fixed_amount');

-- Set default value for value_type
ALTER TABLE discounts
ALTER COLUMN value_type SET DEFAULT 'percentage';

-- Make value_type NOT NULL after data migration
ALTER TABLE discounts
ALTER COLUMN value_type SET NOT NULL;

-- Drop old constraints
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS valid_discount_type;
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS valid_percentage;
ALTER TABLE discounts DROP CONSTRAINT IF EXISTS valid_fixed_amount;

-- Add new constraints
ALTER TABLE discounts
ADD CONSTRAINT valid_discount_type CHECK (
    discount_type IN ('manual', 'promo_code', 'seasonal', 'long_stay', 'early_bird', 'last_minute')
);

ALTER TABLE discounts
ADD CONSTRAINT valid_value_type CHECK (
    value_type IN ('percentage', 'fixed_amount')
);

ALTER TABLE discounts
ADD CONSTRAINT valid_percentage_value CHECK (
    (value_type = 'percentage' AND value >= 0 AND value <= 100) OR
    value_type != 'percentage'
);

ALTER TABLE discounts
ADD CONSTRAINT valid_fixed_amount_value CHECK (
    (value_type = 'fixed_amount' AND value >= 0) OR
    value_type != 'fixed_amount'
);

-- Create index on value_type for better performance
CREATE INDEX IF NOT EXISTS idx_discounts_value_type ON discounts(value_type);

-- Update sample WELCOME2025 discount
UPDATE discounts
SET discount_type = 'promo_code',
    value_type = 'fixed_amount',
    value = 12.00
WHERE promo_code = 'WELCOME2025';

-- Add comment
COMMENT ON COLUMN discounts.value_type IS 'Type of discount value: percentage or fixed_amount';
COMMENT ON COLUMN discounts.discount_type IS 'Category of discount: manual, promo_code, seasonal, long_stay, early_bird, last_minute';
