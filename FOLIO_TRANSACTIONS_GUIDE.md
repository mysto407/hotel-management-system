# Enhanced Folio Transaction System - Implementation Guide

## Overview

This guide documents the enhanced folio transaction system that provides comprehensive tracking of all financial transactions in the hotel management system. The new system replaces the fragmented approach (separate bills, payments, discounts) with a unified transaction ledger.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Transaction Types](#transaction-types)
3. [Installation & Migration](#installation--migration)
4. [Usage Examples](#usage-examples)
5. [API Reference](#api-reference)
6. [UI Components](#ui-components)
7. [Best Practices](#best-practices)

---

## Database Schema

### Main Table: `folio_transactions`

The `folio_transactions` table is the central ledger for all financial transactions. Each row represents a single transaction with complete audit trail.

**Key Fields:**

- `id` - UUID primary key
- `transaction_type` - Type of transaction (enum)
- `transaction_status` - Current status (enum: posted, pending, reversed, voided, cancelled)
- `transaction_date` - When the transaction occurred
- `reservation_id` - Link to reservation (required)
- `bill_id` - Link to bill (optional)
- `created_by` - User who created the transaction
- `amount` - Transaction amount (positive = debit/charge, negative = credit/payment)
- `description` - Human-readable description
- `notes` - Additional notes
- `reference_number` - External reference (invoice #, receipt #)
- `reversed_transaction_id` - Points to original transaction if this is a reversal

**Supporting Views:**

1. `v_reservation_transaction_summary` - Aggregated summary per reservation
2. `v_transaction_details` - Denormalized view with guest/room info

**Functions:**

1. `reverse_transaction(transaction_id, reason, user_id)` - Creates reversal
2. `void_transaction(transaction_id, reason, user_id)` - Marks as voided
3. `get_reservation_balance(reservation_id)` - Calculates current balance

---

## Transaction Types

### Debit Transactions (Positive Amount)

These add to what the guest owes:

1. **room_charge** - Room rental charges
   - Includes: quantity, rate
   - Auto-calculated on check-in

2. **service_charge** - Additional services
   - Categories: food, beverage, minibar, spa, laundry, room_service, telephone, internet, parking, conference, extra_bed, other
   - Includes: service_category, quantity, rate

3. **tax** - Tax charges
   - Includes: tax_name, tax_rate
   - Example: GST 18%, VAT 12%

4. **fee** - Additional fees
   - Example: early check-in fee, pet fee, parking fee

### Credit Transactions (Negative Amount)

These reduce what the guest owes or represent money received:

5. **discount** - Discounts applied
   - Includes: discount_id, original_amount, discount_type

6. **payment_cash** - Cash payment
7. **payment_card** - Card payment
   - Includes: card_last_four, payment_reference
8. **payment_online** - Online payment (UPI, etc.)
9. **payment_bank_transfer** - Bank transfer
10. **payment_other** - Other payment methods

11. **refund** - Money returned to guest
    - Includes: payment_method, payment_reference

12. **adjustment** - Manual adjustment (can be + or -)
    - Use for corrections, courtesy credits, etc.

13. **write_off** - Bad debt write-off
    - Negative amount, reduces guest's balance

14. **deposit** - Advance deposit received
    - Negative amount (held as credit)

15. **deposit_usage** - Using the deposit
    - Positive amount (applying the credit)

### Special Transaction Types

16. **reversal** - Reverses a posted transaction
    - Created automatically via `reverse_transaction()`
    - Contains opposite amount of original
    - Links to original via `reversed_transaction_id`

17. **void** - Voids a pending transaction
    - Can only void transactions in pending status
    - No counter-transaction created

---

## Installation & Migration

### Step 1: Run the Database Migration

Connect to your Supabase database and run the migration:

```bash
# Using Supabase CLI
supabase db push

# Or execute SQL directly
psql -h your-host -U postgres -d your-db -f database/migrations/add_folio_transactions_system.sql
```

The migration creates:
- `folio_transactions` table
- Enum types for transaction_type, transaction_status, service_category
- Indexes for performance
- Views for reporting
- Helper functions for reversals and voids

### Step 2: Verify Installation

Check that the table exists:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'folio_transactions';
```

Verify the views:

```sql
SELECT * FROM v_reservation_transaction_summary LIMIT 1;
```

### Step 3: Update Your Code

The necessary code changes have already been made to:
- [src/lib/supabase.js](src/lib/supabase.js) - API helper functions
- [src/context/BillingContext.jsx](src/context/BillingContext.jsx) - Context methods
- [src/components/reservations/AddTransactionModal.jsx](src/components/reservations/AddTransactionModal.jsx) - Add transaction UI
- [src/components/reservations/EnhancedFolioTab.jsx](src/components/reservations/EnhancedFolioTab.jsx) - Enhanced folio display

### Step 4: Update ReservationDetails to Use EnhancedFolioTab

Replace the import in [src/pages/reservations/ReservationDetails.jsx](src/pages/reservations/ReservationDetails.jsx):

```jsx
// OLD
import FolioTab from '../../components/reservations/FolioTab'

// NEW
import EnhancedFolioTab from '../../components/reservations/EnhancedFolioTab'
```

And update the component usage:

```jsx
<TabsContent value="folio">
  <EnhancedFolioTab
    reservationIds={groupedReservations.map(r => r.id)}
    primaryReservation={primaryReservation}
  />
</TabsContent>
```

---

## Usage Examples

### Adding a Service Charge

```javascript
import { useBilling } from '../context/BillingContext'

const { addServiceCharge } = useBilling()

await addServiceCharge({
  reservation_id: 'reservation-uuid',
  bill_id: 'bill-uuid', // optional
  service_category: 'spa',
  description: 'Swedish Massage - 60 minutes',
  quantity: 1,
  rate: 2500,
  amount: 2500,
  notes: 'Therapist: Sarah'
})
```

### Recording a Payment

```javascript
const { recordPaymentTransaction } = useBilling()

await recordPaymentTransaction({
  reservation_id: 'reservation-uuid',
  description: 'Payment for room charges',
  amount: 5000,
  payment_method: 'Card',
  card_last_four: '4242',
  payment_reference: 'TXN123456789',
  notes: 'Visa ending in 4242'
})
```

### Applying a Discount

```javascript
const { addDiscountTransaction } = useBilling()

await addDiscountTransaction({
  reservation_id: 'reservation-uuid',
  description: 'Weekend Special - 20% off',
  original_amount: 10000,
  amount: 2000, // 20% of 10000
  discount_id: 'discount-uuid', // optional
  discount_type: 'percentage',
  notes: 'Promotional discount'
})
```

### Reversing a Transaction

```javascript
const { reverseTransactionById } = useBilling()

// This creates a reversal transaction and marks the original as reversed
await reverseTransactionById(
  'transaction-uuid',
  'Customer dispute - incorrect charge amount'
)
```

### Voiding a Pending Transaction

```javascript
const { voidTransactionById } = useBilling()

// Only works for pending transactions
await voidTransactionById(
  'transaction-uuid',
  'Duplicate entry - cancelling'
)
```

### Getting Transaction Summary

```javascript
const { getTransactionSummary } = useBilling()

const summary = await getTransactionSummary('reservation-uuid')

console.log('Total Charges:', summary.total_charges)
console.log('Total Payments:', summary.total_payments)
console.log('Balance:', summary.net_balance)
```

### Querying Transactions with Filters

```javascript
const { getTransactions } = useBilling()

const transactions = await getTransactions('reservation-uuid', {
  type: 'payment_card',
  status: 'posted',
  startDate: '2025-11-01',
  endDate: '2025-11-30',
  sortBy: 'transaction_date',
  sortOrder: 'desc'
})
```

---

## API Reference

### Supabase Helper Functions

All functions are exported from `src/lib/supabase.js`.

#### Transaction Creation

- `createRoomCharge(data)` - Add room charge
- `createServiceCharge(data)` - Add service charge
- `createTax(data)` - Add tax
- `createFee(data)` - Add fee
- `createDiscountTransaction(data)` - Add discount
- `createPaymentTransaction(data)` - Record payment
- `createRefund(data)` - Process refund
- `createAdjustment(data)` - Manual adjustment
- `createWriteOff(data)` - Write off bad debt
- `createDeposit(data)` - Record deposit
- `createDepositUsage(data)` - Use deposit

#### Transaction Management

- `getTransactionsByReservation(reservationId, options)` - Get all transactions
- `getReservationTransactionSummary(reservationId)` - Get summary
- `getReservationBalance(reservationId)` - Get current balance
- `reverseTransaction(transactionId, reason, userId)` - Reverse a transaction
- `voidTransaction(transactionId, reason, userId)` - Void a pending transaction
- `updateTransaction(transactionId, updates)` - Update transaction
- `deleteTransaction(transactionId)` - Delete transaction (use carefully)

### BillingContext Methods

All methods are available via `useBilling()` hook.

**Transaction Methods:**
- `addRoomCharge(data)`
- `addServiceCharge(data)`
- `addTax(data)`
- `addFee(data)`
- `addDiscountTransaction(data)`
- `recordPaymentTransaction(data)`
- `addRefund(data)`
- `addAdjustment(data)`
- `addWriteOff(data)`
- `addDeposit(data)`
- `useDeposit(data)`
- `reverseTransactionById(id, reason)`
- `voidTransactionById(id, reason)`
- `updateTransactionById(id, updates)`
- `deleteTransactionById(id)`

**Query Methods:**
- `getTransactions(reservationId, options)`
- `getTransactionSummary(reservationId)`
- `getBalance(reservationId)`

**Constants:**
- `TRANSACTION_TYPES` - Object with all transaction type constants
- `TRANSACTION_STATUS` - Object with status constants
- `SERVICE_CATEGORIES` - Object with service category constants

---

## UI Components

### EnhancedFolioTab

Main component for displaying and managing transactions.

**Features:**
- Transaction history table with all details
- Real-time balance calculation
- Transaction filtering (type, status, search)
- Add new transactions
- Reverse/void transactions
- Print folio
- Summary card with key metrics

**Props:**
```jsx
<EnhancedFolioTab
  reservationIds={['uuid1', 'uuid2']}
  primaryReservation={reservationObject}
/>
```

### AddTransactionModal

Modal dialog for adding various transaction types.

**Features:**
- Dynamic form based on transaction type
- Validation for required fields
- Service category selection for service charges
- Payment method tracking
- Reference number support
- Notes field

**Props:**
```jsx
<AddTransactionModal
  open={isOpen}
  onOpenChange={setIsOpen}
  reservationId="uuid"
  billId="uuid"
  onSuccess={handleSuccess}
/>
```

---

## Best Practices

### 1. Always Use Reversals for Posted Transactions

Never delete posted transactions. Use reversals to maintain audit trail:

```javascript
// ✅ GOOD
await reverseTransactionById(txId, 'Correction needed')

// ❌ BAD
await deleteTransactionById(txId)
```

### 2. Add Meaningful Descriptions

Always provide clear descriptions:

```javascript
// ✅ GOOD
description: 'Room 302 - Night of Nov 20, 2025'

// ❌ BAD
description: 'Charge'
```

### 3. Use Reference Numbers for External Payments

Track external transaction IDs:

```javascript
await recordPaymentTransaction({
  ...
  payment_reference: 'RAZORPAY_TXN_123456',
  card_last_four: '4242'
})
```

### 4. Include Notes for Context

Add notes when relevant:

```javascript
await addAdjustment({
  ...
  notes: 'Compensation for late check-in - approved by Manager John'
})
```

### 5. Calculate Running Balance

Use the summary view for reporting:

```sql
SELECT
  reservation_id,
  net_balance,
  total_charges,
  total_payments
FROM v_reservation_transaction_summary
WHERE reservation_id = 'uuid'
```

### 6. Amount Sign Convention

- **Positive amounts** = Debits (charges, fees, taxes) - guest owes more
- **Negative amounts** = Credits (payments, discounts, refunds) - guest owes less

The API helpers handle this automatically, but if inserting directly:

```javascript
// Charge - positive
amount: 1000

// Payment - negative
amount: -1000

// Discount - negative
amount: -200
```

### 7. Use Transactions for Audit Trail

Every financial event should create a transaction:
- Room charges? → `createRoomCharge()`
- Guest pays? → `createPaymentTransaction()`
- Apply discount? → `createDiscountTransaction()`
- Correction needed? → `reverseTransaction()` + new transaction
- Write off bad debt? → `createWriteOff()`

### 8. Pending vs Posted

Use pending status for:
- Pre-authorizations
- Estimated charges
- Disputed amounts

Only post transactions that are final.

### 9. Deposits Workflow

When guest pays deposit:
```javascript
await createDeposit({
  amount: 5000,
  payment_method: 'Card',
  description: 'Advance deposit for reservation'
})
```

When applying deposit to charges:
```javascript
await createDepositUsage({
  amount: 5000,
  description: 'Applying advance deposit to room charges'
})
```

---

## Migration from Old System

If you have existing data in the old `bills`, `bill_items`, and `payments` tables, you may want to migrate them to transactions:

```sql
-- Example migration script (customize as needed)

-- Migrate bill items as charges
INSERT INTO folio_transactions (
  transaction_type,
  transaction_status,
  reservation_id,
  bill_id,
  amount,
  quantity,
  rate,
  description,
  created_at
)
SELECT
  CASE
    WHEN b.bill_type = 'Room' THEN 'room_charge'::transaction_type
    WHEN b.bill_type = 'Food' THEN 'service_charge'::transaction_type
    ELSE 'service_charge'::transaction_type
  END,
  'posted'::transaction_status,
  b.reservation_id,
  bi.bill_id,
  bi.amount,
  bi.quantity,
  bi.rate,
  bi.description,
  bi.created_at
FROM bill_items bi
JOIN bills b ON bi.bill_id = b.id;

-- Migrate payments
INSERT INTO folio_transactions (
  transaction_type,
  transaction_status,
  reservation_id,
  bill_id,
  amount,
  payment_method,
  description,
  created_at
)
SELECT
  CASE
    WHEN p.payment_method = 'Cash' THEN 'payment_cash'::transaction_type
    WHEN p.payment_method = 'Card' THEN 'payment_card'::transaction_type
    ELSE 'payment_other'::transaction_type
  END,
  'posted'::transaction_status,
  b.reservation_id,
  p.bill_id,
  -p.amount, -- Negative for credit
  p.payment_method,
  COALESCE(p.notes, 'Payment'),
  p.created_at
FROM payments p
JOIN bills b ON p.bill_id = b.id;
```

---

## Troubleshooting

### Issue: Cannot reverse a transaction

**Solution:** Ensure the transaction status is 'posted':

```sql
SELECT id, transaction_status FROM folio_transactions WHERE id = 'uuid';
```

### Issue: Cannot void a transaction

**Solution:** Only 'pending' transactions can be voided. Posted transactions must be reversed.

### Issue: Balance doesn't match

**Solution:** Check for unposted transactions:

```sql
SELECT SUM(amount) as balance
FROM folio_transactions
WHERE reservation_id = 'uuid'
AND transaction_status = 'posted';
```

### Issue: Performance with large number of transactions

**Solution:** The table has indexes on reservation_id, transaction_date, type, and status. Ensure your queries use these fields.

---

## Support

For questions or issues, please refer to:
- [CLAUDE.md](CLAUDE.md) - Project overview
- Database schema comments in migration file
- Code comments in implementation files

---

## Changelog

### Version 1.0 - November 2025
- Initial implementation
- All transaction types supported
- Reversal and void functionality
- Summary views and functions
- UI components for transaction management
