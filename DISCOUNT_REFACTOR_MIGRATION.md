# Discount System Refactor - Migration Guide

## Overview
The discount system has been refactored to separate **discount category** from **value type**. This allows all discount types (promo codes, seasonal offers, long stay, etc.) to support both percentage and fixed amount discounts.

## Changes Made

### 1. Frontend Changes

#### Discounts.jsx
- Added two separate select fields:
  - **Discount Category**: Manual, Promo Code, Seasonal, Long Stay, Early Bird, Last Minute
  - **Value Type**: Percentage (%) or Fixed Amount (₹)
- Updated form validation to use `value_type` instead of inferring from `discount_type`

#### DiscountContext.jsx
- Added `value_type` field to discount creation and update operations
- Maintains backward compatibility with existing discounts

#### discountCalculations.js
- Updated `calculateDiscountAmount()` to use `value_type` field
- Falls back to old logic for backward compatibility
- Updated `formatDiscount()` to display correctly based on `value_type`

#### PaymentPage.jsx
- Updated promo code display to use `value_type` for determining if it's percentage or fixed amount

### 2. Database Migration

A new migration file has been created: `supabase/migrations/add_value_type_to_discounts.sql`

This migration:
1. Adds `value_type` column to the `discounts` table
2. Migrates existing data automatically
3. Updates constraints to support the new structure
4. Fixes the WELCOME2025 promo code to use fixed_amount with value 12

## Running the Migration

### Option 1: Using Supabase CLI (Recommended)
```bash
# If you have Supabase CLI installed
npx supabase db push

# Or if running locally
npx supabase migration up
```

### Option 2: Manual SQL Execution
1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/add_value_type_to_discounts.sql`
4. Paste and run the SQL

### Option 3: Using psql
```bash
psql -h [your-db-host] -U [your-db-user] -d [your-db-name] -f supabase/migrations/add_value_type_to_discounts.sql
```

## Testing the Changes

After running the migration:

1. **Create a new discount**:
   - Go to Discounts page
   - Click "Add Discount"
   - Choose "Promo Code" as category
   - Choose "Fixed Amount" as value type
   - Enter value 50
   - Save and verify

2. **Test WELCOME2025 promo code**:
   - Create a new reservation
   - Go to payment page
   - Apply promo code "WELCOME2025"
   - Verify it now shows ₹12 off (fixed amount) instead of 12%

3. **Test existing discounts**:
   - All existing discounts should work as before
   - The migration automatically converts old discounts to the new format

## Backward Compatibility

The system maintains full backward compatibility:
- Old discounts without `value_type` will automatically infer it from `discount_type`
- The calculation logic falls back to the old behavior if `value_type` is missing
- No data loss occurs during migration

## Database Schema Changes

### New Column
```sql
value_type VARCHAR(50) NOT NULL DEFAULT 'percentage'
```

### New Constraints
```sql
-- Valid discount categories
CHECK (discount_type IN ('manual', 'promo_code', 'seasonal', 'long_stay', 'early_bird', 'last_minute'))

-- Valid value types
CHECK (value_type IN ('percentage', 'fixed_amount'))
```

## Rollback Plan

If you need to rollback:

```sql
-- Remove the value_type column
ALTER TABLE discounts DROP COLUMN IF EXISTS value_type;

-- Restore old constraints (see original migration file)
```

## Benefits of This Change

1. **Clarity**: Clear separation between discount purpose and calculation method
2. **Flexibility**: All discount types can now be percentage OR fixed amount
3. **User-Friendly**: Easier for staff to understand and configure discounts
4. **Fixes Bug**: Resolves the issue where "WELCOME2025" was being treated as 12% instead of ₹12

## Support

If you encounter any issues:
1. Check that the migration ran successfully
2. Verify that all existing discounts have a `value_type` set
3. Clear browser cache and reload the application
