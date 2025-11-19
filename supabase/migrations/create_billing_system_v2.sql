-- Migration: Create Billing System Tables (Safe Version)
-- Description: Creates tables for bills, bill items, and payments
-- This version is safe to run multiple times

-- =====================================================
-- 1. DROP EXISTING TABLES (if you want a fresh start)
-- =====================================================
-- Uncomment these lines ONLY if you want to delete existing data and start fresh

/*
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP FUNCTION IF EXISTS update_bills_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_bill_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_payments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_item_amount() CASCADE;
DROP FUNCTION IF EXISTS generate_bill_number() CASCADE;
*/

-- =====================================================
-- 2. CREATE BILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    bill_type VARCHAR(50) NOT NULL DEFAULT 'Room',
    bill_number VARCHAR(100),

    -- Financial fields
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Status and metadata
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_bill_type CHECK (bill_type IN (
        'Room', 'Food', 'Spa', 'Conference', 'Laundry', 'Bar',
        'KOT', 'BOT', 'Extra Bed', 'Other Sales', 'Cancellation Charges'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IN ('Pending', 'Partial', 'Paid', 'Refunded')),
    CONSTRAINT valid_amounts CHECK (
        subtotal >= 0 AND tax >= 0 AND discount >= 0 AND
        total >= 0 AND paid_amount >= 0 AND balance >= 0
    )
);

-- Add unique constraint on bill_number separately (in case table already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'bills_bill_number_key'
    ) THEN
        ALTER TABLE bills ADD CONSTRAINT bills_bill_number_key UNIQUE (bill_number);
    END IF;
END $$;

-- =====================================================
-- 3. CREATE BILL ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bill_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

    -- Item details
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,

    -- Optional metadata
    item_date DATE,
    item_type VARCHAR(100),
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_item_amounts CHECK (
        quantity > 0 AND rate >= 0 AND amount >= 0
    )
);

-- =====================================================
-- 4. CREATE PAYMENTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Transaction details
    transaction_id VARCHAR(200),
    reference_number VARCHAR(200),
    notes TEXT,

    -- Payment method specific fields
    card_last_four VARCHAR(4),
    card_type VARCHAR(50),
    upi_id VARCHAR(100),
    cheque_number VARCHAR(100),
    cheque_date DATE,
    bank_name VARCHAR(200),

    -- Status
    status VARCHAR(20) DEFAULT 'Completed',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_payment_method CHECK (payment_method IN (
        'Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other'
    )),
    CONSTRAINT valid_payment_status CHECK (status IN (
        'Pending', 'Completed', 'Failed', 'Refunded', 'Cancelled'
    )),
    CONSTRAINT valid_payment_amount CHECK (amount > 0)
);

-- =====================================================
-- 5. CREATE INDEXES
-- =====================================================

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_reservation ON bills(reservation_id);
CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at DESC);

-- Bill items indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_created ON bill_items(created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =====================================================
-- 6. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Updated_at trigger for bills
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bills_updated_at ON bills;
CREATE TRIGGER trigger_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_updated_at();

-- Updated_at trigger for bill_items
CREATE OR REPLACE FUNCTION update_bill_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bill_items_updated_at ON bill_items;
CREATE TRIGGER trigger_bill_items_updated_at
    BEFORE UPDATE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_items_updated_at();

-- Updated_at trigger for payments
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON payments;
CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- Auto-calculate bill item amount
CREATE OR REPLACE FUNCTION calculate_bill_item_amount()
RETURNS TRIGGER AS $$
BEGIN
    NEW.amount = NEW.quantity * NEW.rate;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_bill_item_amount ON bill_items;
CREATE TRIGGER trigger_calculate_bill_item_amount
    BEFORE INSERT OR UPDATE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bill_item_amount();

-- Auto-generate bill numbers
CREATE OR REPLACE FUNCTION generate_bill_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_month VARCHAR(6);
BEGIN
    IF NEW.bill_number IS NULL THEN
        year_month := TO_CHAR(NOW(), 'YYYYMM');

        SELECT COALESCE(MAX(
            CASE
                WHEN bill_number ~ '^BILL-[0-9]{6}-[0-9]+$'
                THEN CAST(SUBSTRING(bill_number FROM '[0-9]+$') AS INTEGER)
                ELSE 0
            END
        ), 0) + 1
        INTO next_number
        FROM bills
        WHERE bill_number LIKE 'BILL-' || year_month || '%';

        NEW.bill_number := 'BILL-' || year_month || '-' || LPAD(next_number::TEXT, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_bill_number ON bills;
CREATE TRIGGER trigger_generate_bill_number
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- =====================================================
-- 7. GRANT PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT ALL ON bills TO authenticated;
GRANT ALL ON bill_items TO authenticated;
GRANT ALL ON payments TO authenticated;

-- Grant permissions to anon users (read-only, adjust as needed)
GRANT SELECT ON bills TO anon;
GRANT SELECT ON bill_items TO anon;
GRANT SELECT ON payments TO anon;

-- =====================================================
-- 8. VERIFICATION
-- =====================================================

-- Display success message and show tables
DO $$
DECLARE
    bills_exists BOOLEAN;
    bill_items_exists BOOLEAN;
    payments_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bills') INTO bills_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bill_items') INTO bill_items_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') INTO payments_exists;

    IF bills_exists AND bill_items_exists AND payments_exists THEN
        RAISE NOTICE '✓ SUCCESS: All billing tables created successfully!';
        RAISE NOTICE '  - bills table: %', bills_exists;
        RAISE NOTICE '  - bill_items table: %', bill_items_exists;
        RAISE NOTICE '  - payments table: %', payments_exists;
    ELSE
        RAISE WARNING 'Some tables may be missing. Please check manually.';
    END IF;
END $$;

-- Show table structures
SELECT
    'TABLES CREATED' as status,
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE columns.table_name = tables.table_name) as column_count
FROM information_schema.tables
WHERE table_name IN ('bills', 'bill_items', 'payments')
ORDER BY table_name;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
