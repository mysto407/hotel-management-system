-- Fix: Add missing bill_number column and recreate billing tables if needed
-- Run this if you got the "column bill_number does not exist" error

-- =====================================================
-- OPTION 1: Add missing column to existing bills table
-- =====================================================
-- If bills table already exists but is missing bill_number column:

DO $$
BEGIN
    -- Add bill_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bills' AND column_name = 'bill_number'
    ) THEN
        ALTER TABLE bills ADD COLUMN bill_number VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- =====================================================
-- OPTION 2: Drop and recreate all tables (DESTRUCTIVE!)
-- =====================================================
-- Uncomment below ONLY if you want to start fresh (will delete all data!)

/*
-- Drop existing tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Drop triggers and functions
DROP TRIGGER IF EXISTS trigger_bills_updated_at ON bills CASCADE;
DROP TRIGGER IF EXISTS trigger_bill_items_updated_at ON bill_items CASCADE;
DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments CASCADE;
DROP TRIGGER IF EXISTS trigger_calculate_bill_item_amount ON bill_items CASCADE;
DROP TRIGGER IF EXISTS trigger_generate_bill_number ON bills CASCADE;

DROP FUNCTION IF EXISTS update_bills_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_bill_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_payments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_item_amount() CASCADE;
DROP FUNCTION IF EXISTS generate_bill_number() CASCADE;

-- Then run the full create_billing_system.sql script again
*/

-- =====================================================
-- After adding the column, create the missing indexes
-- =====================================================

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_reservation ON bills(reservation_id);
CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number) WHERE bill_number IS NOT NULL;

-- Bill items indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_items') THEN
        CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
        CREATE INDEX IF NOT EXISTS idx_bill_items_created ON bill_items(created_at);
    END IF;
END $$;

-- Payments indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
        CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
        CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
        CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
        CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    END IF;
END $$;

-- =====================================================
-- Add the bill number generation trigger
-- =====================================================

-- Create or replace the function
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_month VARCHAR(6);
BEGIN
    IF NEW.bill_number IS NULL THEN
        -- Get current year and month (format: YYYYMM)
        year_month := TO_CHAR(NOW(), 'YYYYMM');

        -- Get the next sequential number for this month
        SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 8) AS INTEGER)), 0) + 1
        INTO next_number
        FROM bills
        WHERE bill_number LIKE 'BILL-' || year_month || '%';

        -- Generate bill number: BILL-YYYYMM-0001
        NEW.bill_number := 'BILL-' || year_month || '-' || LPAD(next_number::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_generate_bill_number ON bills;
CREATE TRIGGER trigger_generate_bill_number
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- =====================================================
-- Verify the fix
-- =====================================================

-- Check if bill_number column exists now
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'bills' AND column_name = 'bill_number'
    ) THEN
        RAISE NOTICE 'SUCCESS: bill_number column exists in bills table';
    ELSE
        RAISE EXCEPTION 'ERROR: bill_number column still missing';
    END IF;
END $$;

-- Show current table structure
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('bills', 'bill_items', 'payments')
ORDER BY table_name, ordinal_position;
