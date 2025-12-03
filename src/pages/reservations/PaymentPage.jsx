import { useState, useMemo, useEffect } from 'react'
import { ChevronLeft, Check, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useReservations } from '../../context/ReservationContext'
import { useGuests } from '../../context/GuestContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { useRooms } from '../../context/RoomContext'
import { useAlert } from '@/context/AlertContext'
import { getTotalTaxRate, validateRoomAvailability, validateRoomTypeAvailability } from '../../lib/supabase'
import StepIndicator from '../../components/reservations/StepIndicator'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
import { groupConsecutiveBookings, formatRoomChangeSequence, getStayNights } from '../../utils/bookingUtils'

export default function PaymentPage({ onNavigate }) {
  const {
    filters,
    selectedAgent,
    selectedRooms,
    addons,
    guestDetails,
    allGuestsDetails,
    paymentInfo,
    setPaymentInfo,
    calculateBill,
    resetFlow,
    applyPromoCode,
    appliedPromoCode,
    removeDiscount,
    assignLater,
    addToExistingBooking
  } = useReservationFlow()

  // Check if we're adding to an existing booking
  const isAddingToExisting = !!addToExistingBooking

  const { addReservation } = useReservations()
  const { addGuest, updateGuest, updateGuestStats } = useGuests()
  const { getMealPlanPrice, getMealPlanName } = useMealPlans()
  const { rooms } = useRooms()
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert()

  const [loading, setLoading] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [showAllGuests, setShowAllGuests] = useState(false)
  const [taxRate, setTaxRate] = useState(18) // Default to 18% for room charges
  const [foodTaxRate, setFoodTaxRate] = useState(5) // Default to 5% for food/meal plans

  // Load dynamic tax rates from tax_configurations
  useEffect(() => {
    const loadTaxRates = async () => {
      const { rate: roomRate } = await getTotalTaxRate('room_charge')
      const { rate: foodRate } = await getTotalTaxRate('food')
      if (roomRate > 0) setTaxRate(roomRate)
      if (foodRate > 0) setFoodTaxRate(foodRate)
    }
    loadTaxRates()
  }, [])

  // Get primary guest (first guest or fallback to guestDetails)
  const primaryGuest = allGuestsDetails.length > 0 ? allGuestsDetails[0] : guestDetails
  const additionalGuests = allGuestsDetails.slice(1)

  const bill = calculateBill()

  // Group consecutive bookings into continuous stays
  const stays = useMemo(() => groupConsecutiveBookings(selectedRooms), [selectedRooms])

  // Calculate total guest counts across all rooms
  const totalGuestCounts = selectedRooms.reduce((totals, roomType) => {
    // Sum up guest counts for all instances of this room type
    for (let i = 0; i < roomType.quantity; i++) {
      const guestCount = roomType.guestCounts?.[i] || { adults: 1, children: 0, infants: 0 }
      totals.adults += guestCount.adults || 1
      totals.children += guestCount.children || 0
      totals.infants += guestCount.infants || 0
    }
    return totals
  }, { adults: 0, children: 0, infants: 0 })

  // Calculate total number of guests and additional guests count
  const totalGuests = totalGuestCounts.adults + totalGuestCounts.children + totalGuestCounts.infants
  const expectedAdditionalGuests = Math.max(0, totalGuests - 1) // Subtract 1 for primary guest
  const hasAdditionalGuests = expectedAdditionalGuests > 0

  // Handle promo code application
  const handleApplyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      showWarning('Please enter a promo code')
      return
    }

    setApplyingPromo(true)
    const result = await applyPromoCode(promoCodeInput.trim())
    setApplyingPromo(false)

    if (result.success) {
      showSuccess(`Promo code "${promoCodeInput}" applied successfully!`)
      setPromoCodeInput('')
    } else {
      showError(result.error || 'Invalid promo code')
    }
  }

  const handleRemovePromoCode = () => {
    if (appliedPromoCode) {
      removeDiscount(appliedPromoCode.id)
      showInfo('Promo code removed')
    }
  }

  /**
   * FIX: This helper is updated to remove 'pincode' and the 'id' field.
   * The 'id' will be handled by the logic in handleConfirmReservation.
   */
  const prepareGuestDataForSave = (details) => {
    const { 
      firstName, 
      surname, 
      email, 
      phone, 
      idType, 
      idNumber, 
      address, 
      city, 
      state, 
      country
      // 'pincode' removed as it's not in the DB schema
    } = details;
    
    return {
      name: `${firstName || ''} ${surname || ''}`.trim(),
      email: email || '',
      phone: phone || '',
      id_proof_type: idType || 'N/A',
      id_proof_number: idNumber || '',
      address: address || '',
      city: city || '',
      state: state || '',
      country: country || 'India',
      guest_type: 'Regular'
    };
  };

  const handleConfirmReservation = async () => {
    setLoading(true)
    try {
      // === AVAILABILITY RE-VALIDATION ===
      // Re-check room availability before final submission to prevent race conditions
      // (Another user might have booked the same room while this form was open)
      const validationErrors = []

      for (const roomType of selectedRooms) {
        if (assignLater) {
          // Validate room type availability for unassigned bookings
          const { available, availableCount, requiredCount, error } =
            await validateRoomTypeAvailability(
              roomType.id,
              roomType.quantity,
              roomType.checkIn,
              roomType.checkOut
            )

          if (error) {
            throw new Error('Failed to validate availability. Please try again.')
          }

          if (!available) {
            validationErrors.push(
              `${roomType.name}: Only ${availableCount} room(s) available, but ${requiredCount} requested`
            )
          }
        } else {
          // Validate specific room assignments
          const assignedRoomIds = roomType.assignedRooms?.filter(Boolean) || []
          if (assignedRoomIds.length > 0) {
            const { available, unavailableRooms, error } =
              await validateRoomAvailability(
                assignedRoomIds,
                roomType.checkIn,
                roomType.checkOut
              )

            if (error) {
              throw new Error('Failed to validate availability. Please try again.')
            }

            if (!available) {
              validationErrors.push(
                `Room(s) ${unavailableRooms.join(', ')} no longer available for ${roomType.name}`
              )
            }
          }
        }
      }

      // If any rooms are unavailable, show error and navigate back to room selection
      if (validationErrors.length > 0) {
        showError(
          "Just missed it! One or more rooms you selected were just booked by another guest.\n\n" +
          validationErrors.join('\n') +
          "\n\nPlease go back and select different rooms."
        )
        setLoading(false)
        // Navigate back to room selection page
        onNavigate('new-reservation')
        return
      }

      // First, create or update the PRIMARY guest (first guest in allGuestsDetails)
      let guestId = null;

      // Get the formatted data for the PRIMARY GUEST
      const guestData = prepareGuestDataForSave(primaryGuest);

      /**
       * FIX: We check primaryGuest.id (the first guest) here.
       * This ensures we save the primary guest, not the last guest entered.
       */
      if (primaryGuest.id) {
        // --- EXISTING GUEST ---
        console.log("Updating existing guest:", primaryGuest.id);
        // Pass the ID and the data to update separately
        await updateGuest(primaryGuest.id, guestData);
        guestId = primaryGuest.id; // Use the existing ID
      } else {
        // --- NEW GUEST ---
        console.log("Adding new guest...");
        // Pass data *without* an 'id' key.
        // Supabase will now use the database's default UUID generator.
        const newGuest = await addGuest(guestData);
        if (!newGuest) {
          throw new Error("Failed to create new guest.");
        }
        guestId = newGuest.id; // Use the newly created ID
      }

      // Save additional guests to the database (only those with at least a name)
      const guestIdToRoomIdMap = new Map(); // Map guest IDs to their assigned room IDs
      if (additionalGuests.length > 0) {
        // Filter to only include guests with at least a first name or surname
        const guestsToSave = additionalGuests.filter(guest =>
          guest.firstName?.trim() || guest.surname?.trim()
        );

        if (guestsToSave.length > 0) {
          console.log(`Saving ${guestsToSave.length} additional guests...`);
          for (const additionalGuest of guestsToSave) {
            const additionalGuestData = prepareGuestDataForSave(additionalGuest);

            let savedGuestId = null;
            if (additionalGuest.id) {
              // Update existing additional guest
              await updateGuest(additionalGuest.id, additionalGuestData);
              savedGuestId = additionalGuest.id;
            } else {
              // Create new additional guest
              const newAdditionalGuest = await addGuest(additionalGuestData);
              if (newAdditionalGuest) {
                savedGuestId = newAdditionalGuest.id;
              }
            }

            // Track which room this guest is assigned to
            if (savedGuestId && additionalGuest.assignedRoomId) {
              guestIdToRoomIdMap.set(savedGuestId, additionalGuest.assignedRoomId);
            }
          }
        }
      }

      console.log('Guest to Room assignments:', Object.fromEntries(guestIdToRoomIdMap));

      // Generate a unique booking ID for this booking to link all reservations together
      // This allows multiple reservations (different rooms, room changes, etc.) to be grouped as one booking
      // If adding to existing booking, use that booking ID instead
      const bookingId = isAddingToExisting ? addToExistingBooking.bookingId : crypto.randomUUID();

      // Calculate total room count for the booking (used for master folio naming)
      const totalRoomCount = selectedRooms.reduce((sum, roomType) => sum + (roomType.quantity || 1), 0);

      // Get primary guest name for folio naming
      const primaryGuestName = primaryGuest.firstName
        ? `${primaryGuest.firstName}${primaryGuest.surname ? ' ' + primaryGuest.surname : ''}`
        : 'Guest';

      // Create reservations SEQUENTIALLY for each selected room (enables proper error handling)
      const createdReservations = []

      for (const roomType of selectedRooms) {
        // Use the selected rate price, or fall back to base price
        const roomRate = roomType.ratePrice || roomType.base_price

        // Calculate nights for THIS specific room based on ITS date range
        const roomCheckIn = roomType.checkIn ? new Date(roomType.checkIn) : null
        const roomCheckOut = roomType.checkOut ? new Date(roomType.checkOut) : null
        const roomNights = roomCheckIn && roomCheckOut
          ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
          : 0

        // Calculate total amount for this room type using its specific nights
        const roomSubtotal = roomRate * roomNights
        const roomTax = roomSubtotal * (taxRate / 100) // Dynamic GST from tax_configurations
        const roomTotal = roomSubtotal + roomTax

        // Create one reservation per quantity
        for (let index = 0; index < roomType.quantity; index++) {
          // Get the assigned room ID (null if assignLater is enabled)
          // Don't fall back to roomIds when assignLater is true - that would auto-assign rooms
          const assignedRoomId = assignLater ? null : (roomType.assignedRooms?.[index] || roomType.roomIds?.[index] || null)

          // If not in assignLater mode and no room is assigned, that's an error
          if (!assignLater && !assignedRoomId) {
            throw new Error(`No room assigned for ${roomType.name} slot ${index + 1}`)
          }

          // Get the room number for folio naming (or room type name if unassigned)
          const roomData = assignedRoomId ? rooms.find(r => r.id === assignedRoomId) : null
          const roomNumber = roomData?.room_number || ''
          const roomTypeName = roomType.name || ''

          // Get meal plan for this room (default to 'none' if not set)
          const mealPlan = roomType.mealPlans?.[index] || 'none'

          // Get guest counts for this room (default to 1 adult if not set)
          const guestCount = roomType.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }

          // Get additional guests assigned to THIS specific room (only if room is assigned)
          const guestsForThisRoom = [];
          if (assignedRoomId) {
            guestIdToRoomIdMap.forEach((roomId, guestId) => {
              if (roomId === assignedRoomId) {
                guestsForThisRoom.push(guestId);
              }
            });
          }

          const reservation = await addReservation({
            guest_id: guestId,
            room_id: assignLater ? null : assignedRoomId, // Explicitly null when assignLater is enabled
            room_type_id: roomType.id, // Always include room type for unassigned reservations
            rate_type_id: roomType.rateTypeId || null,
            check_in_date: roomType.checkIn, // Use room's specific check-in date
            check_out_date: roomType.checkOut, // Use room's specific check-out date
            booking_source: filters.source === 'walk-in' ? 'direct' : filters.source,
            direct_source: filters.source === 'walk-in' ? 'Walk-in' : filters.source,
            agent_id: selectedAgent?.id || null,
            number_of_adults: guestCount.adults || 1,
            number_of_children: guestCount.children || 0,
            number_of_infants: guestCount.infants || 0,
            status: 'Confirmed',
            meal_plan: mealPlan === 'none' ? null : mealPlan,
            special_requests: '',
            total_amount: roomTotal,
            room_subtotal: roomSubtotal, // Pre-tax amount for folio generation (fixes double-taxation)
            booking_id: bookingId, // Link all reservations from this booking together
            // Include additional guest IDs only for guests assigned to THIS room
            ...(guestsForThisRoom.length > 0 && { additional_guest_ids: guestsForThisRoom })
          }, {
            roomNumber,
            roomTypeName,
            guestName: primaryGuestName,
            roomCount: totalRoomCount
          })

          if (!reservation) {
            throw new Error(`Failed to create reservation for ${roomType.name}. Please try again.`)
          }

          createdReservations.push(reservation)
        }
      }

      // Update the guest's stats (total spent, total bookings, etc.)
      await updateGuestStats(guestId, bill.total)

      // TODO: Create bill with payment if not "Do Not Collect"
      if (paymentInfo.paymentType !== 'none' && paymentInfo.amount > 0) {
        // In production, you'd create a bill and payment record here
        console.log('Payment to be collected:', {
          type: paymentInfo.paymentType,
          amount: paymentInfo.amount,
          notes: paymentInfo.notes
        })
      }

      showSuccess(isAddingToExisting ? 'Room added to booking successfully!' : 'Reservation created successfully!')

      // Extract reservation IDs from created reservations
      const createdReservationIds = createdReservations.filter(r => r && r.id).map(r => r.id)

      // Store reservation IDs in sessionStorage for the details page
      // If adding to existing booking, merge with existing reservation IDs
      if (isAddingToExisting && addToExistingBooking.reservationIds) {
        const allReservationIds = [...addToExistingBooking.reservationIds, ...createdReservationIds]
        sessionStorage.setItem('reservationDetailsIds', JSON.stringify(allReservationIds))
      } else {
        sessionStorage.setItem('reservationDetailsIds', JSON.stringify(createdReservationIds))
      }

      // Reset the flow and navigate to reservation details
      resetFlow()
      onNavigate('reservation-details')
    } catch (error) {
      console.error('Error creating reservation:', error)
      showError('Failed to create reservation: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-accent">
      {/* Add to Existing Booking Banner */}
      {isAddingToExisting && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-6 py-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-800 dark:text-blue-200">
              Adding room to existing booking for <strong>{addToExistingBooking.guestName || 'Guest'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Payment & Confirmation</h1>
          <StepIndicator currentStep={3} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6">
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Reservation & Accommodation Summary */}
            <div className="space-y-6">
              {/* Reservation Summary */}
              <div className="bg-card rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Reservation Summary</h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Guest Information */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                        Guest Information {hasAdditionalGuests && `(${totalGuests} Guests)`}
                      </h3>
                      {hasAdditionalGuests && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllGuests(!showAllGuests)}
                          className="h-7 text-xs"
                        >
                          {showAllGuests ? (
                            <>
                              <ChevronUp className="w-3.5 h-3.5 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-3.5 h-3.5 mr-1" />
                              +{expectedAdditionalGuests} other{expectedAdditionalGuests > 1 ? 's' : ''}
                            </>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Primary Guest */}
                    <div className="space-y-1.5 bg-muted/20 rounded p-3">
                      <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                        Primary Guest
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Name:</span>
                        <span className="font-medium">{primaryGuest.firstName} {primaryGuest.surname}</span>
                      </div>
                      {primaryGuest.email && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Email:</span>
                          <span className="font-medium">{primaryGuest.email}</span>
                        </div>
                      )}
                      {primaryGuest.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="font-medium">{primaryGuest.phone}</span>
                        </div>
                      )}
                      {primaryGuest.idType && primaryGuest.idNumber && primaryGuest.idType !== 'N/A' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ID Proof:</span>
                          <span className="font-medium">{primaryGuest.idType} - {primaryGuest.idNumber}</span>
                        </div>
                      )}
                      {primaryGuest.address && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Address:</span>
                          <span className="font-medium text-right">{primaryGuest.address}, {primaryGuest.city}</span>
                        </div>
                      )}
                    </div>

                    {/* Additional Guests (Collapsible) */}
                    {showAllGuests && hasAdditionalGuests && (
                      <div className="mt-3 space-y-2">
                        {additionalGuests
                          .filter(guest => guest.firstName?.trim() || guest.surname?.trim())
                          .map((guest, index) => (
                            <div key={index} className="space-y-1.5 bg-muted/10 rounded p-3 border-l-2 border-muted">
                              <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                                Additional Guest {index + 1}
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium">{guest.firstName} {guest.surname}</span>
                              </div>
                              {guest.email && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Email:</span>
                                  <span className="font-medium">{guest.email}</span>
                                </div>
                              )}
                              {guest.phone && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Phone:</span>
                                  <span className="font-medium">{guest.phone}</span>
                                </div>
                              )}
                              {guest.idType && guest.idNumber && guest.idType !== 'N/A' && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">ID Proof:</span>
                                  <span className="font-medium">{guest.idType} - {guest.idNumber}</span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Stay Details */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Stay Details</h3>
                    <div className="space-y-1.5">
                      {stays.length > 0 && (
                        <>
                          {stays.map((stay, index) => {
                            const stayNights = getStayNights(stay)
                            const stayCheckIn = stay.checkIn ? new Date(stay.checkIn) : null
                            const stayCheckOut = stay.checkOut ? new Date(stay.checkOut) : null

                            return (
                              <div key={index} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {stays.length > 1 ? `Stay ${index + 1}:` : 'Check-in:'}
                                  </span>
                                  <span className="font-medium">
                                    {stayCheckIn ? stayCheckIn.toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    }) : '-'}
                                  </span>
                                </div>
                                {stays.length > 1 && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Check-out:</span>
                                    <span className="font-medium">
                                      {stayCheckOut ? stayCheckOut.toLocaleDateString('en-IN', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      }) : '-'}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">
                                    {stays.length > 1 ? 'Nights:' : 'Total Nights:'}
                                  </span>
                                  <span className="font-medium">{stayNights}</span>
                                </div>
                                {stay.isConsecutive && (
                                  <div className="flex items-start gap-1.5 text-sm bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 mt-1">
                                    <ArrowRight className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div className="text-amber-800 dark:text-amber-300 font-medium text-xs">Room Move:</div>
                                      <div className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                                        {formatRoomChangeSequence(stay.rooms)}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          {stays.length === 1 && !stays[0].isConsecutive && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Check-out:</span>
                              <span className="font-medium">
                                {stays[0].checkOut ? new Date(stays[0].checkOut).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '-'}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Total Guests:</span>
                        <span className="font-medium">
                          {totalGuestCounts.adults + totalGuestCounts.children + totalGuestCounts.infants}
                          <span className="text-muted-foreground ml-1">
                            ({totalGuestCounts.adults}A
                            {totalGuestCounts.children > 0 && `, ${totalGuestCounts.children}C`}
                            {totalGuestCounts.infants > 0 && `, ${totalGuestCounts.infants}I`})
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2">Booking Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Source:</span>
                        <span className="font-medium capitalize">{filters.source}</span>
                      </div>
                      {selectedAgent && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Agent:</span>
                          <span className="font-medium">{selectedAgent.name}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Rooms Booked:</span>
                        <span className="font-medium">
                          {selectedRooms.reduce((sum, room) => sum + room.quantity, 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Room Breakdown */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Room Details</h3>
                    <div className="space-y-3">
                      {selectedRooms.flatMap(room => {
                        const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                        const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                        const roomNights = roomCheckIn && roomCheckOut
                          ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                          : 0

                        return Array.from({ length: room.quantity }, (_, index) => {
                          const guestCount = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                          const mealPlanCode = room.mealPlans?.[index] || 'none'
                          const mealPlanName = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanName(mealPlanCode) : 'No Meal Plan'
                          const mealPlanPrice = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                          const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)
                          const mealPlanCost = mealPlanPrice * totalGuests * roomNights

                          return (
                            <div key={`${room.cartKey}-${index}`} className="bg-muted/30 rounded p-3 space-y-1.5">
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-sm">{room.name}</span>
                                <span className="text-sm font-semibold">₹{((room.ratePrice || room.base_price) * roomNights).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
                                <span>Dates:</span>
                                <span>
                                  {roomCheckIn && roomCheckOut && (
                                    `${roomCheckIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${roomCheckOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Guests:</span>
                                <span>
                                  {guestCount.adults}A
                                  {guestCount.children > 0 && `, ${guestCount.children}C`}
                                  {guestCount.infants > 0 && `, ${guestCount.infants}I`}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Meal Plan:</span>
                                <span>{mealPlanName} {mealPlanCost > 0 && `(+₹${mealPlanCost.toFixed(2)})`}</span>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Rate per night:</span>
                                <span>₹{(room.ratePrice || room.base_price).toFixed(2)} × {roomNights}</span>
                              </div>
                            </div>
                          )
                        })
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Accommodation Summary Table */}
              <div className="bg-card rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Accommodation Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  {stays.map((stay, stayIndex) => {
                    const stayCheckIn = stay.checkIn ? new Date(stay.checkIn) : null
                    const stayCheckOut = stay.checkOut ? new Date(stay.checkOut) : null
                    const stayNights = getStayNights(stay)

                    return (
                      <div key={stayIndex}>
                        {stays.length > 1 && (
                          <div className="px-6 py-2 bg-muted/50 border-b">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">
                                {stay.isConsecutive ? 'Continuous Stay' : `Stay ${stayIndex + 1}`}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {stayCheckIn?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {stayCheckOut?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ({stayNights} night{stayNights !== 1 ? 's' : ''})
                              </span>
                            </div>
                            {stay.isConsecutive && (
                              <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-700 dark:text-amber-400">
                                <ArrowRight className="h-3 w-3" />
                                <span>Room Move: {formatRoomChangeSequence(stay.rooms)}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <table className="w-full">
                          {stayIndex === 0 && (
                            <thead className="bg-muted/30">
                              <tr>
                                <th className="text-left p-3 text-sm font-semibold">Type</th>
                                <th className="text-left p-3 text-sm font-semibold">Arrival</th>
                                <th className="text-left p-3 text-sm font-semibold">Departure</th>
                                <th className="text-center p-3 text-sm font-semibold">Nights</th>
                                <th className="text-right p-3 text-sm font-semibold">Total</th>
                              </tr>
                            </thead>
                          )}
                          <tbody>
                            {stay.rooms.flatMap(room => {
                              const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                              const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                              const roomNights = roomCheckIn && roomCheckOut
                                ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                                : 0

                              return Array.from({ length: room.quantity }, (_, index) => (
                                <tr key={`${room.cartKey}-${index}`} className="border-b">
                                  <td className="p-3 text-sm">{room.name}</td>
                                  <td className="p-3 text-sm">
                                    {roomCheckIn ? roomCheckIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                  </td>
                                  <td className="p-3 text-sm">
                                    {roomCheckOut ? roomCheckOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                  </td>
                                  <td className="p-3 text-sm text-center">{roomNights}</td>
                                  <td className="p-3 text-sm text-right font-medium">
                                    ₹{((room.ratePrice || room.base_price) * roomNights).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Right Side: Bill Breakdown with Payment Information */}
            <div className="bg-card rounded-lg shadow">
              {/* Bill Breakdown */}
              <div className="p-6 pb-4 border-b">
                <h2 className="text-lg font-semibold mb-4">Bill Breakdown</h2>

                <div className="space-y-4">
                  {/* Room Charges - Detailed */}
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Room Charges</h3>
                    <div className="space-y-3">
                      {selectedRooms.flatMap(room => {
                        const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                        const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                        const roomNights = roomCheckIn && roomCheckOut
                          ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                          : 0

                        return Array.from({ length: room.quantity }, (_, index) => {
                          const roomRate = room.ratePrice || room.base_price
                          const roomSubtotal = roomRate * roomNights
                          const roomTax = roomSubtotal * (taxRate / 100)
                          const roomTotal = roomSubtotal + roomTax

                          return (
                            <div key={`bill-${room.cartKey}-${index}`} className="bg-muted/30 rounded p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">{room.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Room {index + 1} of {room.quantity}
                                  </div>
                                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                    {roomCheckIn && roomCheckOut && (
                                      `${roomCheckIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${roomCheckOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                    )}
                                  </div>
                                </div>
                                <span className="text-sm font-semibold">₹{roomTotal.toFixed(2)}</span>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-border">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Room Rate</span>
                                  <span>₹{roomRate.toFixed(2)} × {roomNights} nights</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>₹{roomSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">GST ({taxRate}%)</span>
                                  <span>₹{roomTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium pt-1 border-t border-border">
                                  <span>Room Total</span>
                                  <span>₹{roomTotal.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      })}
                    </div>

                    {/* Room Charges Summary */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Room Charges</span>
                        <span>₹{selectedRooms.reduce((sum, room) => {
                          const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                          const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                          const roomNights = roomCheckIn && roomCheckOut
                            ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                            : 0
                          const roomRate = room.ratePrice || room.base_price
                          const roomSubtotal = roomRate * roomNights * room.quantity
                          const roomTax = roomSubtotal * (taxRate / 100)
                          return sum + roomSubtotal + roomTax
                        }, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Meal Plan Charges - Detailed */}
                  {bill.mealPlanSubtotal > 0 && (
                    <div className="pt-3 border-t">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Meal Plan Charges</h3>
                      <div className="space-y-3">
                        {selectedRooms.flatMap(room => {
                          const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                          const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                          const roomNights = roomCheckIn && roomCheckOut
                            ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                            : 0

                          return Array.from({ length: room.quantity }, (_, index) => {
                            const mealPlanCode = room.mealPlans?.[index] || 'none'
                            const mealPlanName = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanName(mealPlanCode) : 'No Meal Plan'
                            const pricePerPerson = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                            const guestCount = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                            const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)

                            const mealPlanSubtotal = pricePerPerson * totalGuests * roomNights
                            const mealPlanTax = mealPlanSubtotal * (foodTaxRate / 100)
                            const mealPlanTotal = mealPlanSubtotal + mealPlanTax

                            // Skip if no meal plan cost
                            if (mealPlanSubtotal === 0) return null

                            return (
                              <div key={`meal-${room.cartKey}-${index}`} className="bg-muted/30 rounded p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-sm">{room.name} - {mealPlanName}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Room {index + 1} of {room.quantity}
                                    </div>
                                    <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                                      {roomCheckIn && roomCheckOut && (
                                        `${roomCheckIn.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${roomCheckOut.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm font-semibold">₹{mealPlanTotal.toFixed(2)}</span>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-border">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Rate per person per day</span>
                                    <span>₹{pricePerPerson.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Guests × Nights</span>
                                    <span>{totalGuests} × {roomNights}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{mealPlanSubtotal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">GST ({foodTaxRate}%)</span>
                                    <span>₹{mealPlanTax.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs font-medium pt-1 border-t border-border">
                                    <span>Meal Plan Total</span>
                                    <span>₹{mealPlanTotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          }).filter(Boolean)
                        })}
                      </div>

                      {/* Meal Plan Charges Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total Meal Plan Charges</span>
                          <span>₹{selectedRooms.reduce((sum, room) => {
                            const roomCheckIn = room.checkIn ? new Date(room.checkIn) : null
                            const roomCheckOut = room.checkOut ? new Date(room.checkOut) : null
                            const roomNights = roomCheckIn && roomCheckOut
                              ? Math.ceil((roomCheckOut - roomCheckIn) / (1000 * 60 * 60 * 24))
                              : 0

                            let roomMealPlanTotal = 0
                            for (let i = 0; i < room.quantity; i++) {
                              const mealPlanCode = room.mealPlans?.[i] || 'none'
                              const pricePerPerson = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                              const guestCount = room.guestCounts?.[i] || { adults: 1, children: 0, infants: 0 }
                              const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)
                              const mealPlanSubtotal = pricePerPerson * totalGuests * roomNights
                              const mealPlanTax = mealPlanSubtotal * (foodTaxRate / 100)
                              roomMealPlanTotal += mealPlanSubtotal + mealPlanTax
                            }
                            return sum + roomMealPlanTotal
                          }, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add-ons - Detailed */}
                  {addons && addons.length > 0 && (
                    <div className="pt-3 border-t">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Add-ons & Services</h3>
                      <div className="space-y-2">
                        {addons.map(addon => {
                          const addonSubtotal = addon.price * addon.quantity
                          const addonTax = addonSubtotal * (taxRate / 100)
                          const addonTotal = addonSubtotal + addonTax

                          return (
                            <div key={addon.id} className="bg-muted/30 rounded p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="font-medium text-sm">{addon.name}</div>
                                <span className="text-sm font-semibold">₹{addonTotal.toFixed(2)}</span>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-border">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Unit Price</span>
                                  <span>₹{addon.price.toFixed(2)} × {addon.quantity}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>₹{addonSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">GST ({taxRate}%)</span>
                                  <span>₹{addonTax.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      {/* Add-ons Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total Add-ons</span>
                          <span>₹{addons.reduce((sum, addon) => {
                            const addonSubtotal = addon.price * addon.quantity
                            const addonTax = addonSubtotal * (taxRate / 100)
                            return sum + addonSubtotal + addonTax
                          }, 0).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Promo Code Section */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Promo Code & Discounts</h3>

                    {/* Applied Promo Code Display */}
                    {appliedPromoCode ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-sm text-emerald-800 dark:text-emerald-300">
                              {appliedPromoCode.code}
                            </div>
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              {appliedPromoCode.name}
                            </div>
                            {(appliedPromoCode.value_type || appliedPromoCode.discount_type) === 'percentage' ? (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {appliedPromoCode.value}% off
                              </div>
                            ) : (
                              <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                                ₹{appliedPromoCode.value} off
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemovePromoCode}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* Promo Code Input */
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder="Enter promo code"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleApplyPromoCode()
                            }
                          }}
                          className="flex-1"
                          disabled={applyingPromo}
                        />
                        <Button
                          onClick={handleApplyPromoCode}
                          disabled={!promoCodeInput.trim() || applyingPromo}
                          className="whitespace-nowrap"
                        >
                          {applyingPromo ? 'Applying...' : 'Apply Code'}
                        </Button>
                      </div>
                    )}

                    {/* Show total discount if applied */}
                    {bill.totalDiscount > 0 && (
                      <div className="mt-3 pt-3 border-t flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <span>Total Discount Applied</span>
                        <span>-₹{bill.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Grand Totals */}
                  <div className="pt-4 border-t-2 space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Summary</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal (Before Tax)</span>
                      <span className="font-medium">₹{bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Taxes</span>
                      <span className="font-medium">₹{bill.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t-2">
                      <span>Grand Total</span>
                      <span className="text-blue-600 dark:text-blue-400">₹{bill.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="p-6 pt-4 bg-muted/30">
                <h3 className="text-base font-semibold mb-4">Payment Information</h3>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select
                      value={paymentInfo.paymentType}
                      onValueChange={(value) => setPaymentInfo({ ...paymentInfo, paymentType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Do Not Collect</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentInfo.paymentType !== 'none' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Amount</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={paymentInfo.amount}
                            onChange={(e) => setPaymentInfo({ ...paymentInfo, amount: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                          />
                          <p className="text-xs text-muted-foreground">
                            Suggested: ₹{bill.suggestedDeposit.toFixed(2)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Balance Due</Label>
                          <div className="h-10 flex items-center px-3 bg-card rounded border text-foreground font-medium">
                            ₹{(bill.total - (paymentInfo.amount || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Payment Notes</Label>
                        <Textarea
                          value={paymentInfo.notes}
                          onChange={(e) => setPaymentInfo({ ...paymentInfo, notes: e.target.value })}
                          placeholder="Transaction ID, reference number, etc."
                          rows={2}
                          className="bg-card"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Navigation */}
      <div className="sticky bottom-0 z-10 bg-card border-t px-6 py-4 shadow-lg">
        <div className="flex justify-between">
          <Button
            onClick={() => onNavigate('guest-details')}
            variant="outline"
            size="lg"
            disabled={loading}
          >
            <ChevronLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
          <Button
            onClick={handleConfirmReservation}
            size="lg"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Confirm Reservation'}
            <Check className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}