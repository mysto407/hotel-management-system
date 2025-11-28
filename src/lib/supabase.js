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
      room_types (*),
      agents (*),
      room_rate_types (*),
      booking_id
    `)
        .order('created_at', { ascending: false })
    return { data, error }
}

// Get a single reservation by ID with all related data
export const getReservationById = async(reservationId) => {
    const { data, error } = await supabase
        .from('reservations')
        .select(`
      *,
      guests (*),
      rooms (*, room_types (*)),
      room_types (*),
      agents (*),
      room_rate_types (*)
    `)
        .eq('id', reservationId)
        .single()
    return { data, error }
}

// Get available rooms for a specific date range
// Accounts for both assigned reservations and unassigned reservations (by room type)
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

    // Get all ASSIGNED reservations that overlap with the requested date range
    const { data: assignedReservations, error: assignedError } = await supabase
        .from('reservations')
        .select('room_id')
        .lt('check_in_date', checkOutDate)
        .gt('check_out_date', checkInDate)
        .not('status', 'in', '("Cancelled","Checked-out")')
        .not('room_id', 'is', null)

    if (assignedError) return { data: null, error: assignedError }

    // Get all UNASSIGNED reservations that overlap (count per room type)
    const { data: unassignedReservations, error: unassignedError } = await supabase
        .from('reservations')
        .select('room_type_id')
        .lt('check_in_date', checkOutDate)
        .gt('check_out_date', checkInDate)
        .not('status', 'in', '("Cancelled","Checked-out")')
        .is('room_id', null)

    if (unassignedError) return { data: null, error: unassignedError }

    // Count unassigned reservations per room type
    const unassignedCountByType = {}
    unassignedReservations?.forEach(res => {
        if (res.room_type_id) {
            unassignedCountByType[res.room_type_id] = (unassignedCountByType[res.room_type_id] || 0) + 1
        }
    })

    // Extract room IDs that are already booked (assigned)
    const bookedRoomIds = assignedReservations?.map(r => r.room_id).filter(Boolean) || []

    // Filter out assigned rooms
    let availableRooms = allRooms.filter(room => !bookedRoomIds.includes(room.id))

    // For each room type with unassigned reservations, reduce available count
    // by removing that many rooms from the available list
    Object.entries(unassignedCountByType).forEach(([typeId, count]) => {
        const typeRooms = availableRooms.filter(r => r.room_type_id === typeId)
        // Remove 'count' rooms of this type from available (they're reserved for unassigned bookings)
        const roomsToRemove = typeRooms.slice(0, count).map(r => r.id)
        availableRooms = availableRooms.filter(r => !roomsToRemove.includes(r.id))
    })

    return { data: availableRooms, error: null }
}

// Get unassigned reservations (reservations without a specific room assigned)
export const getUnassignedReservations = async(startDate = null, endDate = null) => {
    let query = supabase
        .from('reservations')
        .select(`
            *,
            guests (*),
            room_types (*),
            agents (*),
            room_rate_types (*)
        `)
        .is('room_id', null)
        .not('status', 'in', '("Cancelled","Checked-out")')
        .order('check_in_date')

    if (startDate) query = query.gte('check_in_date', startDate)
    if (endDate) query = query.lte('check_in_date', endDate)

    const { data, error } = await query
    return { data, error }
}

// Assign a specific room to a reservation
export const assignRoomToReservation = async(reservationId, roomId, forceRoomType = false) => {
    // Get reservation details
    const { data: reservation, error: resError } = await supabase
        .from('reservations')
        .select('check_in_date, check_out_date, room_type_id')
        .eq('id', reservationId)
        .single()

    if (resError) return { data: null, error: resError }

    // Get room details
    const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('room_type_id, status')
        .eq('id', roomId)
        .single()

    if (roomError) return { data: null, error: roomError }

    // Validate room status
    if (room.status === 'Maintenance' || room.status === 'Blocked') {
        return { data: null, error: { message: `Room is ${room.status}` } }
    }

    // Validate room type matches (unless force move)
    if (!forceRoomType && room.room_type_id !== reservation.room_type_id) {
        return { data: null, error: { message: 'Room type mismatch', code: 'ROOM_TYPE_MISMATCH' } }
    }

    // Check for overlapping reservations on the target room
    const { data: conflicts, error: conflictError } = await supabase
        .from('reservations')
        .select('id')
        .eq('room_id', roomId)
        .lt('check_in_date', reservation.check_out_date)
        .gt('check_out_date', reservation.check_in_date)
        .not('status', 'in', '("Cancelled","Checked-out")')
        .neq('id', reservationId)

    if (conflictError) return { data: null, error: conflictError }

    if (conflicts?.length > 0) {
        return { data: null, error: { message: 'Room not available for selected dates - overlapping booking exists' } }
    }

    // Build update data
    const updateData = { room_id: roomId }

    // If force move, also update room_type_id to match the new room
    if (forceRoomType && room.room_type_id !== reservation.room_type_id) {
        updateData.room_type_id = room.room_type_id
    }

    // Assign room
    const { data, error } = await supabase
        .from('reservations')
        .update(updateData)
        .eq('id', reservationId)
        .select(`
            *,
            guests (*),
            rooms (*, room_types (*)),
            room_types (*),
            agents (*),
            room_rate_types (*)
        `)

    return { data: data?.[0], error }
}

// Auto-assign rooms to unassigned reservations
export const autoAssignRooms = async(reservationIds = null, roomTypeId = null) => {
    // Get unassigned reservations
    let query = supabase
        .from('reservations')
        .select('id, check_in_date, check_out_date, room_type_id')
        .is('room_id', null)
        .not('status', 'in', '("Cancelled","Checked-out")')
        .order('check_in_date')

    if (reservationIds) query = query.in('id', reservationIds)
    if (roomTypeId) query = query.eq('room_type_id', roomTypeId)

    const { data: reservations, error: fetchError } = await query
    if (fetchError) return { data: null, error: fetchError }

    const results = { assigned: [], failed: [] }

    for (const res of reservations || []) {
        // Get available rooms for this reservation's dates
        const { data: availableRooms, error: availError } = await getAvailableRooms(res.check_in_date, res.check_out_date)

        if (availError) {
            results.failed.push({ reservationId: res.id, error: availError.message })
            continue
        }

        // Find first available room of matching type
        const matchingRoom = availableRooms?.find(r => r.room_type_id === res.room_type_id)

        if (matchingRoom) {
            const { data, error } = await assignRoomToReservation(res.id, matchingRoom.id)
            if (error) {
                results.failed.push({ reservationId: res.id, error: error.message })
            } else {
                results.assigned.push({ reservationId: res.id, roomId: matchingRoom.id, roomNumber: matchingRoom.room_number })
            }
        } else {
            results.failed.push({ reservationId: res.id, error: 'No available rooms of matching type' })
        }
    }

    return { data: results, error: null }
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

// Split Reservation - Updates a reservation by splitting it into multiple segments
export const splitReservation = async(originalReservationId, splitData) => {
    try {
        // Get the original reservation
        const { data: originalReservation, error: fetchError } = await supabase
            .from('reservations')
            .select('*')
            .eq('id', originalReservationId)
            .single()

        if (fetchError) return { data: null, error: fetchError }

        // Group nights by room ID and consecutive dates
        // This handles multiple rooms per date (quantity > 1)
        const roomSegments = {}

        // Sort nights by date and room ID for proper grouping
        const sortedNights = [...splitData.nights].sort((a, b) => {
            const dateCompare = new Date(a.date) - new Date(b.date)
            if (dateCompare !== 0) return dateCompare
            return a.roomId.localeCompare(b.roomId)
        })

        for (const night of sortedNights) {
            const roomId = night.roomId

            if (!roomSegments[roomId]) {
                roomSegments[roomId] = []
            }

            // Check if this night is consecutive with the last segment for this room
            const segments = roomSegments[roomId]
            const lastSegment = segments[segments.length - 1]

            if (lastSegment) {
                const lastDate = new Date(lastSegment.endDate)
                const currentDate = new Date(night.date)
                const dayDiff = (currentDate - lastDate) / (1000 * 60 * 60 * 24)

                // If consecutive (next day), add to existing segment
                if (dayDiff === 1) {
                    lastSegment.endDate = night.date
                    lastSegment.nights.push(night)
                    lastSegment.totalPrice += night.price
                } else {
                    // Create new segment for this room
                    segments.push({
                        roomId: night.roomId,
                        roomTypeId: night.roomTypeId,
                        roomRateTypeId: night.roomRateTypeId,
                        startDate: night.date,
                        endDate: night.date,
                        nights: [night],
                        totalPrice: night.price,
                    })
                }
            } else {
                // First segment for this room
                segments.push({
                    roomId: night.roomId,
                    roomTypeId: night.roomTypeId,
                    roomRateTypeId: night.roomRateTypeId,
                    startDate: night.date,
                    endDate: night.date,
                    nights: [night],
                    totalPrice: night.price,
                })
            }
        }

        // Flatten all segments into a single array
        const allSegments = []
        for (const roomId in roomSegments) {
            allSegments.push(...roomSegments[roomId])
        }

        // Sort segments by start date to determine which becomes the primary
        allSegments.sort((a, b) => new Date(a.startDate) - new Date(b.startDate))

        if (allSegments.length === 0) {
            return { data: null, error: { message: 'No nights selected' } }
        }

        // Generate a booking reference for split reservations if there isn't one already
        const bookingReference = originalReservation.booking_reference || `SPLIT-${originalReservationId.substring(0, 8)}-${Date.now()}`

        // Update the original reservation with the first segment
        const firstSegment = allSegments[0]
        const firstCheckOut = new Date(firstSegment.endDate)
        firstCheckOut.setDate(firstCheckOut.getDate() + 1)

        // Note: This is an estimate. Actual taxes are calculated by the folio system at check-in
        // using tax_configurations table. This provides an initial total_amount for display.
        const { rate: taxRatePercent } = await getTotalTaxRate('room_charge')
        const taxRate = (taxRatePercent || 18) / 100
        const firstTax = firstSegment.totalPrice * taxRate
        const firstTotal = firstSegment.totalPrice + firstTax

        const updateData = {
            check_in_date: firstSegment.startDate,
            check_out_date: firstCheckOut.toISOString().split('T')[0],
            room_id: firstSegment.roomId,
            total_amount: firstTotal,
            booking_reference: bookingReference,
        }

        // Only update rate_type_id if it's provided, otherwise keep original
        if (firstSegment.roomRateTypeId) {
            updateData.rate_type_id = firstSegment.roomRateTypeId
        }

        const { data: updatedReservation, error: updateError } = await supabase
            .from('reservations')
            .update(updateData)
            .eq('id', originalReservationId)
            .select()

        if (updateError) {
            console.error('Error updating original reservation:', updateError)
            return { data: null, error: updateError }
        }

        const createdReservationIds = [originalReservationId]
        const errors = []

        // Create new reservations for all additional segments
        for (let i = 1; i < allSegments.length; i++) {
            const segment = allSegments[i]
            const segmentCheckOut = new Date(segment.endDate)
            segmentCheckOut.setDate(segmentCheckOut.getDate() + 1)

            const segmentTax = segment.totalPrice * taxRate
            const segmentTotal = segment.totalPrice + segmentTax

            const newReservationData = {
                guest_id: originalReservation.guest_id,
                room_id: segment.roomId,
                check_in_date: segment.startDate,
                check_out_date: segmentCheckOut.toISOString().split('T')[0],
                status: originalReservation.status,
                booking_source: originalReservation.booking_source,
                booking_reference: bookingReference,
                booking_id: originalReservation.booking_id, // Preserve booking_id to keep all segments linked
                agent_id: originalReservation.agent_id,
                number_of_adults: originalReservation.number_of_adults,
                number_of_children: originalReservation.number_of_children,
                number_of_infants: originalReservation.number_of_infants,
                total_amount: segmentTotal,
                advance_payment: 0, // No advance for split segments
                special_requests: originalReservation.special_requests,
                meal_plan: originalReservation.meal_plan,
                rate_type_id: segment.roomRateTypeId || originalReservation.rate_type_id,
                direct_source: originalReservation.direct_source,
                additional_guest_ids: originalReservation.additional_guest_ids,
            }

            const { data: newReservation, error: insertError } = await supabase
                .from('reservations')
                .insert([newReservationData])
                .select()

            if (!insertError && newReservation) {
                createdReservationIds.push(newReservation[0].id)
            } else if (insertError) {
                console.error('Error creating segment reservation:', insertError)
                console.error('Segment data:', segment)
                console.error('Insert data:', newReservationData)
                errors.push({ segment: i, error: insertError })
            }
        }

        // If any segments failed to create, return error
        if (errors.length > 0) {
            return {
                data: null,
                error: {
                    message: `Failed to create ${errors.length} reservation segment(s). Check console for details.`,
                    details: errors
                }
            }
        }

        // Fetch all created/updated reservations with full relations
        const { data: allReservationsWithRelations, error: relationsError } = await supabase
            .from('reservations')
            .select(`
                *,
                guests (*),
                rooms (
                    *,
                    room_types (*)
                ),
                room_rate_types (*),
                agents (*)
            `)
            .in('id', createdReservationIds)
            .order('check_in_date', { ascending: true })

        if (relationsError) {
            console.error('Error fetching reservations with relations:', relationsError)
        }

        return { data: {
            updatedReservation: updatedReservation[0],
            allReservations: allReservationsWithRelations || [],
            segments: allSegments
        }, error: null }

    } catch (error) {
        console.error('Error splitting reservation:', error)
        return { data: null, error }
    }
}

// Reservation Notes
export const getReservationNotes = async(reservationId) => {
    const { data, error } = await supabase
        .from('reservation_notes')
        .select('*')
        .eq('reservation_id', reservationId)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const getActiveReservationNotes = async(reservationId) => {
    const { data, error } = await supabase
        .from('reservation_notes')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const getArchivedReservationNotes = async(reservationId) => {
    const { data, error } = await supabase
        .from('reservation_notes')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('is_archived', true)
        .order('created_at', { ascending: false })
    return { data, error }
}

export const createReservationNote = async(note) => {
    const { data, error } = await supabase
        .from('reservation_notes')
        .insert([note])
        .select()
    return { data, error }
}

export const updateReservationNote = async(id, updates) => {
    const { data, error } = await supabase
        .from('reservation_notes')
        .update({
            ...updates,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
    return { data, error }
}

export const archiveReservationNote = async(id) => {
    return updateReservationNote(id, { is_archived: true })
}

export const unarchiveReservationNote = async(id) => {
    return updateReservationNote(id, { is_archived: false })
}

export const deleteReservationNote = async(id) => {
    const { error } = await supabase
        .from('reservation_notes')
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

// ============================================================================
// Folio Transactions - Enhanced Transaction System
// ============================================================================

// Folio Management Functions
export const createMasterFolio = async (reservationId, guestName = 'Guest') => {
    // Generate folio number
    const timestamp = Date.now().toString(36).toUpperCase()
    const folioNumber = `F-${timestamp}`

    const { data, error } = await supabase
        .from('folios')
        .insert({
            reservation_id: reservationId,
            folio_type: 'master',
            folio_number: folioNumber,
            name: `${guestName} - Main Folio`,
            is_active: true,
            checkout_status: 'open'
        })
        .select()

    return { data: data?.[0], error }
}

export const getFolioByReservation = async (reservationId) => {
    const { data, error } = await supabase
        .from('folios')
        .select('*')
        .eq('reservation_id', reservationId)
        .eq('folio_type', 'master')
        .single()

    return { data, error }
}

export const getOrCreateMasterFolio = async (reservationId, guestName = 'Guest') => {
    // First try to get existing folio
    const { data: existing } = await getFolioByReservation(reservationId)
    if (existing) {
        return { data: existing, error: null }
    }

    // Create new master folio
    return await createMasterFolio(reservationId, guestName)
}

// Transaction Types
export const TRANSACTION_TYPES = {
    ROOM_CHARGE: 'room_charge',
    SERVICE_CHARGE: 'service_charge',
    TAX: 'tax',
    FEE: 'fee',
    DISCOUNT: 'discount',
    PAYMENT_CASH: 'payment_cash',
    PAYMENT_CARD: 'payment_card',
    PAYMENT_ONLINE: 'payment_online',
    PAYMENT_BANK_TRANSFER: 'payment_bank_transfer',
    PAYMENT_OTHER: 'payment_other',
    REFUND: 'refund',
    ADJUSTMENT: 'adjustment',
    WRITE_OFF: 'write_off',
    REVERSAL: 'reversal',
    VOID: 'void',
    DEPOSIT: 'deposit',
    DEPOSIT_USAGE: 'deposit_usage'
}

export const TRANSACTION_STATUS = {
    POSTED: 'posted',
    PENDING: 'pending',
    REVERSED: 'reversed',
    VOIDED: 'voided',
    CANCELLED: 'cancelled'
}

export const SERVICE_CATEGORIES = {
    FOOD: 'food',
    BEVERAGE: 'beverage',
    MINIBAR: 'minibar',
    SPA: 'spa',
    LAUNDRY: 'laundry',
    ROOM_SERVICE: 'room_service',
    TELEPHONE: 'telephone',
    INTERNET: 'internet',
    PARKING: 'parking',
    CONFERENCE: 'conference',
    EXTRA_BED: 'extra_bed',
    OTHER: 'other'
}

// Get all transactions for a reservation
export const getTransactionsByReservation = async(reservationId, options = {}) => {
    let query = supabase
        .from('folio_transactions')
        .select(`
            *,
            created_by_user:users!created_by (
                id,
                name,
                email
            ),
            reversed_transaction:folio_transactions!reversed_transaction_id (
                id,
                transaction_type,
                amount,
                description
            )
        `)
        .eq('reservation_id', reservationId)

    // Apply filters if provided
    if (options.status) {
        query = query.eq('transaction_status', options.status)
    }
    if (options.type) {
        query = query.eq('transaction_type', options.type)
    }
    if (options.startDate) {
        query = query.gte('transaction_date', options.startDate)
    }
    if (options.endDate) {
        query = query.lte('transaction_date', options.endDate)
    }

    // Apply sorting
    const sortBy = options.sortBy || 'transaction_date'
    const sortOrder = options.sortOrder === 'asc' ? { ascending: true } : { ascending: false }
    query = query.order(sortBy, sortOrder)

    const { data, error } = await query
    return { data, error }
}

// Get transaction summary for a reservation
export const getReservationTransactionSummary = async(reservationId) => {
    const { data, error } = await supabase
        .from('v_reservation_transaction_summary')
        .select('*')
        .eq('reservation_id', reservationId)
        .single()

    return { data, error }
}

// Get reservation balance
export const getReservationBalance = async(reservationId) => {
    const { data, error } = await supabase
        .rpc('get_reservation_balance', { p_reservation_id: reservationId })

    return { data, error }
}

// Create a room charge transaction
export const createRoomCharge = async(transactionData) => {
    // Determine status based on whether scheduled_post_date is provided
    const status = transactionData.scheduled_post_date
        ? TRANSACTION_STATUS.PENDING
        : TRANSACTION_STATUS.POSTED

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.ROOM_CHARGE,
            transaction_status: status,
            amount: Math.abs(transactionData.amount), // Ensure positive
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a service charge transaction
export const createServiceCharge = async(transactionData) => {
    // Determine status based on whether scheduled_post_date is provided
    const status = transactionData.scheduled_post_date
        ? TRANSACTION_STATUS.PENDING
        : TRANSACTION_STATUS.POSTED

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.SERVICE_CHARGE,
            transaction_status: status,
            amount: Math.abs(transactionData.amount), // Ensure positive
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a tax transaction
export const createTax = async(transactionData) => {
    // Determine status based on whether scheduled_post_date is provided
    const status = transactionData.scheduled_post_date
        ? TRANSACTION_STATUS.PENDING
        : TRANSACTION_STATUS.POSTED

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.TAX,
            transaction_status: status,
            amount: Math.abs(transactionData.amount), // Ensure positive
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a fee transaction
export const createFee = async(transactionData) => {
    // Determine status based on whether scheduled_post_date is provided
    const status = transactionData.scheduled_post_date
        ? TRANSACTION_STATUS.PENDING
        : TRANSACTION_STATUS.POSTED

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.FEE,
            transaction_status: status,
            amount: Math.abs(transactionData.amount), // Ensure positive
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a discount transaction
export const createDiscountTransaction = async(transactionData) => {
    // Determine status based on whether scheduled_post_date is provided
    const status = transactionData.scheduled_post_date
        ? TRANSACTION_STATUS.PENDING
        : TRANSACTION_STATUS.POSTED

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.DISCOUNT,
            transaction_status: status,
            amount: -Math.abs(transactionData.amount), // Ensure negative (credit)
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a payment transaction
export const createPaymentTransaction = async(transactionData) => {
    // Determine payment type based on payment method
    let transactionType = TRANSACTION_TYPES.PAYMENT_OTHER
    const method = transactionData.payment_method?.toLowerCase()

    if (method === 'cash') {
        transactionType = TRANSACTION_TYPES.PAYMENT_CASH
    } else if (method === 'card') {
        transactionType = TRANSACTION_TYPES.PAYMENT_CARD
    } else if (method === 'upi' || method === 'online') {
        transactionType = TRANSACTION_TYPES.PAYMENT_ONLINE
    } else if (method === 'bank transfer' || method === 'bank_transfer') {
        transactionType = TRANSACTION_TYPES.PAYMENT_BANK_TRANSFER
    }

    // Determine transaction status based on gateway status
    let transactionStatus = TRANSACTION_STATUS.POSTED
    if (transactionData.gateway_status) {
        if (transactionData.gateway_status === 'pending' || transactionData.gateway_status === 'authorized') {
            transactionStatus = TRANSACTION_STATUS.PENDING
        } else if (transactionData.gateway_status === 'failed') {
            transactionStatus = TRANSACTION_STATUS.CANCELLED
        }
    }

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: transactionType,
            transaction_status: transactionStatus,
            amount: -Math.abs(transactionData.amount), // Ensure negative (credit)
            description: transactionData.description || `Payment via ${transactionData.payment_method}`,
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a refund transaction
export const createRefund = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.REFUND,
            transaction_status: TRANSACTION_STATUS.POSTED,
            amount: -Math.abs(transactionData.amount), // Ensure negative (credit)
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create an adjustment transaction
export const createAdjustment = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.ADJUSTMENT,
            transaction_status: TRANSACTION_STATUS.POSTED,
            // Amount can be positive or negative for adjustments
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a write-off transaction
export const createWriteOff = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.WRITE_OFF,
            transaction_status: TRANSACTION_STATUS.POSTED,
            amount: -Math.abs(transactionData.amount), // Ensure negative (credit)
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a deposit transaction
export const createDeposit = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.DEPOSIT,
            transaction_status: TRANSACTION_STATUS.POSTED,
            amount: -Math.abs(transactionData.amount), // Ensure negative (credit held)
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Create a deposit usage transaction
export const createDepositUsage = async(transactionData) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([{
            transaction_type: TRANSACTION_TYPES.DEPOSIT_USAGE,
            transaction_status: TRANSACTION_STATUS.POSTED,
            amount: Math.abs(transactionData.amount), // Ensure positive (using the deposit)
            ...transactionData
        }])
        .select()

    return { data, error }
}

// Reverse a transaction (creates a reversal transaction)
export const reverseTransaction = async(transactionId, reason, userId) => {
    const { data, error } = await supabase
        .rpc('reverse_transaction', {
            p_transaction_id: transactionId,
            p_reason: reason,
            p_user_id: userId
        })

    return { data, error }
}

// Void a transaction (marks as voided, only for pending transactions)
export const voidTransaction = async(transactionId, reason, userId) => {
    const { data, error } = await supabase
        .rpc('void_transaction', {
            p_transaction_id: transactionId,
            p_reason: reason,
            p_user_id: userId
        })

    return { data, error }
}

// Get child transactions (e.g., taxes linked to a charge)
export const getChildTransactions = async(parentTransactionId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('parent_transaction_id', parentTransactionId)
        .not('transaction_status', 'in', '("voided","reversed")')

    return { data, error }
}

// Void a transaction and all its children (cascading void)
export const voidTransactionWithChildren = async(transactionId, reason, userId) => {
    const voidedTransactions = []

    // 1. Get all child transactions first
    const { data: children } = await getChildTransactions(transactionId)

    // 2. Void child transactions first (taxes, fees linked to this charge)
    if (children && children.length > 0) {
        for (const child of children) {
            const { data: childVoid, error: childError } = await voidTransaction(
                child.id,
                `${reason} (parent voided)`,
                userId
            )
            if (!childError) {
                voidedTransactions.push(child.id)
            }
        }
    }

    // 3. Void the parent transaction
    const { data, error } = await voidTransaction(transactionId, reason, userId)

    if (!error) {
        voidedTransactions.push(transactionId)
    }

    return {
        data: { voidedTransactions, parentVoided: !error },
        error,
        childrenVoided: children?.length || 0
    }
}

// Update a transaction
export const updateTransaction = async(transactionId, updates) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()

    return { data, error }
}

// Delete a transaction (use carefully - prefer reversals for posted transactions)
export const deleteTransaction = async(transactionId) => {
    const { error } = await supabase
        .from('folio_transactions')
        .delete()
        .eq('id', transactionId)

    return { error }
}

// Get transaction details by ID
export const getTransactionById = async(transactionId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            created_by_user:users!created_by (
                id,
                name,
                email
            ),
            reservation:reservations (
                id,
                confirmation_number,
                guest:guests (
                    id,
                    name,
                    email,
                    phone
                ),
                room:rooms (
                    id,
                    room_number
                )
            )
        `)
        .eq('id', transactionId)
        .single()

    return { data, error }
}

// Get all transactions (with pagination and filters)
export const getAllTransactions = async(options = {}) => {
    let query = supabase
        .from('folio_transactions')
        .select(`
            *,
            created_by_user:users!created_by (name),
            reservation:reservations (
                confirmation_number,
                guest:guests (name)
            )
        `, { count: 'exact' })

    // Apply filters
    if (options.status) {
        query = query.eq('transaction_status', options.status)
    }
    if (options.type) {
        query = query.eq('transaction_type', options.type)
    }
    if (options.startDate) {
        query = query.gte('transaction_date', options.startDate)
    }
    if (options.endDate) {
        query = query.lte('transaction_date', options.endDate)
    }
    if (options.reservationId) {
        query = query.eq('reservation_id', options.reservationId)
    }

    // Pagination
    const page = options.page || 1
    const pageSize = options.pageSize || 50
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    query = query.range(from, to)

    // Sorting
    const sortBy = options.sortBy || 'transaction_date'
    const sortOrder = options.sortOrder === 'asc' ? { ascending: true } : { ascending: false }
    query = query.order(sortBy, sortOrder)

    const { data, error, count } = await query

    return {
        data,
        error,
        count,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0
    }
}

// ============================================================================
// Transaction Business Logic Functions
// ============================================================================

// Generate daily room charges for a reservation
export const generateDailyRoomCharges = async (
    reservationId,
    folioId,
    roomRate,
    checkInDate,
    checkOutDate,
    roomNumber,
    userId
) => {
    const { data, error } = await supabase.rpc('generate_daily_room_charges', {
        p_reservation_id: reservationId,
        p_folio_id: folioId,
        p_room_rate: roomRate,
        p_check_in_date: checkInDate,
        p_check_out_date: checkOutDate,
        p_room_number: roomNumber,
        p_user_id: userId
    })

    if (error) {
        console.error('Error generating daily room charges:', error)
        return { data: null, error }
    }

    return { data, error: null }
}

// Auto-post scheduled transactions that are due
export const autoPostScheduledTransactions = async () => {
    const { data, error } = await supabase.rpc('auto_post_scheduled_transactions')

    if (error) {
        console.error('Error auto-posting scheduled transactions:', error)
        return { data: null, error }
    }

    return { data, error: null }
}

// Create a reversal transaction for a payment
export const reversePayment = async (paymentTransactionId, userId, reason = null) => {
    // First get the original payment transaction
    const { data: originalTx, error: fetchError } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('id', paymentTransactionId)
        .single()

    if (fetchError) {
        console.error('Error fetching original payment:', fetchError)
        return { data: null, error: fetchError }
    }

    // Create a reversal transaction with negative amount
    const reversalData = {
        folio_id: originalTx.folio_id,
        reservation_id: originalTx.reservation_id,
        transaction_type: 'payment_reversal',
        transaction_category: originalTx.transaction_category,
        description: `Reversal: ${originalTx.description}${reason ? ` - ${reason}` : ''}`,
        amount: -Math.abs(originalTx.amount), // Negative to reverse
        transaction_date: new Date().toISOString(),
        transaction_status: 'posted',
        created_by: userId,
        parent_transaction_id: paymentTransactionId,
        notes: reason
    }

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([reversalData])
        .select()
        .single()

    if (error) {
        console.error('Error creating payment reversal:', error)
        return { data: null, error }
    }

    return { data, error: null }
}

// Create a refund transaction for a payment
export const refundPayment = async (paymentTransactionId, refundAmount, userId, reason = null) => {
    // First get the original payment transaction
    const { data: originalTx, error: fetchError } = await supabase
        .from('folio_transactions')
        .select('*')
        .eq('id', paymentTransactionId)
        .single()

    if (fetchError) {
        console.error('Error fetching original payment:', fetchError)
        return { data: null, error: fetchError }
    }

    // Validate refund amount
    if (refundAmount > Math.abs(originalTx.amount)) {
        return {
            data: null,
            error: { message: 'Refund amount cannot exceed original payment amount' }
        }
    }

    // Create a refund transaction
    const refundData = {
        folio_id: originalTx.folio_id,
        reservation_id: originalTx.reservation_id,
        transaction_type: 'payment_refund',
        transaction_category: originalTx.transaction_category,
        description: `Refund: ${originalTx.description}${reason ? ` - ${reason}` : ''}`,
        amount: -Math.abs(refundAmount), // Negative to refund
        transaction_date: new Date().toISOString(),
        transaction_status: 'posted',
        created_by: userId,
        parent_transaction_id: paymentTransactionId,
        notes: reason
    }

    const { data, error } = await supabase
        .from('folio_transactions')
        .insert([refundData])
        .select()
        .single()

    if (error) {
        console.error('Error creating payment refund:', error)
        return { data: null, error }
    }

    return { data, error: null }
}

// ============================================
// AUDIT LOG FUNCTIONS
// ============================================

/**
 * Manually log a transaction audit entry
 * (Note: Most audits are automatically logged via database triggers)
 */
export const logTransactionAudit = async ({
    transactionId,
    folioId,
    actionType,
    performedBy,
    performedByName,
    previousValues,
    newValues,
    changesSummary,
    metadata
}) => {
    const { data, error } = await supabase
        .from('transaction_audit_log')
        .insert([{
            transaction_id: transactionId,
            folio_id: folioId,
            action_type: actionType,
            performed_by: performedBy,
            performed_by_name: performedByName,
            previous_values: previousValues,
            new_values: newValues,
            changes_summary: changesSummary,
            metadata
        }])
        .select()

    return { data, error }
}

/**
 * Get audit log entries for a specific transaction
 */
export const getAuditLogByTransaction = async (transactionId) => {
    const { data, error } = await supabase
        .from('transaction_audit_log')
        .select(`
            *,
            transaction:folio_transactions(id, description, transaction_type, amount),
            user:users(id, name, email)
        `)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false })

    return { data, error }
}

/**
 * Get recent audit activity (for admin dashboard)
 */
export const getRecentAuditActivity = async (limit = 50) => {
    const { data, error } = await supabase
        .from('transaction_audit_log')
        .select(`
            *,
            transaction:folio_transactions(id, description, transaction_type, amount),
            folio:folios(id, folio_number, name),
            user:users(id, name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    return { data, error }
}

// ============================================================================
// Currency & Exchange Rate Functions
// ============================================================================

/**
 * Get base currency from hotel settings
 */
export const getBaseCurrency = async () => {
    const { data, error } = await supabase
        .from('hotel_settings')
        .select('setting_value')
        .eq('setting_key', 'base_currency')
        .single()

    if (error) return { data: 'INR', error: null } // Default to INR if not set
    return { data: data?.setting_value || 'INR', error: null }
}

/**
 * Set base currency in hotel settings
 */
export const setBaseCurrency = async (currencyCode) => {
    const { data, error } = await supabase
        .from('hotel_settings')
        .upsert({
            setting_key: 'base_currency',
            setting_value: currencyCode
        }, {
            onConflict: 'setting_key'
        })
        .select()

    return { data, error }
}

/**
 * Get current exchange rate for a currency pair
 * First checks the exchange_rate_history table, otherwise returns 1.0
 */
export const getExchangeRate = async (fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
        return { data: 1.0, error: null }
    }

    const { data, error } = await supabase
        .from('exchange_rate_history')
        .select('exchange_rate')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .order('rate_date', { ascending: false })
        .limit(1)
        .single()

    if (error || !data) {
        // No rate found, return 1.0 as default
        return { data: 1.0, error: null }
    }

    return { data: data.exchange_rate, error: null }
}

/**
 * Save exchange rate to history
 */
export const saveExchangeRate = async (fromCurrency, toCurrency, rate, source = 'manual', userId = null) => {
    const { data, error } = await supabase
        .from('exchange_rate_history')
        .insert([{
            from_currency: fromCurrency,
            to_currency: toCurrency,
            exchange_rate: rate,
            source: source,
            created_by: userId
        }])
        .select()

    return { data, error }
}

/**
 * Get exchange rate history for a currency pair
 */
export const getExchangeRateHistory = async (fromCurrency, toCurrency, limit = 30) => {
    const { data, error } = await supabase
        .from('exchange_rate_history')
        .select('*')
        .eq('from_currency', fromCurrency)
        .eq('to_currency', toCurrency)
        .order('rate_date', { ascending: false })
        .limit(limit)

    return { data, error }
}

/**
 * Get all recent exchange rates (for all currency pairs)
 */
export const getAllRecentExchangeRates = async () => {
    const { data, error } = await supabase
        .from('exchange_rate_history')
        .select('*')
        .order('rate_date', { ascending: false })

    if (error) return { data: null, error }

    // Get the most recent rate for each currency pair
    const rateMap = {}
    data.forEach(rate => {
        const key = `${rate.from_currency}-${rate.to_currency}`
        if (!rateMap[key]) {
            rateMap[key] = rate
        }
    })

    return { data: Object.values(rateMap), error: null }
}

/**
 * Convert amount from one currency to another
 * This will automatically fetch the exchange rate if needed
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
    if (fromCurrency === toCurrency) {
        return { data: parseFloat(amount), error: null }
    }

    const { data: rate, error } = await getExchangeRate(fromCurrency, toCurrency)

    if (error) return { data: null, error }

    const convertedAmount = parseFloat(amount) * parseFloat(rate)

    return { data: convertedAmount, error: null }
}

// ============================================================================
// PAYMENT GATEWAY INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Update gateway status for a transaction
 * Used to update payment status after gateway callback
 */
export const updateGatewayStatus = async (transactionId, gatewayData) => {
    const updates = {
        gateway_status: gatewayData.gateway_status,
        updated_at: new Date().toISOString()
    }

    // Update gateway transaction ID if provided
    if (gatewayData.gateway_transaction_id) {
        updates.gateway_transaction_id = gatewayData.gateway_transaction_id
    }

    // Update authorization number if provided
    if (gatewayData.authorization_number) {
        updates.authorization_number = gatewayData.authorization_number
    }

    // Update metadata if provided
    if (gatewayData.metadata) {
        updates.metadata = gatewayData.metadata
    }

    // Update transaction status based on gateway status
    if (gatewayData.gateway_status === 'completed') {
        updates.transaction_status = TRANSACTION_STATUS.POSTED
    } else if (gatewayData.gateway_status === 'failed') {
        updates.transaction_status = TRANSACTION_STATUS.CANCELLED
    } else if (gatewayData.gateway_status === 'pending' || gatewayData.gateway_status === 'authorized') {
        updates.transaction_status = TRANSACTION_STATUS.PENDING
    }

    const { data, error } = await supabase
        .from('folio_transactions')
        .update(updates)
        .eq('id', transactionId)
        .select()

    return { data, error }
}

/**
 * Get pending gateway transactions
 * Used to check for transactions that need processing
 */
export const getPendingGatewayTransactions = async (reservationId = null) => {
    let query = supabase
        .from('folio_transactions')
        .select(`
            *,
            reservation:reservations (
                id,
                confirmation_number,
                guest:guests (name, email, phone)
            )
        `)
        .in('transaction_type', [
            TRANSACTION_TYPES.PAYMENT_CARD,
            TRANSACTION_TYPES.PAYMENT_ONLINE
        ])
        .eq('gateway_status', 'pending')
        .order('transaction_date', { ascending: false })

    if (reservationId) {
        query = query.eq('reservation_id', reservationId)
    }

    const { data, error } = await query
    return { data, error }
}

/**
 * Get failed gateway transactions
 * Used to show transactions that need retry
 */
export const getFailedGatewayTransactions = async (reservationId = null) => {
    let query = supabase
        .from('folio_transactions')
        .select(`
            *,
            reservation:reservations (
                id,
                confirmation_number,
                guest:guests (name, email, phone)
            )
        `)
        .in('transaction_type', [
            TRANSACTION_TYPES.PAYMENT_CARD,
            TRANSACTION_TYPES.PAYMENT_ONLINE
        ])
        .eq('gateway_status', 'failed')
        .order('transaction_date', { ascending: false })

    if (reservationId) {
        query = query.eq('reservation_id', reservationId)
    }

    const { data, error } = await query
    return { data, error }
}

/**
 * Retry a failed gateway transaction
 * Creates a new transaction with the same details but resets gateway fields
 */
export const retryGatewayTransaction = async (transactionId) => {
    // Get the original transaction
    const { data: original, error: fetchError } = await getTransactionById(transactionId)

    if (fetchError) return { data: null, error: fetchError }
    if (!original) return { data: null, error: { message: 'Transaction not found' } }

    // Create a new transaction with same details but reset gateway fields
    const retryTransaction = {
        reservation_id: original.reservation_id,
        folio_id: original.folio_id,
        bill_id: original.bill_id,
        amount: original.amount,
        description: original.description + ' (Retry)',
        payment_method: original.payment_method,
        transaction_currency: original.transaction_currency,
        exchange_rate: original.exchange_rate,
        base_currency_amount: original.base_currency_amount,
        gateway_status: 'pending',
        notes: `Retry of transaction ${transactionId}. Original failed at: ${original.updated_at}`,
        metadata: {
            ...original.metadata,
            original_transaction_id: transactionId,
            retry_count: (original.metadata?.retry_count || 0) + 1,
            retry_timestamp: new Date().toISOString()
        }
    }

    const { data, error } = await createPaymentTransaction(retryTransaction)

    return { data, error }
}

/**
 * Get gateway transaction by gateway transaction ID
 * Used for webhook callbacks and reconciliation
 */
export const getTransactionByGatewayId = async (gatewayTransactionId) => {
    const { data, error } = await supabase
        .from('folio_transactions')
        .select(`
            *,
            reservation:reservations (
                id,
                confirmation_number,
                guest:guests (name, email, phone)
            )
        `)
        .eq('gateway_transaction_id', gatewayTransactionId)
        .single()

    return { data, error }
}

// ==================== Room Blockings ====================

/**
 * Get all room blockings
 */
export const getRoomBlockings = async () => {
    const { data, error } = await supabase
        .from('room_blockings')
        .select(`
            *,
            rooms (
                id,
                room_number,
                room_types (name)
            )
        `)
        .order('start_date', { ascending: true })

    return { data, error }
}

/**
 * Get room blockings for a specific room
 */
export const getRoomBlockingsByRoom = async (roomId) => {
    const { data, error } = await supabase
        .from('room_blockings')
        .select('*')
        .eq('room_id', roomId)
        .order('start_date', { ascending: true })

    return { data, error }
}

/**
 * Get room blockings within a date range
 */
export const getRoomBlockingsInRange = async (startDate, endDate) => {
    const { data, error } = await supabase
        .from('room_blockings')
        .select(`
            *,
            rooms (
                id,
                room_number,
                room_types (name)
            )
        `)
        .lt('start_date', endDate)
        .gt('end_date', startDate)
        .order('start_date', { ascending: true })

    return { data, error }
}

/**
 * Create a room blocking
 */
export const createRoomBlocking = async (blocking) => {
    const { data, error } = await supabase
        .from('room_blockings')
        .insert(blocking)
        .select()

    return { data, error }
}

/**
 * Update a room blocking
 */
export const updateRoomBlocking = async (id, blocking) => {
    const { data, error } = await supabase
        .from('room_blockings')
        .update(blocking)
        .eq('id', id)
        .select()

    return { data, error }
}

/**
 * Delete a room blocking
 */
export const deleteRoomBlocking = async (id) => {
    const { data, error } = await supabase
        .from('room_blockings')
        .delete()
        .eq('id', id)

    return { data, error }
}

// ============================================
// TAX CONFIGURATION FUNCTIONS
// ============================================

/**
 * Get all active tax configurations
 */
export const getTaxConfigurations = async () => {
    const { data, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('is_active', true)
        .order('name')

    return { data, error }
}

/**
 * Get tax configurations that apply to a specific charge type
 * @param {string} chargeType - The transaction type (e.g., 'room_charge', 'service_charge', 'fee')
 */
export const getTaxesForChargeType = async (chargeType) => {
    const { data, error } = await supabase
        .from('tax_configurations')
        .select('*')
        .eq('is_active', true)
        .contains('applies_to', [chargeType])
        .order('is_compound') // Non-compound taxes first
        .order('name')

    return { data, error }
}

/**
 * Get total tax rate percentage for a charge type (for display purposes)
 * @param {string} chargeType - The transaction type (e.g., 'room_charge', 'service_charge', 'fee')
 * @returns {Promise<{rate: number, taxes: Array, error: Error}>}
 */
export const getTotalTaxRate = async (chargeType = 'room_charge') => {
    const { data: taxes, error } = await getTaxesForChargeType(chargeType)

    if (error || !taxes || taxes.length === 0) {
        return { rate: 0, taxes: [], error }
    }

    // Calculate total rate (simple sum for non-compound taxes)
    const totalRate = taxes.reduce((sum, tax) => {
        // Check validity dates
        const today = new Date()
        if (tax.valid_from && new Date(tax.valid_from) > today) return sum
        if (tax.valid_to && new Date(tax.valid_to) < today) return sum
        return sum + parseFloat(tax.rate || 0)
    }, 0)

    return { rate: totalRate, taxes, error: null }
}

/**
 * Calculate tax amount for a given base amount using configured taxes
 * @param {number} baseAmount - The base amount to calculate tax on
 * @param {string} chargeType - The charge type for fetching applicable taxes
 * @returns {Promise<{taxAmount: number, rate: number, breakdown: Array}>}
 */
export const calculateTaxAmount = async (baseAmount, chargeType = 'room_charge') => {
    const { data: taxes, error } = await getTaxesForChargeType(chargeType)

    if (error || !taxes || taxes.length === 0) {
        return { taxAmount: 0, rate: 0, breakdown: [] }
    }

    let runningTotal = baseAmount
    let totalTax = 0
    const breakdown = []

    // Sort: non-compound first, then compound
    const sortedTaxes = [...taxes].sort((a, b) => {
        if (a.is_compound === b.is_compound) return 0
        return a.is_compound ? 1 : -1
    })

    for (const tax of sortedTaxes) {
        // Check validity dates
        const today = new Date()
        if (tax.valid_from && new Date(tax.valid_from) > today) continue
        if (tax.valid_to && new Date(tax.valid_to) < today) continue

        const taxBase = tax.is_compound ? runningTotal : baseAmount
        const taxAmount = Math.round((taxBase * tax.rate / 100) * 100) / 100

        breakdown.push({
            name: tax.name,
            code: tax.code,
            rate: parseFloat(tax.rate),
            amount: taxAmount,
            isCompound: tax.is_compound
        })

        totalTax += taxAmount
        runningTotal += taxAmount
    }

    const totalRate = breakdown.reduce((sum, t) => sum + t.rate, 0)

    return { taxAmount: totalTax, rate: totalRate, breakdown }
}

/**
 * Create a tax configuration
 */
export const createTaxConfiguration = async (taxConfig) => {
    const { data, error } = await supabase
        .from('tax_configurations')
        .insert(taxConfig)
        .select()

    return { data, error }
}

/**
 * Update a tax configuration
 */
export const updateTaxConfiguration = async (id, taxConfig) => {
    const { data, error } = await supabase
        .from('tax_configurations')
        .update({ ...taxConfig, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()

    return { data, error }
}

/**
 * Delete a tax configuration (soft delete by setting is_active = false)
 */
export const deleteTaxConfiguration = async (id) => {
    const { data, error } = await supabase
        .from('tax_configurations')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()

    return { data, error }
}

/**
 * Calculate and apply taxes to a charge transaction
 * Creates tax transactions linked to the parent charge
 *
 * @param {string} folioId - The folio ID
 * @param {string} reservationId - The reservation ID
 * @param {number} chargeAmount - The base amount to calculate tax on
 * @param {string} chargeType - The type of charge ('room_charge', 'service_charge', 'fee')
 * @param {string} parentTransactionId - Optional ID of the parent transaction for linking
 * @param {string} chargeDescription - Description of the charge for tax line item
 * @param {string} userId - The user creating the tax
 * @param {Date} scheduledPostDate - Optional scheduled post date for pending taxes
 * @returns {Promise<{data: Array, error: Error, totalTax: number}>}
 */
export const calculateAndApplyTaxes = async (
    folioId,
    reservationId,
    chargeAmount,
    chargeType,
    parentTransactionId = null,
    chargeDescription = '',
    userId = null,
    scheduledPostDate = null
) => {
    // Get applicable taxes
    const { data: taxes, error: taxError } = await getTaxesForChargeType(chargeType)

    if (taxError) {
        console.error('Error fetching tax configurations:', taxError)
        return { data: null, error: taxError, totalTax: 0 }
    }

    if (!taxes || taxes.length === 0) {
        return { data: [], error: null, totalTax: 0 }
    }

    const taxTransactions = []
    let runningTotal = chargeAmount
    let totalTax = 0

    // Process non-compound taxes first, then compound
    const sortedTaxes = [...taxes].sort((a, b) => {
        if (a.is_compound === b.is_compound) return 0
        return a.is_compound ? 1 : -1
    })

    for (const tax of sortedTaxes) {
        // Check validity dates
        const today = new Date()
        if (tax.valid_from && new Date(tax.valid_from) > today) continue
        if (tax.valid_to && new Date(tax.valid_to) < today) continue

        // Calculate tax amount
        const baseAmount = tax.is_compound ? runningTotal : chargeAmount
        const taxAmount = Math.round((baseAmount * tax.rate / 100) * 100) / 100 // Round to 2 decimal places

        // Determine status
        const status = scheduledPostDate ? TRANSACTION_STATUS.PENDING : TRANSACTION_STATUS.POSTED

        // Create tax transaction
        const { data: taxTx, error: createError } = await supabase
            .from('folio_transactions')
            .insert([{
                folio_id: folioId,
                reservation_id: reservationId,
                transaction_type: TRANSACTION_TYPES.TAX,
                transaction_status: status,
                transaction_date: new Date().toISOString(),
                scheduled_post_date: scheduledPostDate?.toISOString() || null,
                amount: taxAmount,
                description: `${tax.name} (${tax.rate}%)${chargeDescription ? ` on ${chargeDescription}` : ''}`,
                tax_rate: tax.rate,
                tax_name: tax.name,
                parent_transaction_id: parentTransactionId, // Link tax to parent charge for cascading void
                reference_number: null,
                notes: `Tax applied to ${chargeType}`,
                created_by: userId,
                auto_posted: !!scheduledPostDate,
                metadata: {
                    tax_config_id: tax.id,
                    tax_code: tax.code,
                    base_amount: baseAmount,
                    is_compound: tax.is_compound
                }
            }])
            .select()

        if (createError) {
            console.error('Error creating tax transaction:', createError)
            continue
        }

        if (taxTx && taxTx[0]) {
            taxTransactions.push(taxTx[0])
            totalTax += taxAmount
            runningTotal += taxAmount // Add to running total for compound taxes
        }
    }

    return { data: taxTransactions, error: null, totalTax }
}

/**
 * Generate daily room charges with automatic tax calculation
 * Enhanced version that also creates tax transactions
 *
 * @param {string} reservationId - The reservation ID
 * @param {string} folioId - The folio ID
 * @param {number} roomRate - The nightly room rate
 * @param {string} checkInDate - Check-in date
 * @param {string} checkOutDate - Check-out date
 * @param {string} roomNumber - Room number for description
 * @param {string} userId - The user ID
 * @param {boolean} applyTaxes - Whether to automatically apply taxes (default: true)
 * @returns {Promise<{data: object, error: Error}>}
 */
export const generateDailyRoomChargesWithTax = async (
    reservationId,
    folioId,
    roomRate,
    checkInDate,
    checkOutDate,
    roomNumber,
    userId,
    applyTaxes = true
) => {
    const roomCharges = []
    const taxCharges = []

    const startDate = new Date(checkInDate)
    const endDate = new Date(checkOutDate)

    // Calculate number of nights
    const nights = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))

    for (let i = 0; i < nights; i++) {
        const chargeDate = new Date(startDate)
        chargeDate.setDate(chargeDate.getDate() + i)

        // Set scheduled post date to midnight of the charge date
        const scheduledPostDate = new Date(chargeDate)
        scheduledPostDate.setHours(0, 0, 0, 0)

        const description = `Room ${roomNumber} - Night ${i + 1} of ${nights}`

        // Create room charge
        const { data: roomCharge, error: chargeError } = await createRoomCharge({
            folio_id: folioId,
            reservation_id: reservationId,
            amount: roomRate,
            quantity: 1,
            rate: roomRate,
            description: description,
            scheduled_post_date: scheduledPostDate.toISOString(),
            auto_posted: true,
            created_by: userId
        })

        if (chargeError) {
            console.error('Error creating room charge:', chargeError)
            continue
        }

        if (roomCharge && roomCharge[0]) {
            roomCharges.push(roomCharge[0])

            // Apply taxes if enabled
            if (applyTaxes) {
                const { data: taxes, totalTax } = await calculateAndApplyTaxes(
                    folioId,
                    reservationId,
                    roomRate,
                    'room_charge',
                    roomCharge[0].id,
                    description,
                    userId,
                    scheduledPostDate
                )
                if (taxes) {
                    taxCharges.push(...taxes)
                }
            }
        }
    }

    return {
        data: {
            roomCharges,
            taxCharges,
            totalNights: nights,
            totalRoomCharges: roomCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
            totalTaxCharges: taxCharges.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0)
        },
        error: null
    }
}

/**
 * Apply taxes to a service charge (meal plan, etc.)
 *
 * @param {string} folioId - The folio ID
 * @param {string} reservationId - The reservation ID
 * @param {number} amount - The service charge amount
 * @param {string} description - Description of the service
 * @param {string} serviceCategory - Category of service (meal_plan, laundry, etc.)
 * @param {string} userId - The user ID
 * @param {Date} scheduledPostDate - Optional scheduled post date
 * @returns {Promise<{serviceCharge: object, taxCharges: Array, error: Error}>}
 */
export const createServiceChargeWithTax = async (
    folioId,
    reservationId,
    amount,
    description,
    serviceCategory,
    userId,
    scheduledPostDate = null
) => {
    // Create the service charge
    const { data: serviceCharge, error: chargeError } = await createServiceCharge({
        folio_id: folioId,
        reservation_id: reservationId,
        amount: amount,
        quantity: 1,
        rate: amount,
        description: description,
        service_category: serviceCategory,
        scheduled_post_date: scheduledPostDate?.toISOString() || null,
        auto_posted: !!scheduledPostDate,
        created_by: userId
    })

    if (chargeError) {
        return { serviceCharge: null, taxCharges: [], error: chargeError }
    }

    // Apply taxes
    const { data: taxCharges, error: taxError } = await calculateAndApplyTaxes(
        folioId,
        reservationId,
        amount,
        'service_charge',
        serviceCharge?.[0]?.id,
        description,
        userId,
        scheduledPostDate
    )

    return {
        serviceCharge: serviceCharge?.[0],
        taxCharges: taxCharges || [],
        error: taxError
    }
}

// ============================================
// EXTRA PERSON FEE FUNCTIONS
// ============================================

/**
 * Generate extra person fee charges for a reservation
 * Creates fee transactions for extra adults and children beyond base occupancy
 *
 * @param {string} reservationId - The reservation ID
 * @param {string} folioId - The folio ID
 * @param {number} extraAdults - Number of adults beyond base occupancy
 * @param {number} extraChildren - Number of children
 * @param {number} adultFee - Fee per extra adult
 * @param {number} childFee - Fee per extra child
 * @param {number} nights - Number of nights
 * @param {string} feeUnit - 'per_night' or 'one_time'
 * @param {string} userId - The user ID
 * @param {boolean} applyTaxes - Whether to auto-apply taxes (default: true)
 * @returns {Promise<{data: object, error: Error}>}
 */
export const generateExtraPersonCharges = async (
    reservationId,
    folioId,
    extraAdults,
    extraChildren,
    adultFee,
    childFee,
    nights,
    feeUnit = 'per_night',
    userId = null,
    applyTaxes = true
) => {
    const extraPersonCharges = []
    const taxCharges = []
    let totalExtraFees = 0

    // Calculate total fees based on unit type
    const isPerNight = feeUnit === 'per_night'

    // Generate extra adult fees
    if (extraAdults > 0 && adultFee > 0) {
        if (isPerNight) {
            // Create a charge per night for extra adults
            const checkInDate = new Date()
            for (let i = 0; i < nights; i++) {
                const scheduledDate = new Date(checkInDate)
                scheduledDate.setDate(scheduledDate.getDate() + i)
                scheduledDate.setHours(0, 0, 0, 0)

                const dailyAdultFee = adultFee * extraAdults
                const description = `Extra Person Fee (${extraAdults} adult${extraAdults > 1 ? 's' : ''}) - Night ${i + 1}`

                const { data: feeCharge, error: feeError } = await createFee({
                    folio_id: folioId,
                    reservation_id: reservationId,
                    amount: dailyAdultFee,
                    description: description,
                    scheduled_post_date: scheduledDate.toISOString(),
                    auto_posted: true,
                    created_by: userId,
                    metadata: {
                        fee_type: 'extra_person',
                        extra_adults: extraAdults,
                        adult_fee: adultFee,
                        night: i + 1
                    }
                })

                if (!feeError && feeCharge?.[0]) {
                    extraPersonCharges.push(feeCharge[0])
                    totalExtraFees += dailyAdultFee

                    // Apply taxes if enabled
                    if (applyTaxes) {
                        const { data: taxes } = await calculateAndApplyTaxes(
                            folioId,
                            reservationId,
                            dailyAdultFee,
                            'fee',
                            feeCharge[0].id,
                            description,
                            userId,
                            scheduledDate
                        )
                        if (taxes) taxCharges.push(...taxes)
                    }
                }
            }
        } else {
            // One-time charge for all extra adults for entire stay
            const totalAdultFee = adultFee * extraAdults
            const description = `Extra Person Fee (${extraAdults} adult${extraAdults > 1 ? 's' : ''}) - Entire Stay`

            const { data: feeCharge, error: feeError } = await createFee({
                folio_id: folioId,
                reservation_id: reservationId,
                amount: totalAdultFee,
                description: description,
                created_by: userId,
                metadata: {
                    fee_type: 'extra_person',
                    extra_adults: extraAdults,
                    adult_fee: adultFee,
                    one_time: true
                }
            })

            if (!feeError && feeCharge?.[0]) {
                extraPersonCharges.push(feeCharge[0])
                totalExtraFees += totalAdultFee

                if (applyTaxes) {
                    const { data: taxes } = await calculateAndApplyTaxes(
                        folioId,
                        reservationId,
                        totalAdultFee,
                        'fee',
                        feeCharge[0].id,
                        description,
                        userId
                    )
                    if (taxes) taxCharges.push(...taxes)
                }
            }
        }
    }

    // Generate extra child fees
    if (extraChildren > 0 && childFee > 0) {
        if (isPerNight) {
            // Create a charge per night for extra children
            const checkInDate = new Date()
            for (let i = 0; i < nights; i++) {
                const scheduledDate = new Date(checkInDate)
                scheduledDate.setDate(scheduledDate.getDate() + i)
                scheduledDate.setHours(0, 0, 0, 0)

                const dailyChildFee = childFee * extraChildren
                const description = `Extra Child Fee (${extraChildren} child${extraChildren > 1 ? 'ren' : ''}) - Night ${i + 1}`

                const { data: feeCharge, error: feeError } = await createFee({
                    folio_id: folioId,
                    reservation_id: reservationId,
                    amount: dailyChildFee,
                    description: description,
                    scheduled_post_date: scheduledDate.toISOString(),
                    auto_posted: true,
                    created_by: userId,
                    metadata: {
                        fee_type: 'extra_person',
                        extra_children: extraChildren,
                        child_fee: childFee,
                        night: i + 1
                    }
                })

                if (!feeError && feeCharge?.[0]) {
                    extraPersonCharges.push(feeCharge[0])
                    totalExtraFees += dailyChildFee

                    if (applyTaxes) {
                        const { data: taxes } = await calculateAndApplyTaxes(
                            folioId,
                            reservationId,
                            dailyChildFee,
                            'fee',
                            feeCharge[0].id,
                            description,
                            userId,
                            scheduledDate
                        )
                        if (taxes) taxCharges.push(...taxes)
                    }
                }
            }
        } else {
            // One-time charge for all extra children for entire stay
            const totalChildFee = childFee * extraChildren
            const description = `Extra Child Fee (${extraChildren} child${extraChildren > 1 ? 'ren' : ''}) - Entire Stay`

            const { data: feeCharge, error: feeError } = await createFee({
                folio_id: folioId,
                reservation_id: reservationId,
                amount: totalChildFee,
                description: description,
                created_by: userId,
                metadata: {
                    fee_type: 'extra_person',
                    extra_children: extraChildren,
                    child_fee: childFee,
                    one_time: true
                }
            })

            if (!feeError && feeCharge?.[0]) {
                extraPersonCharges.push(feeCharge[0])
                totalExtraFees += totalChildFee

                if (applyTaxes) {
                    const { data: taxes } = await calculateAndApplyTaxes(
                        folioId,
                        reservationId,
                        totalChildFee,
                        'fee',
                        feeCharge[0].id,
                        description,
                        userId
                    )
                    if (taxes) taxCharges.push(...taxes)
                }
            }
        }
    }

    return {
        data: {
            extraPersonCharges,
            taxCharges,
            totalExtraFees,
            totalTaxes: taxCharges.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
            extraAdults,
            extraChildren
        },
        error: null
    }
}

// ============================================
// RATE PLAN ADD-ONS FUNCTIONS
// ============================================

/**
 * Get all add-ons for a rate type
 *
 * @param {string} rateTypeId - The rate type ID
 * @returns {Promise<{data: Array, error: Error}>}
 */
export const getRatePlanAddons = async (rateTypeId) => {
    const { data, error } = await supabase
        .from('rate_plan_addons')
        .select('*')
        .eq('rate_type_id', rateTypeId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

    return { data, error }
}

/**
 * Get all add-ons for a rate type (including inactive)
 *
 * @param {string} rateTypeId - The rate type ID
 * @returns {Promise<{data: Array, error: Error}>}
 */
export const getAllRatePlanAddons = async (rateTypeId) => {
    const { data, error } = await supabase
        .from('rate_plan_addons')
        .select('*')
        .eq('rate_type_id', rateTypeId)
        .order('sort_order', { ascending: true })

    return { data, error }
}

/**
 * Create a new rate plan add-on
 *
 * @param {object} addonData - The add-on data
 * @returns {Promise<{data: object, error: Error}>}
 */
export const createRatePlanAddon = async (addonData) => {
    const { data, error } = await supabase
        .from('rate_plan_addons')
        .insert([addonData])
        .select()

    return { data: data?.[0], error }
}

/**
 * Update a rate plan add-on
 *
 * @param {string} addonId - The add-on ID
 * @param {object} updates - The updates to apply
 * @returns {Promise<{data: object, error: Error}>}
 */
export const updateRatePlanAddon = async (addonId, updates) => {
    const { data, error } = await supabase
        .from('rate_plan_addons')
        .update(updates)
        .eq('id', addonId)
        .select()

    return { data: data?.[0], error }
}

/**
 * Delete a rate plan add-on
 *
 * @param {string} addonId - The add-on ID
 * @returns {Promise<{error: Error}>}
 */
export const deleteRatePlanAddon = async (addonId) => {
    const { error } = await supabase
        .from('rate_plan_addons')
        .delete()
        .eq('id', addonId)

    return { error }
}

/**
 * Generate charges for rate plan add-ons during check-in
 *
 * @param {string} folioId - The folio ID
 * @param {string} reservationId - The reservation ID
 * @param {object} addon - The add-on configuration
 * @param {number} nights - Number of nights
 * @param {number} guestCount - Total number of guests
 * @param {string} userId - The user ID
 * @param {boolean} applyTaxes - Whether to apply taxes
 * @returns {Promise<{data: object, error: Error}>}
 */
export const generateAddonCharges = async (
    folioId,
    reservationId,
    addon,
    nights,
    guestCount,
    userId,
    applyTaxes = true
) => {
    const addonCharges = []
    const taxCharges = []
    let totalAddonFees = 0

    if (!addon || addon.charge_type !== 'auto_charge' || !addon.price || addon.price <= 0) {
        return { data: { addonCharges, taxCharges, totalAddonFees }, error: null }
    }

    const price = parseFloat(addon.price)

    // Calculate total amount based on unit type
    let totalAmount = 0
    let description = ''

    switch (addon.unit) {
        case 'per_night':
            totalAmount = price * nights
            description = `${addon.name} (${nights} night${nights > 1 ? 's' : ''} × ₹${price.toFixed(2)})`
            break

        case 'per_stay':
            totalAmount = price
            description = `${addon.name} (Per Stay)`
            break

        case 'per_person_per_night':
            totalAmount = price * nights * guestCount
            description = `${addon.name} (${guestCount} guest${guestCount > 1 ? 's' : ''} × ${nights} night${nights > 1 ? 's' : ''} × ₹${price.toFixed(2)})`
            break

        default:
            totalAmount = price
            description = addon.name
    }

    // Create the add-on charge as a service charge
    const { data: chargeData, error: chargeError } = await supabase
        .from('folio_transactions')
        .insert([{
            folio_id: folioId,
            reservation_id: reservationId,
            transaction_type: 'service_charge',
            transaction_status: 'posted',
            amount: totalAmount,
            description: description,
            notes: addon.description || null,
            created_by: userId,
            auto_posted: true,
            metadata: {
                addon_id: addon.id,
                addon_name: addon.name,
                addon_unit: addon.unit,
                addon_price: addon.price,
                nights: nights,
                guest_count: guestCount
            }
        }])
        .select()

    if (chargeError) {
        console.error('Error creating add-on charge:', chargeError)
        return { data: null, error: chargeError }
    }

    if (chargeData?.[0]) {
        addonCharges.push(chargeData[0])
        totalAddonFees += totalAmount

        // Apply taxes if the add-on is taxable and taxes are enabled
        if (applyTaxes && addon.is_taxable) {
            const { data: taxes } = await calculateAndApplyTaxes(
                folioId,
                reservationId,
                totalAmount,
                'service_charge',
                chargeData[0].id,
                description,
                userId
            )
            if (taxes) taxCharges.push(...taxes)
        }
    }

    return {
        data: {
            addonCharges,
            taxCharges,
            totalAddonFees,
            totalTaxes: taxCharges.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
        },
        error: null
    }
}

/**
 * Generate all auto-charge add-ons for a reservation during check-in
 *
 * @param {string} rateTypeId - The rate type ID
 * @param {string} folioId - The folio ID
 * @param {string} reservationId - The reservation ID
 * @param {number} nights - Number of nights
 * @param {number} guestCount - Total number of guests
 * @param {string} userId - The user ID
 * @param {boolean} applyTaxes - Whether to apply taxes
 * @returns {Promise<{data: object, error: Error}>}
 */
export const generateAllAddonCharges = async (
    rateTypeId,
    folioId,
    reservationId,
    nights,
    guestCount,
    userId,
    applyTaxes = true
) => {
    const allAddonCharges = []
    const allTaxCharges = []
    let totalAddonFees = 0

    // Get active add-ons for this rate type
    const { data: addons, error: addonsError } = await getRatePlanAddons(rateTypeId)
    if (addonsError) {
        console.error('Error fetching add-ons:', addonsError)
        return { data: null, error: addonsError }
    }

    // Filter to only auto-charge add-ons
    const autoChargeAddons = (addons || []).filter(a => a.charge_type === 'auto_charge' && a.is_active)

    // Generate charges for each add-on
    for (const addon of autoChargeAddons) {
        const { data, error } = await generateAddonCharges(
            folioId,
            reservationId,
            addon,
            nights,
            guestCount,
            userId,
            applyTaxes
        )

        if (error) {
            console.error(`Error generating charges for add-on ${addon.name}:`, error)
            continue
        }

        if (data) {
            allAddonCharges.push(...data.addonCharges)
            allTaxCharges.push(...data.taxCharges)
            totalAddonFees += data.totalAddonFees
        }
    }

    return {
        data: {
            addonCharges: allAddonCharges,
            taxCharges: allTaxCharges,
            totalAddonFees,
            totalTaxes: allTaxCharges.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0),
            addonsProcessed: autoChargeAddons.length
        },
        error: null
    }
}
