-- Migration: Enhanced Folio Transaction System
-- Description: Create a unified transaction table to handle all folio operations including
--              charges, payments, discounts, refunds, adjustments, reversals, and deposits
-- Date: 2025-11-20

-- Drop existing tables if you want to start fresh (CAREFUL: This will delete data!)
-- Uncomment if you want to replace existing system
-- DROP TABLE IF EXISTS folio_transactions CASCADE;

-- Create transaction types enum
DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'room_charge',
        'service_charge',
        'tax',
        'fee',
        'discount',
        'payment_cash',
        'payment_card',
        'payment_online',
        'payment_bank_transfer',
        'payment_other',
        'refund',
        'adjustment',
        'write_off',
        'reversal',
        'void',
        'deposit',
        'deposit_usage'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create transaction status enum
DO $$ BEGIN
    CREATE TYPE transaction_status AS ENUM (
        'posted',
        'pending',
        'reversed',
        'voided',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create service category enum for service charges
DO $$ BEGIN
    CREATE TYPE service_category AS ENUM (
        'food',
        'beverage',
        'minibar',
        'spa',
        'laundry',
        'room_service',
        'telephone',
        'internet',
        'parking',
        'conference',
        'extra_bed',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create folio_transactions table
CREATE TABLE IF NOT EXISTS folio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction metadata
    transaction_type transaction_type NOT NULL,
    transaction_status transaction_status NOT NULL DEFAULT 'posted',
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Relationships
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Transaction details
    amount DECIMAL(10, 2) NOT NULL, -- Positive for charges/debits, negative for payments/credits
    quantity DECIMAL(10, 3) DEFAULT 1,
    rate DECIMAL(10, 2) NULL, -- Unit rate (for charges)
    description TEXT NOT NULL,

    -- Service charge specific
    service_category service_category NULL, -- Only for service_charge type

    -- Payment specific fields
    payment_method TEXT NULL, -- Cash, Card, UPI, etc. (for payment types)
    card_last_four VARCHAR(4) NULL, -- Last 4 digits of card
    payment_reference VARCHAR(100) NULL, -- Transaction ID, cheque number, etc.

    -- Tax specific fields
    tax_rate DECIMAL(5, 2) NULL, -- Tax percentage (e.g., 18.00 for 18%)
    tax_name VARCHAR(50) NULL, -- GST, VAT, Service Charge, etc.

    -- Discount specific fields
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
    discount_type VARCHAR(50) NULL, -- percentage, fixed, promotional, etc.
    original_amount DECIMAL(10, 2) NULL, -- Amount before discount

    -- Reference tracking
    reference_number VARCHAR(100) NULL, -- External reference (invoice #, receipt #, etc.)
    internal_reference VARCHAR(100) NULL, -- Internal tracking number

    -- Reversal/Void tracking
    reversed_transaction_id UUID REFERENCES folio_transactions(id) ON DELETE SET NULL,
    reversal_reason TEXT NULL,

    -- Additional metadata
    notes TEXT NULL,
    metadata JSONB NULL, -- Flexible field for additional data

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT positive_quantity CHECK (quantity > 0),
    CONSTRAINT valid_service_category CHECK (
        (transaction_type = 'service_charge' AND service_category IS NOT NULL) OR
        (transaction_type != 'service_charge' AND service_category IS NULL)
    ),
    CONSTRAINT valid_payment_method CHECK (
        (transaction_type LIKE 'payment_%' AND payment_method IS NOT NULL) OR
        (transaction_type NOT LIKE 'payment_%' AND payment_method IS NULL)
    ),
    CONSTRAINT valid_reversal CHECK (
        (transaction_type IN ('reversal', 'void') AND reversed_transaction_id IS NOT NULL) OR
        (transaction_type NOT IN ('reversal', 'void'))
    )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_folio_transactions_reservation_id ON folio_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_bill_id ON folio_transactions(bill_id);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_type ON folio_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_status ON folio_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_date ON folio_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_created_by ON folio_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_folio_transactions_reversed ON folio_transactions(reversed_transaction_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_folio_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_folio_transactions_updated_at_trigger ON folio_transactions;
CREATE TRIGGER update_folio_transactions_updated_at_trigger
    BEFORE UPDATE ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_folio_transactions_updated_at();

-- Create view for transaction summary by reservation
CREATE OR REPLACE VIEW v_reservation_transaction_summary AS
SELECT
    reservation_id,
    -- Total charges (debits)
    SUM(CASE
        WHEN transaction_type IN ('room_charge', 'service_charge', 'tax', 'fee')
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END) as total_charges,

    -- Total payments (credits - stored as negative amounts)
    ABS(SUM(CASE
        WHEN transaction_type LIKE 'payment_%'
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END)) as total_payments,

    -- Total discounts (stored as negative amounts)
    ABS(SUM(CASE
        WHEN transaction_type = 'discount'
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END)) as total_discounts,

    -- Total refunds (stored as negative amounts)
    ABS(SUM(CASE
        WHEN transaction_type = 'refund'
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END)) as total_refunds,

    -- Total adjustments (can be positive or negative)
    SUM(CASE
        WHEN transaction_type IN ('adjustment', 'write_off')
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END) as total_adjustments,

    -- Total deposits (stored as negative amounts initially)
    ABS(SUM(CASE
        WHEN transaction_type = 'deposit'
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END)) as total_deposits,

    -- Total deposit usage (positive amounts when used)
    SUM(CASE
        WHEN transaction_type = 'deposit_usage'
        AND transaction_status = 'posted'
        THEN amount
        ELSE 0
    END) as total_deposit_usage,

    -- Net balance (positive = guest owes, negative = hotel owes)
    SUM(CASE
        WHEN transaction_status = 'posted'
        THEN amount
        ELSE 0
    END) as net_balance,

    -- Transaction counts
    COUNT(*) FILTER (WHERE transaction_status = 'posted') as total_posted_transactions,
    COUNT(*) FILTER (WHERE transaction_status = 'pending') as total_pending_transactions,
    COUNT(*) FILTER (WHERE transaction_status = 'reversed') as total_reversed_transactions,

    -- Last transaction date
    MAX(transaction_date) as last_transaction_date
FROM folio_transactions
GROUP BY reservation_id;

-- Create view for detailed transaction history
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT
    ft.id,
    ft.transaction_type,
    ft.transaction_status,
    ft.transaction_date,
    ft.reservation_id,
    r.confirmation_number as reservation_number,
    g.name as guest_name,
    rm.room_number,
    ft.amount,
    ft.quantity,
    ft.rate,
    ft.description,
    ft.service_category,
    ft.payment_method,
    ft.reference_number,
    ft.notes,
    u.name as created_by_name,
    ft.created_at,
    -- Reversal info
    ft.reversed_transaction_id,
    ft.reversal_reason,
    reversed.transaction_type as reversed_transaction_type,
    reversed.amount as reversed_amount
FROM folio_transactions ft
LEFT JOIN reservations r ON ft.reservation_id = r.id
LEFT JOIN guests g ON r.guest_id = g.id
LEFT JOIN rooms rm ON r.room_id = rm.id
LEFT JOIN users u ON ft.created_by = u.id
LEFT JOIN folio_transactions reversed ON ft.reversed_transaction_id = reversed.id
ORDER BY ft.transaction_date DESC;

-- Function to reverse a transaction
CREATE OR REPLACE FUNCTION reverse_transaction(
    p_transaction_id UUID,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_original_transaction folio_transactions%ROWTYPE;
    v_reversal_id UUID;
BEGIN
    -- Get the original transaction
    SELECT * INTO v_original_transaction
    FROM folio_transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
    END IF;

    -- Check if already reversed
    IF v_original_transaction.transaction_status = 'reversed' THEN
        RAISE EXCEPTION 'Transaction already reversed';
    END IF;

    -- Create reversal transaction (opposite amount)
    INSERT INTO folio_transactions (
        transaction_type,
        transaction_status,
        reservation_id,
        bill_id,
        created_by,
        amount,
        quantity,
        rate,
        description,
        reversed_transaction_id,
        reversal_reason
    ) VALUES (
        'reversal',
        'posted',
        v_original_transaction.reservation_id,
        v_original_transaction.bill_id,
        p_user_id,
        -v_original_transaction.amount, -- Opposite amount
        v_original_transaction.quantity,
        v_original_transaction.rate,
        'Reversal: ' || v_original_transaction.description,
        p_transaction_id,
        p_reason
    ) RETURNING id INTO v_reversal_id;

    -- Mark original as reversed
    UPDATE folio_transactions
    SET transaction_status = 'reversed'
    WHERE id = p_transaction_id;

    RETURN v_reversal_id;
END;
$$ LANGUAGE plpgsql;

-- Function to void a transaction
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaction_id UUID,
    p_reason TEXT,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update transaction status to voided
    UPDATE folio_transactions
    SET
        transaction_status = 'voided',
        reversal_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_transaction_id
    AND transaction_status = 'pending'; -- Can only void pending transactions

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Cannot void transaction. Transaction must be in pending status.';
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate reservation balance
CREATE OR REPLACE FUNCTION get_reservation_balance(p_reservation_id UUID)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_balance DECIMAL(10, 2);
BEGIN
    SELECT COALESCE(SUM(
        CASE
            WHEN transaction_status = 'posted' THEN amount
            ELSE 0
        END
    ), 0)
    INTO v_balance
    FROM folio_transactions
    WHERE reservation_id = p_reservation_id;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE folio_transactions IS 'Unified transaction table for all folio operations including charges, payments, discounts, refunds, and adjustments';
COMMENT ON COLUMN folio_transactions.amount IS 'Transaction amount. Positive for charges/debits (room, services, taxes), negative for credits (payments, discounts, refunds)';
COMMENT ON COLUMN folio_transactions.transaction_type IS 'Type of transaction: room_charge, service_charge, tax, fee, discount, payment_*, refund, adjustment, write_off, reversal, void, deposit, deposit_usage';
COMMENT ON COLUMN folio_transactions.transaction_status IS 'Current status: posted, pending, reversed, voided, cancelled';
COMMENT ON COLUMN folio_transactions.reversed_transaction_id IS 'References the original transaction that this reversal/void is reversing';

-- Grant permissions (adjust based on your RLS policies)
-- ALTER TABLE folio_transactions ENABLE ROW LEVEL SECURITY;

-- Migration complete
SELECT 'Folio transactions system created successfully!' as message;
