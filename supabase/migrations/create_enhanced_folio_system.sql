-- =====================================================
-- Enhanced Folio System Migration
-- Description: Comprehensive folio management with multi-folio support,
--              unified transactions, audit trail, and advanced features
-- =====================================================

-- =====================================================
-- 1. CREATE FOLIOS TABLE
-- =====================================================
-- Supports multiple folios per reservation (room-level, guest-level)
CREATE TABLE IF NOT EXISTS folios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    folio_number VARCHAR(100) UNIQUE,
    folio_type VARCHAR(50) NOT NULL DEFAULT 'master', -- 'master', 'room', 'guest'
    folio_name VARCHAR(255), -- e.g., "Room 101", "John Doe Personal"

    -- Foreign keys for room-level or guest-level folios
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,

    -- Status and settlement
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'closed', 'settled'
    settled_at TIMESTAMP WITH TIME ZONE,
    settled_by UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Financial summary (calculated from transactions)
    total_charges DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_payments DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_taxes DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_discounts DECIMAL(12, 2) NOT NULL DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_folio_type CHECK (folio_type IN ('master', 'room', 'guest')),
    CONSTRAINT valid_folio_status CHECK (status IN ('open', 'closed', 'settled')),
    CONSTRAINT valid_balance CHECK (total_charges >= 0 AND total_payments >= 0)
);

-- =====================================================
-- 2. CREATE FOLIO_TRANSACTIONS TABLE
-- =====================================================
-- Unified ledger for all transaction types
CREATE TABLE IF NOT EXISTS folio_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    -- Transaction identification
    transaction_number VARCHAR(100) UNIQUE,
    transaction_type VARCHAR(50) NOT NULL,
    -- Types: 'room_charge', 'addon_charge', 'tax', 'fee', 'discount',
    --        'payment', 'refund', 'adjustment', 'reversal', 'deposit', 'deposit_usage'

    -- Transaction details
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    rate DECIMAL(12, 2),

    -- Transaction categorization
    category VARCHAR(100), -- 'room', 'food', 'spa', 'minibar', etc.
    sub_category VARCHAR(100),
    tags TEXT[], -- Array of tags for flexible categorization

    -- Status and posting
    status VARCHAR(50) NOT NULL DEFAULT 'posted',
    -- 'pending', 'posted', 'voided', 'reversed', 'in_dispute', 'settled'

    post_date DATE NOT NULL DEFAULT CURRENT_DATE,
    posting_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Reference and linking
    reference_number VARCHAR(200), -- External reference (invoice, receipt, etc.)
    reference_document_type VARCHAR(100), -- 'invoice', 'receipt', 'bill', etc.
    reference_document_id UUID,

    -- Related transaction (for reversals, adjustments)
    parent_transaction_id UUID REFERENCES folio_transactions(id) ON DELETE SET NULL,
    reversal_of_transaction_id UUID REFERENCES folio_transactions(id) ON DELETE SET NULL,

    -- Payment-specific fields
    payment_method VARCHAR(50),
    -- 'cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online', 'other'
    payment_status VARCHAR(50),
    -- 'pending', 'authorized', 'captured', 'completed', 'failed', 'refunded', 'cancelled'

    -- Payment gateway fields
    gateway_transaction_id VARCHAR(200),
    gateway_name VARCHAR(100),
    gateway_response JSONB,
    authorization_code VARCHAR(100),
    authorization_amount DECIMAL(12, 2),

    -- Card payment details
    card_last_four VARCHAR(4),
    card_type VARCHAR(50),
    card_holder_name VARCHAR(255),

    -- Bank transfer / Cheque details
    bank_name VARCHAR(200),
    account_number VARCHAR(100),
    cheque_number VARCHAR(100),
    cheque_date DATE,
    upi_id VARCHAR(100),

    -- Currency support
    currency_code VARCHAR(3) DEFAULT 'INR',
    exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
    base_currency_amount DECIMAL(12, 2), -- Amount in hotel's base currency

    -- Audit and user tracking
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    modified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    modified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    voided_by UUID REFERENCES users(id) ON DELETE SET NULL,
    voided_at TIMESTAMP WITH TIME ZONE,
    void_reason TEXT,

    -- Additional metadata
    notes TEXT,
    custom_data JSONB DEFAULT '{}'::jsonb,

    CONSTRAINT valid_transaction_type CHECK (transaction_type IN (
        'room_charge', 'addon_charge', 'tax', 'fee', 'discount',
        'payment', 'refund', 'adjustment', 'reversal', 'deposit', 'deposit_usage'
    )),
    CONSTRAINT valid_transaction_status CHECK (status IN (
        'pending', 'posted', 'voided', 'reversed', 'in_dispute', 'settled'
    )),
    CONSTRAINT valid_payment_method CHECK (payment_method IS NULL OR payment_method IN (
        'cash', 'card', 'upi', 'bank_transfer', 'cheque', 'online', 'other'
    )),
    CONSTRAINT valid_payment_status CHECK (payment_status IS NULL OR payment_status IN (
        'pending', 'authorized', 'captured', 'completed', 'failed', 'refunded', 'cancelled'
    ))
);

-- =====================================================
-- 3. CREATE AUDIT_LOG TABLE
-- =====================================================
-- Comprehensive audit trail for all folio operations
CREATE TABLE IF NOT EXISTS folio_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What was changed
    entity_type VARCHAR(100) NOT NULL, -- 'folio', 'transaction', 'payment', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete', 'void', 'reverse', 'transfer'

    -- Who made the change
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),

    -- When
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Change details
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_reason TEXT,

    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),

    -- Full record snapshots (for critical operations)
    before_snapshot JSONB,
    after_snapshot JSONB,

    -- Metadata
    notes TEXT,

    CONSTRAINT valid_audit_action CHECK (action IN (
        'create', 'update', 'delete', 'void', 'reverse', 'transfer',
        'settle', 'reopen', 'adjust', 'move'
    ))
);

-- =====================================================
-- 4. CREATE FOLIO_TRANSFER_HISTORY TABLE
-- =====================================================
-- Track movements of charges between folios
CREATE TABLE IF NOT EXISTS folio_transfer_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES folio_transactions(id) ON DELETE CASCADE,
    from_folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    to_folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    transferred_by UUID REFERENCES users(id) ON DELETE SET NULL,
    transferred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    notes TEXT
);

-- =====================================================
-- 5. CREATE POSTING_SCHEDULES TABLE
-- =====================================================
-- For scheduled auto-posting of charges
CREATE TABLE IF NOT EXISTS folio_posting_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folio_id UUID NOT NULL REFERENCES folios(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,

    -- Schedule details
    charge_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    rate DECIMAL(12, 2),

    -- Posting schedule
    schedule_type VARCHAR(50) NOT NULL, -- 'daily', 'on_checkout', 'specific_date', 'recurring'
    post_date DATE,
    post_time TIME,
    recurrence_pattern VARCHAR(100), -- 'daily', 'weekly', 'monthly', etc.

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    last_posted_at TIMESTAMP WITH TIME ZONE,
    next_post_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,

    CONSTRAINT valid_schedule_type CHECK (schedule_type IN (
        'daily', 'on_checkout', 'specific_date', 'recurring'
    )),
    CONSTRAINT valid_schedule_status CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

-- Folios indexes
CREATE INDEX IF NOT EXISTS idx_folios_reservation ON folios(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folios_room ON folios(room_id) WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folios_guest ON folios(guest_id) WHERE guest_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folios_status ON folios(status);
CREATE INDEX IF NOT EXISTS idx_folios_type ON folios(folio_type);
CREATE INDEX IF NOT EXISTS idx_folios_number ON folios(folio_number);

-- Folio transactions indexes
CREATE INDEX IF NOT EXISTS idx_folio_txn_folio ON folio_transactions(folio_id);
CREATE INDEX IF NOT EXISTS idx_folio_txn_reservation ON folio_transactions(reservation_id);
CREATE INDEX IF NOT EXISTS idx_folio_txn_type ON folio_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_folio_txn_status ON folio_transactions(status);
CREATE INDEX IF NOT EXISTS idx_folio_txn_post_date ON folio_transactions(post_date DESC);
CREATE INDEX IF NOT EXISTS idx_folio_txn_created ON folio_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_folio_txn_category ON folio_transactions(category);
CREATE INDEX IF NOT EXISTS idx_folio_txn_payment_method ON folio_transactions(payment_method) WHERE payment_method IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folio_txn_payment_status ON folio_transactions(payment_status) WHERE payment_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folio_txn_gateway_txn ON folio_transactions(gateway_transaction_id) WHERE gateway_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folio_txn_reference ON folio_transactions(reference_number) WHERE reference_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_folio_txn_parent ON folio_transactions(parent_transaction_id) WHERE parent_transaction_id IS NOT NULL;

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_entity ON folio_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON folio_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON folio_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON folio_audit_log(action);

-- Transfer history indexes
CREATE INDEX IF NOT EXISTS idx_transfer_transaction ON folio_transfer_history(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transfer_from_folio ON folio_transfer_history(from_folio_id);
CREATE INDEX IF NOT EXISTS idx_transfer_to_folio ON folio_transfer_history(to_folio_id);
CREATE INDEX IF NOT EXISTS idx_transfer_timestamp ON folio_transfer_history(transferred_at DESC);

-- Posting schedules indexes
CREATE INDEX IF NOT EXISTS idx_posting_schedule_folio ON folio_posting_schedules(folio_id);
CREATE INDEX IF NOT EXISTS idx_posting_schedule_reservation ON folio_posting_schedules(reservation_id);
CREATE INDEX IF NOT EXISTS idx_posting_schedule_status ON folio_posting_schedules(status);
CREATE INDEX IF NOT EXISTS idx_posting_schedule_next_date ON folio_posting_schedules(next_post_date);

-- =====================================================
-- 7. CREATE FUNCTIONS AND TRIGGERS
-- =====================================================

-- Updated_at trigger for folios
CREATE OR REPLACE FUNCTION update_folios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_folios_updated_at ON folios;
CREATE TRIGGER trigger_folios_updated_at
    BEFORE UPDATE ON folios
    FOR EACH ROW
    EXECUTE FUNCTION update_folios_updated_at();

-- Auto-generate folio numbers
CREATE OR REPLACE FUNCTION generate_folio_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    year_month VARCHAR(6);
    prefix VARCHAR(10);
BEGIN
    IF NEW.folio_number IS NULL THEN
        year_month := TO_CHAR(NOW(), 'YYYYMM');

        -- Different prefixes for different folio types
        CASE NEW.folio_type
            WHEN 'master' THEN prefix := 'FM';
            WHEN 'room' THEN prefix := 'FR';
            WHEN 'guest' THEN prefix := 'FG';
            ELSE prefix := 'F';
        END CASE;

        SELECT COALESCE(MAX(
            CASE
                WHEN folio_number ~ ('^' || prefix || '-[0-9]{6}-[0-9]+$')
                THEN CAST(SUBSTRING(folio_number FROM '[0-9]+$') AS INTEGER)
                ELSE 0
            END
        ), 0) + 1
        INTO next_number
        FROM folios
        WHERE folio_number LIKE prefix || '-' || year_month || '%';

        NEW.folio_number := prefix || '-' || year_month || '-' || LPAD(next_number::TEXT, 5, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_folio_number ON folios;
CREATE TRIGGER trigger_generate_folio_number
    BEFORE INSERT ON folios
    FOR EACH ROW
    EXECUTE FUNCTION generate_folio_number();

-- Auto-generate transaction numbers
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
    next_number INTEGER;
    date_str VARCHAR(8);
    prefix VARCHAR(10);
BEGIN
    IF NEW.transaction_number IS NULL THEN
        date_str := TO_CHAR(NOW(), 'YYYYMMDD');

        -- Different prefixes for different transaction types
        CASE NEW.transaction_type
            WHEN 'room_charge' THEN prefix := 'RC';
            WHEN 'addon_charge' THEN prefix := 'AC';
            WHEN 'payment' THEN prefix := 'PY';
            WHEN 'refund' THEN prefix := 'RF';
            WHEN 'tax' THEN prefix := 'TX';
            WHEN 'discount' THEN prefix := 'DS';
            WHEN 'adjustment' THEN prefix := 'AD';
            WHEN 'reversal' THEN prefix := 'RV';
            WHEN 'deposit' THEN prefix := 'DP';
            ELSE prefix := 'TXN';
        END CASE;

        SELECT COALESCE(MAX(
            CASE
                WHEN transaction_number ~ ('^' || prefix || '-[0-9]{8}-[0-9]+$')
                THEN CAST(SUBSTRING(transaction_number FROM '[0-9]+$') AS INTEGER)
                ELSE 0
            END
        ), 0) + 1
        INTO next_number
        FROM folio_transactions
        WHERE transaction_number LIKE prefix || '-' || date_str || '%';

        NEW.transaction_number := prefix || '-' || date_str || '-' || LPAD(next_number::TEXT, 6, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_transaction_number ON folio_transactions;
CREATE TRIGGER trigger_generate_transaction_number
    BEFORE INSERT ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION generate_transaction_number();

-- Calculate base currency amount
CREATE OR REPLACE FUNCTION calculate_base_currency_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.exchange_rate IS NULL OR NEW.exchange_rate = 0 THEN
        NEW.exchange_rate := 1.0;
    END IF;

    NEW.base_currency_amount := NEW.amount * NEW.exchange_rate;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_base_currency ON folio_transactions;
CREATE TRIGGER trigger_calculate_base_currency
    BEFORE INSERT OR UPDATE ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_base_currency_amount();

-- Update folio totals when transaction is added/updated
CREATE OR REPLACE FUNCTION update_folio_totals()
RETURNS TRIGGER AS $$
DECLARE
    folio_id_to_update UUID;
BEGIN
    -- Determine which folio to update
    IF TG_OP = 'DELETE' THEN
        folio_id_to_update := OLD.folio_id;
    ELSE
        folio_id_to_update := NEW.folio_id;
    END IF;

    -- Recalculate folio totals
    UPDATE folios
    SET
        total_charges = COALESCE((
            SELECT SUM(base_currency_amount)
            FROM folio_transactions
            WHERE folio_id = folio_id_to_update
            AND status = 'posted'
            AND transaction_type IN ('room_charge', 'addon_charge', 'fee')
        ), 0),
        total_payments = COALESCE((
            SELECT SUM(base_currency_amount)
            FROM folio_transactions
            WHERE folio_id = folio_id_to_update
            AND status = 'posted'
            AND transaction_type IN ('payment', 'deposit')
        ), 0),
        total_taxes = COALESCE((
            SELECT SUM(base_currency_amount)
            FROM folio_transactions
            WHERE folio_id = folio_id_to_update
            AND status = 'posted'
            AND transaction_type = 'tax'
        ), 0),
        total_discounts = COALESCE((
            SELECT SUM(ABS(base_currency_amount))
            FROM folio_transactions
            WHERE folio_id = folio_id_to_update
            AND status = 'posted'
            AND transaction_type = 'discount'
        ), 0),
        balance = COALESCE((
            SELECT
                SUM(CASE
                    WHEN transaction_type IN ('room_charge', 'addon_charge', 'fee', 'tax') THEN base_currency_amount
                    WHEN transaction_type IN ('payment', 'deposit', 'discount', 'refund') THEN -ABS(base_currency_amount)
                    ELSE 0
                END)
            FROM folio_transactions
            WHERE folio_id = folio_id_to_update
            AND status = 'posted'
        ), 0)
    WHERE id = folio_id_to_update;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_folio_totals_insert ON folio_transactions;
CREATE TRIGGER trigger_update_folio_totals_insert
    AFTER INSERT ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_folio_totals();

DROP TRIGGER IF EXISTS trigger_update_folio_totals_update ON folio_transactions;
CREATE TRIGGER trigger_update_folio_totals_update
    AFTER UPDATE ON folio_transactions
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.amount IS DISTINCT FROM NEW.amount)
    EXECUTE FUNCTION update_folio_totals();

DROP TRIGGER IF EXISTS trigger_update_folio_totals_delete ON folio_transactions;
CREATE TRIGGER trigger_update_folio_totals_delete
    AFTER DELETE ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_folio_totals();

-- Audit log trigger for folio_transactions
CREATE OR REPLACE FUNCTION log_folio_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO folio_audit_log (
            entity_type, entity_id, action, user_id,
            after_snapshot, timestamp
        ) VALUES (
            'folio_transaction', NEW.id, 'create', NEW.created_by,
            to_jsonb(NEW), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO folio_audit_log (
            entity_type, entity_id, action, user_id,
            before_snapshot, after_snapshot, timestamp
        ) VALUES (
            'folio_transaction', NEW.id, 'update', NEW.modified_by,
            to_jsonb(OLD), to_jsonb(NEW), NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO folio_audit_log (
            entity_type, entity_id, action,
            before_snapshot, timestamp
        ) VALUES (
            'folio_transaction', OLD.id, 'delete',
            to_jsonb(OLD), NOW()
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_log_transaction_changes ON folio_transactions;
CREATE TRIGGER trigger_log_transaction_changes
    AFTER INSERT OR UPDATE OR DELETE ON folio_transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_folio_transaction_changes();

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON folios TO authenticated;
GRANT ALL ON folio_transactions TO authenticated;
GRANT ALL ON folio_audit_log TO authenticated;
GRANT ALL ON folio_transfer_history TO authenticated;
GRANT ALL ON folio_posting_schedules TO authenticated;

GRANT SELECT ON folios TO anon;
GRANT SELECT ON folio_transactions TO anon;
GRANT SELECT ON folio_audit_log TO anon;

-- =====================================================
-- 9. CREATE VIEWS FOR COMMON QUERIES
-- =====================================================

-- View: Folio summary with reservation and guest details
CREATE OR REPLACE VIEW v_folio_summary AS
SELECT
    f.id,
    f.folio_number,
    f.folio_type,
    f.folio_name,
    f.status,
    f.reservation_id,
    r.check_in_date,
    r.check_out_date,
    r.status as reservation_status,
    g.name as guest_name,
    g.email as guest_email,
    g.phone as guest_phone,
    rm.room_number,
    rt.name as room_type,
    f.total_charges,
    f.total_payments,
    f.total_taxes,
    f.total_discounts,
    f.balance,
    f.created_at,
    f.settled_at
FROM folios f
LEFT JOIN reservations r ON f.reservation_id = r.id
LEFT JOIN guests g ON r.guest_id = g.id
LEFT JOIN rooms rm ON f.room_id = rm.id
LEFT JOIN room_types rt ON rm.room_type_id = rt.id;

-- View: Transaction details with user info
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT
    ft.id,
    ft.transaction_number,
    ft.folio_id,
    f.folio_number,
    ft.transaction_type,
    ft.description,
    ft.amount,
    ft.quantity,
    ft.rate,
    ft.category,
    ft.status,
    ft.post_date,
    ft.payment_method,
    ft.payment_status,
    ft.reference_number,
    ft.currency_code,
    ft.base_currency_amount,
    u.name as created_by_name,
    ft.created_at,
    ft.notes
FROM folio_transactions ft
LEFT JOIN folios f ON ft.folio_id = f.id
LEFT JOIN users u ON ft.created_by = u.id;

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to create master folio for a reservation
CREATE OR REPLACE FUNCTION create_master_folio_for_reservation(p_reservation_id UUID)
RETURNS UUID AS $$
DECLARE
    v_folio_id UUID;
BEGIN
    INSERT INTO folios (reservation_id, folio_type, folio_name, status)
    VALUES (p_reservation_id, 'master', 'Master Folio', 'open')
    RETURNING id INTO v_folio_id;

    RETURN v_folio_id;
END;
$$ LANGUAGE plpgsql;

-- Function to void a transaction
CREATE OR REPLACE FUNCTION void_transaction(
    p_transaction_id UUID,
    p_user_id UUID,
    p_void_reason TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE folio_transactions
    SET
        status = 'voided',
        voided_by = p_user_id,
        voided_at = NOW(),
        void_reason = p_void_reason,
        modified_by = p_user_id,
        modified_at = NOW()
    WHERE id = p_transaction_id
    AND status != 'voided';

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to transfer transaction to another folio
CREATE OR REPLACE FUNCTION transfer_transaction_to_folio(
    p_transaction_id UUID,
    p_to_folio_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    v_from_folio_id UUID;
    v_amount DECIMAL(12, 2);
BEGIN
    -- Get current folio and amount
    SELECT folio_id, base_currency_amount
    INTO v_from_folio_id, v_amount
    FROM folio_transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Update transaction folio
    UPDATE folio_transactions
    SET
        folio_id = p_to_folio_id,
        modified_by = p_user_id,
        modified_at = NOW()
    WHERE id = p_transaction_id;

    -- Record transfer history
    INSERT INTO folio_transfer_history (
        transaction_id, from_folio_id, to_folio_id,
        amount, transferred_by, reason
    ) VALUES (
        p_transaction_id, v_from_folio_id, p_to_folio_id,
        v_amount, p_user_id, p_reason
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. VERIFICATION
-- =====================================================

DO $$
DECLARE
    folios_exists BOOLEAN;
    transactions_exists BOOLEAN;
    audit_exists BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'folios') INTO folios_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'folio_transactions') INTO transactions_exists;
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'folio_audit_log') INTO audit_exists;

    IF folios_exists AND transactions_exists AND audit_exists THEN
        RAISE NOTICE '✓ SUCCESS: Enhanced folio system created successfully!';
        RAISE NOTICE '  - folios table: %', folios_exists;
        RAISE NOTICE '  - folio_transactions table: %', transactions_exists;
        RAISE NOTICE '  - folio_audit_log table: %', audit_exists;
    ELSE
        RAISE WARNING 'Some tables may be missing. Please check manually.';
    END IF;
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
