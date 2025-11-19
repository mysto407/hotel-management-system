-- Migration: Create Billing System Tables
-- Description: Creates tables for bills, bill items, and payments to support the folio functionality

-- =====================================================
-- 1. BILLS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    bill_type VARCHAR(50) NOT NULL DEFAULT 'Room',
    bill_number VARCHAR(100) UNIQUE,

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
        subtotal >= 0 AND
        tax >= 0 AND
        discount >= 0 AND
        total >= 0 AND
        paid_amount >= 0 AND
        balance >= 0
    )
);

-- =====================================================
-- 2. BILL ITEMS TABLE (Line Items)
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
        quantity > 0 AND
        rate >= 0 AND
        amount >= 0
    )
);

-- =====================================================
-- 3. PAYMENTS TABLE
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
-- 4. INDEXES for Performance
-- =====================================================

-- Bills indexes
CREATE INDEX IF NOT EXISTS idx_bills_reservation ON bills(reservation_id);
CREATE INDEX IF NOT EXISTS idx_bills_type ON bills(bill_type);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(payment_status);
CREATE INDEX IF NOT EXISTS idx_bills_created ON bills(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number) WHERE bill_number IS NOT NULL;

-- Bill items indexes
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_items_created ON bill_items(created_at);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments(payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =====================================================
-- 5. TRIGGERS for Auto-updating timestamps
-- =====================================================

-- Bills updated_at trigger
CREATE OR REPLACE FUNCTION update_bills_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bills_updated_at
    BEFORE UPDATE ON bills
    FOR EACH ROW
    EXECUTE FUNCTION update_bills_updated_at();

-- Bill items updated_at trigger
CREATE OR REPLACE FUNCTION update_bill_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_bill_items_updated_at
    BEFORE UPDATE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_items_updated_at();

-- Payments updated_at trigger
CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_payments_updated_at();

-- =====================================================
-- 6. TRIGGER to Auto-calculate bill item amounts
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_bill_item_amount()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-calculate amount from quantity * rate
    NEW.amount = NEW.quantity * NEW.rate;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_bill_item_amount
    BEFORE INSERT OR UPDATE ON bill_items
    FOR EACH ROW
    EXECUTE FUNCTION calculate_bill_item_amount();

-- =====================================================
-- 7. TRIGGER to Auto-generate bill numbers
-- =====================================================
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

CREATE TRIGGER trigger_generate_bill_number
    BEFORE INSERT ON bills
    FOR EACH ROW
    EXECUTE FUNCTION generate_bill_number();

-- =====================================================
-- 8. COMMENTS for Documentation
-- =====================================================
COMMENT ON TABLE bills IS 'Stores billing information for reservations';
COMMENT ON TABLE bill_items IS 'Stores individual line items/charges for each bill';
COMMENT ON TABLE payments IS 'Records all payments made against bills';

COMMENT ON COLUMN bills.bill_type IS 'Type of bill: Room, Food, Spa, etc.';
COMMENT ON COLUMN bills.payment_status IS 'Payment status: Pending, Partial, Paid, Refunded';
COMMENT ON COLUMN bills.bill_number IS 'Auto-generated unique bill number';

COMMENT ON COLUMN bill_items.amount IS 'Auto-calculated as quantity * rate';
COMMENT ON COLUMN payments.payment_method IS 'Payment method: Cash, Card, UPI, Bank Transfer, Cheque, Other';

-- =====================================================
-- 9. ROW LEVEL SECURITY (Optional - Uncomment if needed)
-- =====================================================
-- ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example RLS policies (adjust based on your auth setup):
-- CREATE POLICY "Users can view their organization's bills"
--     ON bills FOR SELECT
--     USING (auth.uid() IN (SELECT id FROM users WHERE organization_id = bills.organization_id));

-- =====================================================
-- 10. SAMPLE DATA (Optional - for testing)
-- =====================================================
-- Uncomment below to insert sample data

/*
-- Sample bill (requires existing reservation)
INSERT INTO bills (reservation_id, bill_type, subtotal, tax, total, balance, payment_status, notes)
VALUES (
    'YOUR-RESERVATION-ID-HERE',
    'Room',
    10000.00,
    1800.00,
    11800.00,
    11800.00,
    'Pending',
    'Room charges for 5 nights'
);

-- Sample bill items
INSERT INTO bill_items (bill_id, description, quantity, rate)
VALUES
    ('YOUR-BILL-ID-HERE', 'Deluxe Room - Night 1', 1, 2000.00),
    ('YOUR-BILL-ID-HERE', 'Deluxe Room - Night 2', 1, 2000.00),
    ('YOUR-BILL-ID-HERE', 'Deluxe Room - Night 3', 1, 2000.00),
    ('YOUR-BILL-ID-HERE', 'Deluxe Room - Night 4', 1, 2000.00),
    ('YOUR-BILL-ID-HERE', 'Deluxe Room - Night 5', 1, 2000.00);

-- Sample payment
INSERT INTO payments (bill_id, amount, payment_method, notes)
VALUES (
    'YOUR-BILL-ID-HERE',
    5000.00,
    'Cash',
    'Advance payment at check-in'
);
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================
