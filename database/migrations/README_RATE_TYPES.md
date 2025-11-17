# Room Rate Types Feature - Implementation Guide

## Overview

This feature adds support for multiple rate plans per room type, similar to standard Property Management Systems (PMS). Each room type can now have multiple rate types (e.g., Standard Rate, Non-Refundable Rate, Corporate Rate, Seasonal Rate, etc.) with different pricing, rules, and availability settings.

## Database Migration

### Step 1: Apply the Migration SQL

Run the migration SQL file in your Supabase SQL Editor:

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add_room_rate_types.sql`
4. Click **Run** to execute the migration

The migration will:
- ✅ Create the `room_rate_types` table with all necessary fields
- ✅ Add indexes for performance optimization
- ✅ Add `rate_type_id` foreign key to the `reservations` table
- ✅ Create triggers for automatic timestamp updates
- ✅ Automatically migrate existing room types to have a "Standard Rate" based on their current `base_price`

### Step 2: Verify the Migration

After running the migration, verify that:

1. The `room_rate_types` table exists with sample data:
   ```sql
   SELECT * FROM room_rate_types;
   ```
   You should see one "Standard Rate" for each existing room type.

2. The `reservations` table has the new `rate_type_id` column:
   ```sql
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'reservations'
   AND column_name = 'rate_type_id';
   ```

## Features Implemented

### 1. Room Rate Types Management

Navigate to **Rooms > Room Types** in the application. You'll now see:

- **Expandable Room Type Rows**: Click the chevron icon (▶) next to any room type to expand and view its rate types
- **Rate Types Manager**: When expanded, you can:
  - View all rate types for that room type
  - Add new rate types
  - Edit existing rate types
  - Delete rate types (except default rates)
  - Set a rate type as default

### 2. Rate Type Fields

Each rate type includes:

**Basic Information:**
- **Rate Name**: Display name (e.g., "Standard Rate", "Non-Refundable Rate")
- **Rate Code**: Short code identifier (e.g., "STD", "NRF", "CORP")
- **Base Price**: Price per night for this rate plan

**Booking Rules:**
- **Minimum Nights**: Minimum stay requirement
- **Maximum Nights**: Maximum stay allowed (optional)
- **Advance Booking Days**: How many days in advance booking is required

**Seasonal Availability:**
- **Valid From**: Start date for seasonal rates (optional)
- **Valid To**: End date for seasonal rates (optional)

**Additional Details:**
- **Description**: Brief description of the rate plan
- **Inclusions**: What's included (e.g., "Breakfast, WiFi, Parking")
- **Cancellation Policy**: Cancellation terms for this rate

**Status:**
- **Is Active**: Whether the rate can be booked
- **Is Default**: Whether this is the default rate for new bookings

### 3. Reservation Integration

When creating a new reservation:

1. **Automatic Rate Selection**: The system automatically selects the default rate type for the chosen room type
2. **Rate Plan Dropdown**: Users can change the rate plan from available active rates
3. **Price Display**: The selected rate's price and total cost are displayed in real-time
4. **Rate Details**: Inclusions and cancellation policy are shown below the selector

### 4. Billing Integration

When checking in a guest:

- Bills are automatically generated using the **selected rate type's price** instead of the room type's base price
- The bill notes include the rate type name for reference
- Example: "Auto-generated room charge for 3 night(s) - Corporate Rate"

## Usage Examples

### Example 1: Creating a Non-Refundable Rate

1. Go to **Rooms > Room Types**
2. Click the expand icon next to "Deluxe Suite"
3. Click **Add Rate Type**
4. Fill in the details:
   - Rate Name: `Non-Refundable Rate`
   - Rate Code: `NRF`
   - Base Price: `2000` (20% discount from standard)
   - Description: `Save 20% with this non-refundable rate`
   - Cancellation Policy: `Non-refundable. No cancellations or changes allowed.`
   - Min Nights: `2`
   - Set as Active: ✅
5. Click **Save**

### Example 2: Creating a Seasonal Rate

1. Add a new rate type with:
   - Rate Name: `Peak Season Rate`
   - Rate Code: `PEAK`
   - Base Price: `3500`
   - Valid From: `2025-12-15`
   - Valid To: `2026-01-15`
   - Description: `Premium pricing for peak season`
   - Min Nights: `3`

### Example 3: Corporate Rate with Inclusions

1. Add a new rate type with:
   - Rate Name: `Corporate Rate`
   - Rate Code: `CORP`
   - Base Price: `2200`
   - Description: `Special rate for corporate clients`
   - Inclusions: `Breakfast, WiFi, Late checkout`
   - Advance Booking Days: `0`
   - Cancellation Policy: `Free cancellation up to 24 hours before check-in`

## API Integration

### Get Active Rate Types for a Room Type

```javascript
import { getActiveRoomRateTypes } from '../lib/supabase';

const { data: rateTypes } = await getActiveRoomRateTypes(roomTypeId, checkInDate);
```

### Get Default Rate Type

```javascript
import { getDefaultRateType } from '../lib/supabase';

const { data: defaultRate } = await getDefaultRateType(roomTypeId);
```

### Create a Reservation with Rate Type

```javascript
const reservation = {
  guest_id: guestId,
  room_id: roomId,
  rate_type_id: selectedRateTypeId, // NEW FIELD
  check_in_date: '2025-12-01',
  check_out_date: '2025-12-05',
  // ... other fields
};
```

## Best Practices

### 1. Always Have a Default Rate
- Each room type should have at least one active rate marked as default
- The default rate is auto-selected when creating new bookings
- You cannot delete a default rate type

### 2. Use Clear Rate Codes
- Keep rate codes short (3-5 characters)
- Use industry-standard codes when possible:
  - `STD` - Standard Rate
  - `NRF` - Non-Refundable
  - `CORP` - Corporate
  - `GOV` - Government
  - `AAA` - AAA Member Rate
  - `PKG` - Package Rate

### 3. Set Appropriate Minimum Nights
- Standard rates: 1 night minimum
- Promotional rates: 2-3 nights minimum
- Peak season: 3-5 nights minimum

### 4. Seasonal Rates
- Use Valid From/To dates for seasonal pricing
- Don't overlap seasonal rates with conflicting prices
- Seasonal rates automatically become unavailable outside their date range

## Troubleshooting

### Issue: No rate types showing in booking modal

**Solution**: Ensure the room type has at least one **active** rate type. Check:
1. Go to Room Types and expand the room type
2. Verify there's at least one rate with "Active" badge
3. If not, either activate an existing rate or create a new one

### Issue: Cannot delete a rate type

**Possible Causes**:
1. **It's a default rate**: You cannot delete default rates. Set another rate as default first.
2. **It's being used by reservations**: Existing reservations reference this rate. You can deactivate it instead.

**Solution**: Either set a different rate as default, or mark it as inactive instead of deleting.

### Issue: Billing shows wrong price

**Cause**: The reservation was created without a rate_type_id.

**Solution**: For existing reservations without a rate type:
1. The system will fall back to the room type's base_price
2. To fix: Edit the reservation in the database and set the appropriate rate_type_id

## Database Schema Reference

### room_rate_types Table

```sql
CREATE TABLE room_rate_types (
    id UUID PRIMARY KEY,
    room_type_id UUID REFERENCES room_types(id),
    rate_name TEXT NOT NULL,
    rate_code TEXT NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    description TEXT,
    inclusions TEXT,
    min_nights INTEGER DEFAULT 1,
    max_nights INTEGER,
    cancellation_policy TEXT,
    advance_booking_days INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_type_id, rate_code)
);
```

### reservations Table Update

```sql
ALTER TABLE reservations
ADD COLUMN rate_type_id UUID REFERENCES room_rate_types(id);
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the migration SQL for any errors
3. Check Supabase logs for detailed error messages
4. Verify all indexes are created properly

---

**Version**: 1.0
**Last Updated**: 2025-11-17
**Compatibility**: Hotel Management System v1.0+
