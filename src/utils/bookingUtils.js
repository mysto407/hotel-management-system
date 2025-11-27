/**
 * Booking utilities for managing multi-date range reservations
 */

/**
 * Groups consecutive bookings into continuous stays
 * @param {Array} rooms - Array of room objects with checkIn, checkOut, and room details
 * @returns {Array} Array of grouped stays with room change information
 */
export function groupConsecutiveBookings(rooms) {
  if (!rooms || rooms.length === 0) return []

  // Sort rooms by check-in date
  const sortedRooms = [...rooms].sort((a, b) => {
    const dateA = new Date(a.checkIn)
    const dateB = new Date(b.checkIn)
    return dateA - dateB
  })

  const stays = []
  let currentStay = null

  sortedRooms.forEach(room => {
    if (!currentStay) {
      // Start a new stay
      currentStay = {
        checkIn: room.checkIn,
        checkOut: room.checkOut,
        rooms: [room],
        isConsecutive: false
      }
    } else {
      // Check if this room is consecutive with the current stay
      const currentCheckOut = new Date(currentStay.checkOut)
      const roomCheckIn = new Date(room.checkIn)

      // If check-in matches the current check-out (same day), it's consecutive
      if (currentCheckOut.getTime() === roomCheckIn.getTime()) {
        currentStay.checkOut = room.checkOut
        currentStay.rooms.push(room)
        currentStay.isConsecutive = true
      } else {
        // Not consecutive, save current stay and start a new one
        stays.push(currentStay)
        currentStay = {
          checkIn: room.checkIn,
          checkOut: room.checkOut,
          rooms: [room],
          isConsecutive: false
        }
      }
    }
  })

  // Don't forget to add the last stay
  if (currentStay) {
    stays.push(currentStay)
  }

  return stays
}

/**
 * Formats a room change sequence for display
 * @param {Array} rooms - Array of rooms in the stay
 * @returns {String} Formatted room change text (e.g., "Deluxe → Cottage → Suite")
 */
export function formatRoomChangeSequence(rooms) {
  if (rooms.length <= 1) return null

  return rooms.map(r => r.name).join(' → ')
}

/**
 * Gets the total nights for a stay (handles multiple rooms)
 * @param {Object} stay - Stay object with checkIn, checkOut, and rooms
 * @returns {Number} Total nights
 */
export function getStayNights(stay) {
  if (!stay.checkIn || !stay.checkOut) return 0

  const checkIn = new Date(stay.checkIn)
  const checkOut = new Date(stay.checkOut)
  return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
}

/**
 * Calculates total cost for a stay (all rooms combined)
 * @param {Object} stay - Stay object with rooms array
 * @returns {Object} Object with subtotal, tax, and total
 */
export function calculateStayCost(stay) {
  let subtotal = 0

  stay.rooms.forEach(room => {
    const roomCheckIn = new Date(room.checkIn)
    const roomCheckOut = new Date(room.checkOut)
    const nights = Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
    const roomRate = room.ratePrice || room.base_price || 0

    subtotal += roomRate * nights * room.quantity
  })

  const tax = subtotal * 0.18 // 18% GST
  const total = subtotal + tax

  return { subtotal, tax, total }
}

/**
 * Checks if two bookings are consecutive
 * @param {Object} booking1 - First booking with checkOut
 * @param {Object} booking2 - Second booking with checkIn
 * @returns {Boolean} True if consecutive
 */
export function areBookingsConsecutive(booking1, booking2) {
  if (!booking1.checkOut || !booking2.checkIn) return false

  const checkOut1 = new Date(booking1.checkOut)
  const checkIn2 = new Date(booking2.checkIn)

  return checkOut1.getTime() === checkIn2.getTime()
}

/**
 * Groups consecutive reservations from database (different field names)
 * @param {Array} reservations - Array of reservation objects from database
 * @param {Function} getRoomInfo - Function to get room info from room_id
 * @returns {Array} Array of grouped stays with room change information
 */
export function groupConsecutiveReservations(reservations, getRoomInfo) {
  if (!reservations || reservations.length === 0) return []

  // Convert reservations to the format expected by groupConsecutiveBookings
  const normalizedRooms = reservations.map(res => {
    const roomInfo = getRoomInfo ? getRoomInfo(res.room_id, res.room_type_id) : { type: 'Room' }
    return {
      ...res,
      checkIn: res.check_in_date,
      checkOut: res.check_out_date,
      name: roomInfo.type || 'Room',
      id: res.id
    }
  })

  return groupConsecutiveBookings(normalizedRooms)
}
