# Billing System Migration Guide

## Overview
This migration creates the necessary database tables for the Folio functionality in the hotel management system.

## Tables Created

### 1. **bills**
Main billing table that stores bill headers for each reservation.
- Auto-generated bill numbers (format: `BILL-YYYYMM-0001`)
- Tracks subtotal, tax, discounts, total, paid amount, and balance
- Multiple bill types: Room, Food, Spa, Conference, Laundry, Bar, KOT, BOT, Extra Bed, Other Sales, Cancellation Charges

### 2. **bill_items**
Line items/charges for each bill.
- Auto-calculates amount from quantity × rate
- Supports description, quantity, rate, and optional metadata
- Links to parent bill via `bill_id`

### 3. **payments**
Payment records against bills.
- Multiple payment methods: Cash, Card, UPI, Bank Transfer, Cheque, Other
- Tracks transaction details, reference numbers
- Payment-specific fields (card info, UPI ID, cheque details)

## Features Included

✅ **Auto-generated bill numbers** - Sequential format: BILL-202511-0001
✅ **Auto-calculated amounts** - Bill items automatically calculate quantity × rate
✅ **Timestamps** - Auto-updated created_at and updated_at fields
✅ **Indexes** - Optimized for query performance
✅ **Constraints** - Data validation for amounts, statuses, and types
✅ **Cascading deletes** - Maintains referential integrity

## How to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Open your [Supabase Dashboard](https://app.supabase.com)
2. Navigate to your project
3. Go to **SQL Editor** (in the left sidebar)
4. Click **New Query**
5. Copy the entire contents of `create_billing_system.sql`
6. Paste into the SQL editor
7. Click **Run** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
8. Verify success - you should see "Success. No rows returned"

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Make sure you're in the project directory
cd /Users/ginger/Desktop/hotel-management

# Apply the migration
supabase db push

# Or apply specific migration file
psql -h <your-db-host> -U postgres -d postgres -f supabase/migrations/create_billing_system.sql
```

### Option 3: Using psql directly

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" \
  -f supabase/migrations/create_billing_system.sql
```

## Verification

After running the migration, verify tables were created:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('bills', 'bill_items', 'payments')
ORDER BY table_name;

-- Check table structure
\d bills
\d bill_items
\d payments
```

You should see all three tables listed.

## Post-Migration Steps

### 1. Enable Row Level Security (Optional but Recommended)

If you want to secure your data with RLS:

```sql
-- Enable RLS
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Example policy: Allow authenticated users to view all records
CREATE POLICY "Enable read access for authenticated users" ON bills
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON bill_items
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Enable read access for authenticated users" ON payments
    FOR SELECT TO authenticated
    USING (true);

-- Add similar policies for INSERT, UPDATE, DELETE as needed
```

### 2. Grant Permissions

Ensure the `anon` and `authenticated` roles have proper permissions:

```sql
-- Grant usage on tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant permissions on tables
GRANT ALL ON bills TO authenticated;
GRANT ALL ON bill_items TO authenticated;
GRANT ALL ON payments TO authenticated;

-- Grant permissions on sequences (for auto-increment IDs)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

## Testing the Migration

After applying the migration, test with sample queries:

```sql
-- Create a test bill (replace with actual reservation_id)
INSERT INTO bills (reservation_id, bill_type, subtotal, tax, total, balance)
VALUES (
    'your-actual-reservation-id',
    'Room',
    10000.00,
    1800.00,
    11800.00,
    11800.00
)
RETURNING *;

-- The bill_number should be auto-generated!

-- Add a bill item
INSERT INTO bill_items (bill_id, description, quantity, rate)
VALUES (
    'your-bill-id-from-above',
    'Deluxe Room - Night 1',
    1,
    2000.00
)
RETURNING *;

-- The amount should be auto-calculated as 2000.00

-- Add a payment
INSERT INTO payments (bill_id, amount, payment_method, notes)
VALUES (
    'your-bill-id-from-above',
    5000.00,
    'Cash',
    'Advance payment'
)
RETURNING *;
```

## Rollback (If Needed)

To remove the tables:

```sql
-- WARNING: This will delete all data!
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Drop associated functions
DROP FUNCTION IF EXISTS update_bills_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_bill_items_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_payments_updated_at() CASCADE;
DROP FUNCTION IF EXISTS calculate_bill_item_amount() CASCADE;
DROP FUNCTION IF EXISTS generate_bill_number() CASCADE;
```

## Integration with Existing System

This migration integrates with:
- **reservations** table - via `bills.reservation_id` foreign key
- **discount_applications** table - for discount tracking (already exists from discount system migration)

Make sure you've run the discount system migration first:
- `supabase/migrations/add_discount_system.sql`

## Troubleshooting

### Error: relation "reservations" does not exist
**Solution**: Make sure your reservations table exists first. This migration depends on it.

### Error: permission denied
**Solution**: Ensure you're connected as a user with sufficient privileges (usually `postgres` user).

### Error: duplicate key value violates unique constraint
**Solution**: Bill numbers must be unique. Check for existing bills with conflicting numbers.

## Questions?

If you encounter any issues:
1. Check the Supabase logs in your dashboard
2. Verify your reservations table exists
3. Ensure you have proper database permissions
4. Check that all required migrations are applied in order

## Next Steps

After migration:
1. Test the Folio tab in the application
2. Create a test reservation and add charges
3. Post test payments
4. Verify calculations are correct
5. Test edit/delete functionality

---

**Migration File**: `create_billing_system.sql`
**Created**: 2024
**Version**: 1.0.0
