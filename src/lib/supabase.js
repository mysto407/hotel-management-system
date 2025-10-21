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

// Reservations
export const getReservations = async() => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`
      *,
      guests (*),
      rooms (*, room_types (*))
    `)
        .order('created_at', { ascending: false })
    return { data, error }
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

// Payments
export const createPayment = async(payment) => {
    const { data, error } = await supabase
        .from('payments')
        .insert([payment])
        .select()
    return { data, error }
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