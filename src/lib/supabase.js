// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations

// Auth helpers
export const signUp = async(email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: userData
        }
    })
    return { data, error }
}

export const signIn = async(email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return { data, error }
}

export const signOut = async() => {
    const { error } = await supabase.auth.signOut()
    return { error }
}

export const getCurrentUser = async() => {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// Room Types
export const getRoomTypes = async() => {
    const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .order('name')
    return { data, error }
}

export const createRoomType = async(roomType) => {
    const { data, error } = await supabase
        .from('room_types')
        .insert([roomType])
        .select()
    return { data, error }
}

export const updateRoomType = async(id, roomType) => {
    const { data, error } = await supabase
        .from('room_types')
        .update(roomType)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteRoomType = async(id) => {
    const { error } = await supabase
        .from('room_types')
        .delete()
        .eq('id', id)
    return { error }
}

// Room Rate Types
export const getRoomRateTypes = async(roomTypeId = null) => {
    let query = supabase
        .from('room_rate_types')
        .select('*, room_types(*)')
        .order('is_default', { ascending: false })
        .order('rate_name')

    if (roomTypeId) {
        query = query.eq('room_type_id', roomTypeId)
    }

    const { data, error } = await query
    return { data, error }
}

export const getActiveRoomRateTypes = async(roomTypeId, checkInDate = null) => {
    let query = supabase
        .from('room_rate_types')
        .select('*, room_types(*)')
        .eq('room_type_id', roomTypeId)
        .eq('is_active', true)
        .order('is_default', { ascending: false })
        .order('rate_name')

    // Filter by date availability if check-in date is provided
    if (checkInDate) {
        query = query
            .or(`valid_from.is.null,valid_from.lte.${checkInDate}`)
            .or(`valid_to.is.null,valid_to.gte.${checkInDate}`)
    }

    const { data, error } = await query
    return { data, error }
}

export const getDefaultRateType = async(roomTypeId) => {
    const { data, error } = await supabase
        .from('room_rate_types')
        .select('*')
        .eq('room_type_id', roomTypeId)
        .eq('is_default', true)
        .eq('is_active', true)
        .single()
    return { data, error }
}

export const createRoomRateType = async(rateType) => {
    const { data, error } = await supabase
        .from('room_rate_types')
        .insert([rateType])
        .select()
    return { data, error }
}

export const updateRoomRateType = async(id, rateType) => {
    const { data, error } = await supabase
        .from('room_rate_types')
        .update(rateType)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteRoomRateType = async(id) => {
    const { error } = await supabase
        .from('room_rate_types')
        .delete()
        .eq('id', id)
    return { error }
}

export const setDefaultRateType = async(roomTypeId, rateTypeId) => {
    // First, unset all defaults for this room type
    await supabase
        .from('room_rate_types')
        .update({ is_default: false })
        .eq('room_type_id', roomTypeId)

    // Then set the new default
    const { data, error } = await supabase
        .from('room_rate_types')
        .update({ is_default: true })
        .eq('id', rateTypeId)
        .select()

    return { data, error }
}

// Rooms
export const getRooms = async() => {
    const { data, error } = await supabase
        .from('rooms')
        .select(`
      *,
      room_types (*)
    `)
        .order('room_number')
    return { data, error }
}

export const createRoom = async(room) => {
    const { data, error } = await supabase
        .from('rooms')
        .insert([room])
        .select()
    return { data, error }
}

export const updateRoom = async(id, room) => {
    const { data, error } = await supabase
        .from('rooms')
        .update(room)
        .eq('id', id)
        .select()
    return { data, error }
}

export const updateRoomStatus = async(id, status) => {
    const { data, error } = await supabase
        .from('rooms')
        .update({ status })
        .eq('id', id)
        .select()
    return { data, error }
}

// Sync room statuses based on current reservations
// This updates room statuses for display purposes only
// Availability is always determined by date-based queries
export const syncRoomStatuses = async() => {
    const today = new Date().toISOString().split('T')[0]

    // Get all rooms
    const { data: allRooms, error: roomsError } = await supabase
        .from('rooms')
        .select('id, status')

    if (roomsError) return { error: roomsError }

    // Get all active reservations (not cancelled or checked-out)
    const { data: activeReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('room_id, check_in_date, check_out_date, status')
        .not('status', 'in', '("Cancelled","Checked-out")')

    if (reservationsError) return { error: reservationsError }

    // Determine the correct status for each room
    const updates = []
    for (const room of allRooms) {
        // Skip rooms in Maintenance or Blocked status (operational statuses)
        if (room.status === 'Maintenance' || room.status === 'Blocked') {
            continue
        }

        // Find if room has any active reservation
        const roomReservations = activeReservations.filter(r => r.room_id === room.id)

        let newStatus = 'Available'
        for (const reservation of roomReservations) {
            const checkIn = reservation.check_in_date
            const checkOut = reservation.check_out_date

            // If today is between check-in and check-out, room is Occupied
            if (today >= checkIn && today < checkOut) {
                newStatus = reservation.status === 'Checked-in' ? 'Occupied' : 'Reserved'
                break
            }
            // If reservation is in the future, room is Reserved
            else if (today < checkIn) {
                newStatus = 'Reserved'
            }
        }

        // Only update if status changed
        if (room.status !== newStatus) {
            updates.push({ id: room.id, status: newStatus })
        }
    }

    // Perform bulk updates
    if (updates.length > 0) {
        for (const update of updates) {
            await updateRoomStatus(update.id, update.status)
        }
    }

    return { data: { updated: updates.length }, error: null }
}

export const deleteRoom = async(id) => {
    const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id)
    return { error }
}

// Guests
export const getGuests = async() => {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false })
    return { data, error }
}

export const getGuestByPhone = async(phone) => {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('phone', phone)
        .single()
    return { data, error }
}

export const getGuestByEmail = async(email) => {
    const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('email', email)
        .single()
    return { data, error }
}

export const createGuest = async(guest) => {
    const { data, error } = await supabase
        .from('guests')
        .insert([guest])
        .select()
    return { data, error }
}

export const updateGuest = async(id, guest) => {
    const { data, error } = await supabase
        .from('guests')
        .update(guest)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteGuest = async(id) => {
    const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id)
    return { error }
}

// Meal Plans
export const getMealPlans = async() => {
    const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .order('sort_order')
    return { data, error }
}

export const getActiveMealPlans = async() => {
    const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
    return { data, error }
}

export const getMealPlanByCode = async(code) => {
    const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('code', code)
        .single()
    return { data, error }
}

export const createMealPlan = async(mealPlan) => {
    const { data, error } = await supabase
        .from('meal_plans')
        .insert([mealPlan])
        .select()
    return { data, error }
}

export const updateMealPlan = async(id, mealPlan) => {
    const { data, error } = await supabase
        .from('meal_plans')
        .update(mealPlan)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteMealPlan = async(id) => {
    const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id)
    return { error }
}

// Reservations
export const getReservations = async() => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`
      *,
      guests (*),
      rooms (*, room_types (*)),
      agents (*),
      room_rate_types (*)
    `)
        .order('created_at', { ascending: false })
    return { data, error }
}

// Get available rooms for a specific date range
export const getAvailableRooms = async(checkInDate, checkOutDate) => {
    // First, get all rooms with their types
    // Exclude only rooms that are in Maintenance or Blocked status
    // (these are operational statuses unrelated to reservations)
    const { data: allRooms, error: roomsError } = await supabase
        .from('rooms')
        .select(`
            *,
            room_types (*)
        `)
        .not('status', 'in', '("Maintenance","Blocked")')
        .order('room_number')

    if (roomsError) return { data: null, error: roomsError }

    // Get all reservations that overlap with the requested date range
    // A reservation overlaps if:
    // - Its check-in is before our check-out AND
    // - Its check-out is after our check-in
    // AND the reservation is not cancelled or checked-out
    const { data: overlappingReservations, error: reservationsError } = await supabase
        .from('reservations')
        .select('room_id')
        .lt('check_in_date', checkOutDate)
        .gt('check_out_date', checkInDate)
        .not('status', 'in', '("Cancelled","Checked-out")')

    if (reservationsError) return { data: null, error: reservationsError }

    // Extract room IDs that are already booked
    const bookedRoomIds = overlappingReservations.map(r => r.room_id)

    // Filter out booked rooms based on date overlap
    // Room status (Occupied/Reserved/Available) is now only for display purposes
    const availableRooms = allRooms.filter(room =>
        !bookedRoomIds.includes(room.id)
    )

    return { data: availableRooms, error: null }
}

export const createReservation = async(reservation) => {
    const { data, error } = await supabase
        .from('reservations')
        .insert([reservation])
        .select()
    return { data, error }
}

export const updateReservation = async(id, reservation) => {
    const { data, error } = await supabase
        .from('reservations')
        .update(reservation)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteReservation = async(id) => {
    const { error } = await supabase
        .from('reservations')
        .delete()
        .eq('id', id)
    return { error }
}

// Bills
export const getBills = async() => {
    const { data, error } = await supabase
        .from('bills')
        .select(`
      *,
      reservations (
        *,
        guests (*),
        rooms (*)
      ),
      bill_items (*)
    `)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const createBill = async(bill, items) => {
    // First create the bill
    const { data: billData, error: billError } = await supabase
        .from('bills')
        .insert([bill])
        .select()

    if (billError) return { data: null, error: billError }

    // Then create bill items
    const billItems = items.map(item => ({
        ...item,
        bill_id: billData[0].id
    }))

    const { error: itemsError } = await supabase
        .from('bill_items')
        .insert(billItems)

    if (itemsError) return { data: null, error: itemsError }

    return { data: billData[0], error: null }
}

export const updateBill = async(id, bill) => {
    const { data, error } = await supabase
        .from('bills')
        .update(bill)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteBill = async(id) => {
    const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id)
    return { error }
}

// Bill Items
export const getBillItems = async(billId) => {
    const { data, error } = await supabase
        .from('bill_items')
        .select('*')
        .eq('bill_id', billId)
        .order('created_at')
    return { data, error }
}

export const createBillItem = async(billItem) => {
    const { data, error } = await supabase
        .from('bill_items')
        .insert([billItem])
        .select()
    return { data, error }
}

export const updateBillItem = async(id, billItem) => {
    const { data, error } = await supabase
        .from('bill_items')
        .update(billItem)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteBillItem = async(id) => {
    const { error } = await supabase
        .from('bill_items')
        .delete()
        .eq('id', id)
    return { error }
}

// Payments
export const getPayments = async(billId = null) => {
    let query = supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false })

    if (billId) {
        query = query.eq('bill_id', billId)
    }

    const { data, error } = await query
    return { data, error }
}

export const getPaymentsByReservation = async(reservationId) => {
    // Get all bills for this reservation first
    const { data: bills, error: billsError } = await supabase
        .from('bills')
        .select('id')
        .eq('reservation_id', reservationId)

    if (billsError) return { data: null, error: billsError }

    const billIds = bills.map(b => b.id)

    if (billIds.length === 0) {
        return { data: [], error: null }
    }

    const { data, error } = await supabase
        .from('payments')
        .select('*')
        .in('bill_id', billIds)
        .order('created_at', { ascending: false })

    return { data, error }
}

export const createPayment = async(payment) => {
    const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select()
    return { data, error }
}

export const updatePayment = async(id, payment) => {
    const { data, error } = await supabase
        .from('payments')
        .update(payment)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deletePayment = async(id) => {
    const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)
    return { error }
}

// Inventory
export const getInventoryItems = async() => {
    const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name')
    return { data, error }
}

export const createInventoryItem = async(item) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .insert([item])
        .select()
    return { data, error }
}

export const updateInventoryItem = async(id, item) => {
    const { data, error } = await supabase
        .from('inventory_items')
        .update(item)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteInventoryItem = async(id) => {
    const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
    return { error }
}

export const getInventoryTransactions = async() => {
    const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
      *,
      inventory_items (*),
      users (name)
    `)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const createInventoryTransaction = async(transaction) => {
    const { data, error } = await supabase
        .from('inventory_transactions')
        .insert([transaction])
        .select()
    return { data, error }
}

// Agent CRUD operations
export const getAgents = async() => {
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('name')
    return { data, error }
}

export const createAgent = async(agent) => {
    const { data, error } = await supabase
        .from('agents')
        .insert([agent])
        .select()
    return { data, error }
}

export const updateAgent = async(id, agent) => {
    const { data, error } = await supabase
        .from('agents')
        .update(agent)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteAgent = async(id) => {
    const { error } = await supabase
        .from('agents')
        .delete()
        .eq('id', id)
    return { error }
}

// Hotel Settings
// In src/lib/supabase.js

export const getHotelSettings = async() => {
    const { data, error } = await supabase
        .from('hotel_settings')
        .select('*')

    // Convert jsonb values to strings
    if (data) {
        data.forEach(setting => {
            if (typeof setting.setting_value === 'object') {
                setting.setting_value = setting.setting_value;
            } else if (typeof setting.setting_value === 'string') {
                // Already a string, keep as is
            }
        });
    }

    return { data, error }
}

export const updateHotelSetting = async(key, value) => {
    const { data, error } = await supabase
        .from('hotel_settings')
        .upsert({
            setting_key: key,
            setting_value: value
        }, {
            onConflict: 'setting_key',
            ignoreDuplicates: false
        })
        .select()
    return { data, error }
}

// Expense Categories
export const getExpenseCategories = async() => {
    const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('name')
    return { data, error }
}

export const createExpenseCategory = async(name) => {
    const { data, error } = await supabase
        .from('expense_categories')
        .insert([{ name }])
        .select()
    return { data, error }
}

export const deleteExpenseCategory = async(id) => {
    const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)
    return { error }
}

// Expense Sheets
export const getExpenseSheets = async(categoryId) => {
    const { data, error } = await supabase
        .from('expense_sheets')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const createExpenseSheet = async(categoryId, name) => {
    const { data, error } = await supabase
        .from('expense_sheets')
        .insert([{
            category_id: categoryId,
            name
        }])
        .select()
    return { data, error }
}

export const updateExpenseSheet = async(id, updates) => {
    const { data, error } = await supabase
        .from('expense_sheets')
        .update(updates)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteExpenseSheet = async(id) => {
    const { error } = await supabase
        .from('expense_sheets')
        .delete()
        .eq('id', id)
    return { error }
}

// Expense Columns
export const getExpenseColumns = async(sheetId) => {
    const { data, error } = await supabase
        .from('expense_columns')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('column_order')
    return { data, error }
}

export const updateExpenseColumns = async(sheetId, columns) => {
    // First, delete all existing columns for this sheet
    await supabase
        .from('expense_columns')
        .delete()
        .eq('sheet_id', sheetId)

    // Then insert the new columns
    const columnsToInsert = columns.map((col, index) => ({
        sheet_id: sheetId,
        column_id: col.id,
        column_name: col.name,
        column_type: col.type,
        column_order: index
    }))

    const { data, error } = await supabase
        .from('expense_columns')
        .insert(columnsToInsert)
        .select()

    return { data, error }
}

// Expense Rows
export const getExpenseRows = async(sheetId) => {
    const { data, error } = await supabase
        .from('expense_rows')
        .select('*')
        .eq('sheet_id', sheetId)
        .order('date', { ascending: true })
    return { data, error }
}


export const bulkUpdateExpenseRows = async(sheetId, rows) => {
    // Separate existing rows (with UUID) from new rows (with temp IDs)
    const existingRows = rows.filter(row =>
        row.id && !String(row.id).startsWith('temp_')
    );
    const newRows = rows.filter(row =>
        !row.id || String(row.id).startsWith('temp_')
    );

    // Delete all existing rows for this sheet
    await supabase
        .from('expense_rows')
        .delete()
        .eq('sheet_id', sheetId);

    // Prepare all rows for insertion (both existing and new)
    const rowsToInsert = rows.map(row => ({
        sheet_id: sheetId,
        date: row.date,
        ref_no: row.refNo,
        total_amount: parseFloat(row.totalAmount) || 0,
        remarks: row.remarks,
        custom_data: row.customData
    }));

    const { data, error } = await supabase
        .from('expense_rows')
        .insert(rowsToInsert)
        .select();

    return { data, error };
}

// Discounts
export const getDiscounts = async() => {
    const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('priority', { ascending: false })
    return { data, error }
}

export const getActiveDiscounts = async() => {
    const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('enabled', true)
        .order('priority', { ascending: false })
    return { data, error }
}

export const getDiscountByPromoCode = async(promoCode) => {
    const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('promo_code', promoCode)
        .eq('enabled', true)
        .single()
    return { data, error }
}

export const getApplicableDiscounts = async(checkInDate, checkOutDate, roomTypeId, nights) => {
    const today = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .eq('enabled', true)
        .lte('minimum_nights', nights)
        .or(`valid_from.is.null,valid_from.lte.${checkInDate}`)
        .or(`valid_to.is.null,valid_to.gte.${today}`)
        .order('priority', { ascending: false })

    if (error) return { data: null, error }

    // Filter by room type if applicable
    const filtered = data.filter(discount => {
        // Check if discount has reached max uses
        if (discount.maximum_uses && discount.current_uses >= discount.maximum_uses) {
            return false
        }

        // Check if discount applies to this room type
        const applicableRoomTypes = discount.applicable_room_types || []
        if (applicableRoomTypes.length === 0) {
            return true // Applies to all room types
        }
        return applicableRoomTypes.includes(roomTypeId)
    })

    return { data: filtered, error: null }
}

export const createDiscount = async(discount) => {
    const { data, error } = await supabase
        .from('discounts')
        .insert([discount])
        .select()
    return { data, error }
}

export const updateDiscount = async(id, discount) => {
    const { data, error } = await supabase
        .from('discounts')
        .update(discount)
        .eq('id', id)
        .select()
    return { data, error }
}

export const deleteDiscount = async(id) => {
    const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', id)
    return { error }
}

export const toggleDiscountStatus = async(id, enabled) => {
    const { data, error } = await supabase
        .from('discounts')
        .update({ enabled })
        .eq('id', id)
        .select()
    return { data, error }
}

// Discount Applications
export const getDiscountApplications = async() => {
    const { data, error } = await supabase
        .from('discount_applications')
        .select(`
            *,
            discounts (*),
            reservations (
                *,
                guests (*),
                rooms (*)
            ),
            bills (*)
        `)
        .order('applied_at', { ascending: false })
    return { data, error }
}

export const getDiscountApplicationsByReservation = async(reservationId) => {
    const { data, error } = await supabase
        .from('discount_applications')
        .select(`
            *,
            discounts (*)
        `)
        .eq('reservation_id', reservationId)
    return { data, error }
}

export const getDiscountApplicationsByBill = async(billId) => {
    const { data, error } = await supabase
        .from('discount_applications')
        .select(`
            *,
            discounts (*)
        `)
        .eq('bill_id', billId)
    return { data, error }
}

export const createDiscountApplication = async(application) => {
    const { data, error } = await supabase
        .from('discount_applications')
        .insert([application])
        .select()
    return { data, error }
}

export const deleteDiscountApplication = async(id) => {
    const { error } = await supabase
        .from('discount_applications')
        .delete()
        .eq('id', id)
    return { error }
}

// =====================================================
// ENHANCED FOLIO SYSTEM
// =====================================================

// Folios
export const getFolios = async() => {
    const { data, error } = await supabase
        .from('folios')
        .select(`
            *,
            reservations (
                *,
                guests (*),
                rooms (*)
            )
        `)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const getFoliosByReservation = async(reservationId) => {
    const { data, error } = await supabase
        .from('folios')
        .select(`
            *,
            reservations (
                *,
                guests (*),
                rooms (*)
            )
        `)
        .eq('reservation_id', reservationId)
        .order('created_at')
    return { data, error }
}

export const getFolioById = async(folioId) => {
    const { data, error } = await supabase
        .from('folios')
        .select(`
            *,
            reservations (
                *,
                guests (*),
                rooms (*)
            ),
            rooms (
                *,
                room_types (*)
            ),
            guests (*)
        `)
        .eq('id', folioId)
        .single()
    return { data, error }
}

export const getMasterFolio = async(reservationId) => {
    const { data, error } = await supabase
        .from('folios')
        .select(`
            *,
            reservations (
                *,
                guests (*),
                rooms (*)
            )
        `)
        .eq('reservation_id', reservationId)
        .eq('folio_type', 'master')
        .single()
    return { data, error }
}

export const createFolio = async(folioData) => {
    const { data, error } = await supabase
        .from('folios')
        .insert([folioData])
        .select()
    return { data, error }
}

export const updateFolio = async(id, folioData) => {
    const { data, error } = await supabase
        .from('folios')
        .update(folioData)
        .eq('id', id)
        .select()
    return { data, error }
}

export const settleFolio = async(id, userId) => {
    const { data, error } = await supabase
        .from('folios')
        .update({
            status: 'settled',
            settled_at: new Date().toISOString(),
            settled_by: userId
        })
        .eq('id', id)
        .select()
    return { data, error }
}

export const reopenFolio = async(id) => {
    const { data, error } = await supabase
        .from('folios')
        .update({
            status: 'open',
            settled_at: null,
            settled_by: null
        })
        .eq('id', id)
        .select()
    return { data, error }
}

// Folio Transactions
export const getFolioTransactions = async(folioId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            folios (*),
            created_by:users!folio_transactions_created_by_fkey (
                id,
                name,
                email
            ),
            modified_by:users!folio_transactions_modified_by_fkey (
                id,
                name,
                email
            ),
            voided_by:users!folio_transactions_voided_by_fkey (
                id,
                name,
                email
            )
        `)
        .eq('folio_id', folioId)
        .order('posting_time', { ascending: false })
    return { data, error }
}

export const getTransactionsByReservation = async(reservationId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            folios (*),
            created_by:users!folio_transactions_created_by_fkey (
                id,
                name,
                email
            )
        `)
        .eq('reservation_id', reservationId)
        .order('posting_time', { ascending: false })
    return { data, error }
}

export const getTransactionById = async(transactionId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            folios (*),
            created_by:users!folio_transactions_created_by_fkey (*),
            modified_by:users!folio_transactions_modified_by_fkey (*),
            voided_by:users!folio_transactions_voided_by_fkey (*)
        `)
        .eq('id', transactionId)
        .single()
    return { data, error }
}

export const createTransaction = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([transactionData])
        .select()
    return { data, error }
}

export const updateTransaction = async(id, transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
    return { data, error }
}

export const voidTransaction = async(transactionId, userId, voidReason) => {
    const { data, error } = await supabase
        .rpc('void_transaction', {
            p_transaction_id: transactionId,
            p_user_id: userId,
            p_void_reason: voidReason
        })
    return { data, error }
}

export const deleteTransaction = async(id) => {
    const { error } = await supabase
        .from('folio_transactions')
        .delete()
        .eq('id', id)
    return { error }
}

// Transaction posting and batch operations
export const postRoomCharges = async(folioId, reservationId, checkInDate, checkOutDate, roomRate, userId) => {
    const checkIn = new Date(checkInDate)
    const checkOut = new Date(checkOutDate)
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

    const transactions = []
    for (let i = 0; i < nights; i++) {
        const postDate = new Date(checkIn)
        postDate.setDate(postDate.getDate() + i)

        transactions.push({
            folio_id: folioId,
            reservation_id: reservationId,
            transaction_type: 'room_charge',
            description: `Room Charge - Night ${i + 1}`,
            amount: roomRate,
            quantity: 1,
            rate: roomRate,
            category: 'room',
            status: 'posted',
            post_date: postDate.toISOString().split('T')[0],
            created_by: userId
        })
    }

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert(transactions)
        .select()

    return { data, error }
}

export const postTaxes = async(folioId, reservationId, subtotal, taxRate, userId) => {
    const taxAmount = subtotal * taxRate

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            folio_id: folioId,
            reservation_id: reservationId,
            transaction_type: 'tax',
            description: `GST ${taxRate * 100}%`,
            amount: taxAmount,
            quantity: 1,
            rate: taxAmount,
            category: 'tax',
            status: 'posted',
            created_by: userId
        }])
        .select()

    return { data, error }
}

// Transaction transfers
export const transferTransaction = async(transactionId, toFolioId, userId, reason = null) => {
    const { data, error } = await supabase
        .rpc('transfer_transaction_to_folio', {
            p_transaction_id: transactionId,
            p_to_folio_id: toFolioId,
            p_user_id: userId,
            p_reason: reason
        })
    return { data, error }
}

export const getTransferHistory = async(folioId) => {
    const { data, error } = await supabase
        .from('folio_transfer_history')
        .select(`
            *,
            transaction:folio_transactions (*),
            from_folio:folios!folio_transfer_history_from_folio_id_fkey (*),
            to_folio:folios!folio_transfer_history_to_folio_id_fkey (*),
            transferred_by:users (*)
        `)
        .or(`from_folio_id.eq.${folioId},to_folio_id.eq.${folioId}`)
        .order('transferred_at', { ascending: false })
    return { data, error }
}

// Audit Log
export const getAuditLog = async(entityType = null, entityId = null) => {
    let query = supabase
        .from('folio_audit_log')
        .select(`
            *,
            user:users (
                id,
                name,
                email
            )
        `)
        .order('timestamp', { ascending: false })

    if (entityType) {
        query = query.eq('entity_type', entityType)
    }

    if (entityId) {
        query = query.eq('entity_id', entityId)
    }

    const { data, error } = await query
    return { data, error }
}

export const getTransactionAuditLog = async(transactionId) => {
    const { data, error } = await supabase
        .from('folio_audit_log')
        .select(`
            *,
            user:users (*)
        `)
        .eq('entity_type', 'folio_transaction')
        .eq('entity_id', transactionId)
        .order('timestamp', { ascending: false })
    return { data, error }
}

// Posting Schedules
export const getPostingSchedules = async(folioId) => {
    const { data, error } = await supabase
        .from('folio_posting_schedules')
        .select(`
            *,
            folio:folios (*),
            created_by:users (*)
        `)
        .eq('folio_id', folioId)
        .order('next_post_date')
    return { data, error }
}

export const createPostingSchedule = async(scheduleData) => {
    const { data, error } = await supabase
        .from('folio_posting_schedules')
        .insert([scheduleData])
        .select()
    return { data, error }
}

export const updatePostingSchedule = async(id, scheduleData) => {
    const { data, error } = await supabase
        .from('folio_posting_schedules')
        .update(scheduleData)
        .eq('id', id)
        .select()
    return { data, error }
}

export const cancelPostingSchedule = async(id) => {
    const { data, error } = await supabase
        .from('folio_posting_schedules')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
    return { data, error }
}

// View queries
export const getFolioSummary = async(reservationId) => {
    const { data, error } = await supabase
        .from('v_folio_summary')
        .select('*')
        .eq('reservation_id', reservationId)
    return { data, error }
}

export const getTransactionDetails = async(folioId) => {
    const { data, error } = await supabase
        .from('v_transaction_details')
        .select('*')
        .eq('folio_id', folioId)
        .order('created_at', { ascending: false })
    return { data, error }
}

// Search and filter helpers
export const searchTransactions = async(searchTerm, filters = {}) => {
    let query = supabase
        .from('folio_transactions')
        .select(`
            *,
            folios (*),
            created_by:users!folio_transactions_created_by_fkey (*)
        `)

    // Apply search term
    if (searchTerm) {
        query = query.or(`description.ilike.%${searchTerm}%,transaction_number.ilike.%${searchTerm}%,reference_number.ilike.%${searchTerm}%`)
    }

    // Apply filters
    if (filters.transactionType) {
        query = query.eq('transaction_type', filters.transactionType)
    }

    if (filters.status) {
        query = query.eq('status', filters.status)
    }

    if (filters.category) {
        query = query.eq('category', filters.category)
    }

    if (filters.paymentMethod) {
        query = query.eq('payment_method', filters.paymentMethod)
    }

    if (filters.startDate) {
        query = query.gte('post_date', filters.startDate)
    }

    if (filters.endDate) {
        query = query.lte('post_date', filters.endDate)
    }

    if (filters.minAmount) {
        query = query.gte('amount', filters.minAmount)
    }

    if (filters.maxAmount) {
        query = query.lte('amount', filters.maxAmount)
    }

    query = query.order('posting_time', { ascending: false })

    const { data, error } = await query
    return { data, error }
}

// Folio calculations and summaries
export const calculateFolioTotals = async(folioId) => {
    const { data: transactions, error } = await supabase
        .from('folio_transactions')
        .select('transaction_type, base_currency_amount, status')
        .eq('folio_id', folioId)
        .eq('status', 'posted')

    if (error) return { data: null, error }

    const totals = {
        total_charges: 0,
        total_payments: 0,
        total_taxes: 0,
        total_discounts: 0,
        total_fees: 0,
        total_refunds: 0,
        balance: 0
    }

    transactions.forEach(txn => {
        const amount = parseFloat(txn.base_currency_amount) || 0

        switch (txn.transaction_type) {
            case 'room_charge':
            case 'addon_charge':
                totals.total_charges += amount
                break
            case 'tax':
                totals.total_taxes += amount
                break
            case 'fee':
                totals.total_fees += amount
                break
            case 'discount':
                totals.total_discounts += Math.abs(amount)
                break
            case 'payment':
            case 'deposit':
                totals.total_payments += amount
                break
            case 'refund':
                totals.total_refunds += amount
                break
        }
    })

    totals.balance = totals.total_charges + totals.total_taxes + totals.total_fees - totals.total_discounts - totals.total_payments + totals.total_refunds

    return { data: totals, error: null }
}

export const getTransactionsByDateRange = async(folioId, startDate, endDate) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            created_by:users!folio_transactions_created_by_fkey (*)
        `)
        .eq('folio_id', folioId)
        .gte('post_date', startDate)
        .lte('post_date', endDate)
        .eq('status', 'posted')
        .order('posting_time')
    return { data, error }
}

export const getTransactionsByType = async(folioId, transactionType) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            created_by:users!folio_transactions_created_by_fkey (*)
        `)
        .eq('folio_id', folioId)
        .eq('transaction_type', transactionType)
        .eq('status', 'posted')
        .order('posting_time', { ascending: false })
    return { data, error }
}

// Revenue breakdown
export const getRevenueBreakdown = async(folioId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select('category, base_currency_amount')
        .eq('folio_id', folioId)
        .eq('status', 'posted')
        .in('transaction_type', ['room_charge', 'addon_charge', 'fee'])

    if (error) return { data: null, error }

    const breakdown = {}
    data.forEach(txn => {
        const category = txn.category || 'other'
        const amount = parseFloat(txn.base_currency_amount) || 0

        if (!breakdown[category]) {
            breakdown[category] = 0
        }
        breakdown[category] += amount
    })

    return { data: breakdown, error: null }
}