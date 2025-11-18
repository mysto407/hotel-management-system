import { useState } from 'react'
import { ChevronLeft, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useReservations } from '../../context/ReservationContext'
import { useGuests } from '../../context/GuestContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { useAlert } from '@/context/AlertContext'
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
    removeDiscount
  } = useReservationFlow()

  const { addReservation } = useReservations()
  const { addGuest, updateGuest, updateGuestStats } = useGuests()
  const { getMealPlanPrice, getMealPlanName } = useMealPlans()
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert()

  const [loading, setLoading] = useState(false)
  const [promoCodeInput, setPromoCodeInput] = useState('')
  const [applyingPromo, setApplyingPromo] = useState(false)
  const [showAllGuests, setShowAllGuests] = useState(false)

  // Get primary guest (first guest or fallback to guestDetails)
  const primaryGuest = allGuestsDetails.length > 0 ? allGuestsDetails[0] : guestDetails
  const additionalGuests = allGuestsDetails.slice(1)
  const hasAdditionalGuests = additionalGuests.length > 0

  const bill = calculateBill()

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

      // Create reservations for each selected room
      const reservationPromises = selectedRooms.flatMap(roomType => {
        // Use the selected rate price, or fall back to base price
        const roomRate = roomType.ratePrice || roomType.base_price

        // Calculate total amount for this room type
        const roomSubtotal = roomRate * bill.nights
        const roomTax = roomSubtotal * 0.18 // 18% GST
        const roomTotal = roomSubtotal + roomTax

        // Create one reservation per quantity
        return Array.from({ length: roomType.quantity }, (_, index) => {
          // Get the assigned room ID, or fall back to any available room
          const assignedRoomId = roomType.assignedRooms?.[index] || roomType.roomIds?.[index]

          if (!assignedRoomId) {
            console.error(`No room assigned for ${roomType.name} slot ${index + 1}`)
            return null
          }

          // Get meal plan for this room (default to 'none' if not set)
          const mealPlan = roomType.mealPlans?.[index] || 'none'

          // Get guest counts for this room (default to 1 adult if not set)
          const guestCount = roomType.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }

          return addReservation({
            guest_id: guestId,
            room_id: assignedRoomId,
            rate_type_id: roomType.rateTypeId || null,
            check_in_date: filters.checkIn,
            check_out_date: filters.checkOut,
            booking_source: filters.source === 'walk-in' ? 'direct' : filters.source,
            direct_source: filters.source === 'walk-in' ? 'Walk-in' : filters.source,
            agent_id: selectedAgent?.id || null,
            number_of_adults: guestCount.adults || 1,
            number_of_children: guestCount.children || 0,
            number_of_infants: guestCount.infants || 0,
            status: 'Confirmed',
            meal_plan: mealPlan === 'none' ? null : mealPlan,
            special_requests: '',
            total_amount: roomTotal
          })
        }).filter(Boolean) // Remove null entries
      })

      const reservationResults = await Promise.all(reservationPromises)

      // Check if any reservations failed (returned null)
      const failedReservations = reservationResults.filter(r => r === null)
      if (failedReservations.length > 0) {
        throw new Error(`Failed to create ${failedReservations.length} reservation(s). Please check the details and try again.`)
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

      showSuccess('Reservation created successfully!')

      // Extract reservation IDs from successful results
      const createdReservationIds = reservationResults.filter(r => r && r.id).map(r => r.id)

      // Store reservation IDs in sessionStorage for the details page
      sessionStorage.setItem('reservationDetailsIds', JSON.stringify(createdReservationIds))

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
                        Guest Information {hasAdditionalGuests && `(${allGuestsDetails.length} Guests)`}
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
                              +{additionalGuests.length} other{additionalGuests.length > 1 ? 's' : ''}
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
                        {additionalGuests.map((guest, index) => (
                          <div key={index} className="space-y-1.5 bg-muted/10 rounded p-3 border-l-2 border-muted">
                            <div className="text-xs font-semibold text-muted-foreground mb-1.5">
                              Guest {index + 2}
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
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Check-in:</span>
                        <span className="font-medium">
                          {filters.checkIn ? new Date(filters.checkIn).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Check-out:</span>
                        <span className="font-medium">
                          {filters.checkOut ? new Date(filters.checkOut).toLocaleDateString('en-IN', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          }) : '-'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Nights:</span>
                        <span className="font-medium">{bill.nights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
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
                      {selectedRooms.flatMap(room =>
                        Array.from({ length: room.quantity }, (_, index) => {
                          const guestCount = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                          const mealPlanCode = room.mealPlans?.[index] || 'none'
                          const mealPlanName = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanName(mealPlanCode) : 'No Meal Plan'
                          const mealPlanPrice = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                          const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)
                          const mealPlanCost = mealPlanPrice * totalGuests * bill.nights

                          return (
                            <div key={`${room.id}-${index}`} className="bg-muted/30 rounded p-3 space-y-1.5">
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-sm">{room.name}</span>
                                <span className="text-sm font-semibold">₹{((room.ratePrice || room.base_price) * bill.nights).toFixed(2)}</span>
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
                                <span>₹{(room.ratePrice || room.base_price).toFixed(2)}</span>
                              </div>
                            </div>
                          )
                        })
                      )}
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
                  <table className="w-full">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Type</th>
                        <th className="text-left p-3 text-sm font-semibold">Arrival</th>
                        <th className="text-left p-3 text-sm font-semibold">Departure</th>
                        <th className="text-center p-3 text-sm font-semibold">Nights</th>
                        <th className="text-right p-3 text-sm font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedRooms.flatMap(room =>
                        Array.from({ length: room.quantity }, (_, index) => (
                          <tr key={`${room.id}-${index}`} className="border-b">
                            <td className="p-3 text-sm">{room.name}</td>
                            <td className="p-3 text-sm">
                              {filters.checkIn ? new Date(filters.checkIn).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                            </td>
                            <td className="p-3 text-sm">
                              {filters.checkOut ? new Date(filters.checkOut).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-'}
                            </td>
                            <td className="p-3 text-sm text-center">{bill.nights}</td>
                            <td className="p-3 text-sm text-right font-medium">
                              ₹{((room.ratePrice || room.base_price) * bill.nights).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
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
                      {selectedRooms.flatMap(room =>
                        Array.from({ length: room.quantity }, (_, index) => {
                          const roomRate = room.ratePrice || room.base_price
                          const roomSubtotal = roomRate * bill.nights
                          const roomTax = roomSubtotal * 0.18
                          const roomTotal = roomSubtotal + roomTax

                          return (
                            <div key={`bill-${room.id}-${index}`} className="bg-muted/30 rounded p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">{room.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Room {index + 1} of {room.quantity}
                                  </div>
                                </div>
                                <span className="text-sm font-semibold">₹{roomTotal.toFixed(2)}</span>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-border">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Room Rate</span>
                                  <span>₹{roomRate.toFixed(2)} × {bill.nights} nights</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>₹{roomSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">GST (18%)</span>
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
                      )}
                    </div>

                    {/* Room Charges Summary */}
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex justify-between text-sm font-medium">
                        <span>Total Room Charges</span>
                        <span>₹{selectedRooms.reduce((sum, room) => {
                          const roomRate = room.ratePrice || room.base_price
                          const roomSubtotal = roomRate * bill.nights * room.quantity
                          const roomTax = roomSubtotal * 0.18
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
                        {selectedRooms.flatMap(room =>
                          Array.from({ length: room.quantity }, (_, index) => {
                            const mealPlanCode = room.mealPlans?.[index] || 'none'
                            const mealPlanName = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanName(mealPlanCode) : 'No Meal Plan'
                            const pricePerPerson = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                            const guestCount = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                            const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)

                            const mealPlanSubtotal = pricePerPerson * totalGuests * bill.nights
                            const mealPlanTax = mealPlanSubtotal * 0.18
                            const mealPlanTotal = mealPlanSubtotal + mealPlanTax

                            // Skip if no meal plan cost
                            if (mealPlanSubtotal === 0) return null

                            return (
                              <div key={`meal-${room.id}-${index}`} className="bg-muted/30 rounded p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="font-medium text-sm">{room.name} - {mealPlanName}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      Room {index + 1} of {room.quantity}
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
                                    <span>{totalGuests} × {bill.nights}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>₹{mealPlanSubtotal.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">GST (18%)</span>
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
                        )}
                      </div>

                      {/* Meal Plan Charges Summary */}
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Total Meal Plan Charges</span>
                          <span>₹{selectedRooms.reduce((sum, room) => {
                            let roomMealPlanTotal = 0
                            for (let i = 0; i < room.quantity; i++) {
                              const mealPlanCode = room.mealPlans?.[i] || 'none'
                              const pricePerPerson = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0
                              const guestCount = room.guestCounts?.[i] || { adults: 1, children: 0, infants: 0 }
                              const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)
                              const mealPlanSubtotal = pricePerPerson * totalGuests * bill.nights
                              const mealPlanTax = mealPlanSubtotal * 0.18
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
                          const addonTax = addonSubtotal * 0.18
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
                                  <span className="text-muted-foreground">GST (18%)</span>
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
                            const addonTax = addonSubtotal * 0.18
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
                      <span className="text-muted-foreground">Total GST (18%)</span>
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