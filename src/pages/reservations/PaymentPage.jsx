import { useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useReservations } from '../../context/ReservationContext'
import { useGuests } from '../../context/GuestContext'
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
    selectedRooms,
    addons,
    guestDetails,
    paymentInfo,
    setPaymentInfo,
    calculateBill,
    resetFlow
  } = useReservationFlow()

  const { addReservation } = useReservations()
  const { addGuest, updateGuest, updateGuestStats } = useGuests()

  const [loading, setLoading] = useState(false)

  const bill = calculateBill()

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
      // First, create or update the guest
      let guestId = null;
      
      // Get the formatted data *without* an ID
      const guestData = prepareGuestDataForSave(guestDetails);

      /**
       * FIX: We check guestDetails.id (from context) here.
       * This correctly separates the logic for updating vs. creating.
       */
      if (guestDetails.id) {
        // --- EXISTING GUEST ---
        console.log("Updating existing guest:", guestDetails.id);
        // Pass the ID and the data to update separately
        await updateGuest(guestDetails.id, guestData);
        guestId = guestDetails.id; // Use the existing ID
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
        // Calculate total amount for this room type
        const roomSubtotal = roomType.base_price * bill.nights
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

          // Get meal plan for this room (default to EP if not set)
          const mealPlan = roomType.mealPlans?.[index] || 'EP'

          // Get guest counts for this room (default to 1 adult if not set)
          const guestCount = roomType.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }

          return addReservation({
            guest_id: guestId,
            room_id: assignedRoomId,
            check_in_date: filters.checkIn,
            check_out_date: filters.checkOut,
            booking_source: filters.source === 'walk-in' ? 'direct' : filters.source,
            direct_source: filters.source === 'walk-in' ? 'Walk-in' : filters.source,
            number_of_adults: guestCount.adults || 1,
            number_of_children: guestCount.children || 0,
            number_of_infants: guestCount.infants || 0,
            status: 'Confirmed',
            meal_plan: mealPlan,
            special_requests: '',
            total_amount: roomTotal
          })
        }).filter(Boolean) // Remove null entries
      })

      await Promise.all(reservationPromises)
      
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

      alert('Reservation created successfully!')

      // Reset the flow and navigate back
      resetFlow()
      onNavigate('reservations')
    } catch (error) {
      console.error('Error creating reservation:', error)
      alert('Failed to create reservation: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
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
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Reservation Summary</h2>
                </div>
                <div className="p-6 space-y-4">
                  {/* Guest Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Guest Information</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Name:</span>
                        <span className="font-medium">{guestDetails.firstName} {guestDetails.surname}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{guestDetails.email}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">{guestDetails.phone}</span>
                      </div>
                      {guestDetails.idType && guestDetails.idNumber && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">ID Proof:</span>
                          <span className="font-medium">{guestDetails.idType} - {guestDetails.idNumber}</span>
                        </div>
                      )}
                      {guestDetails.address && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Address:</span>
                          <span className="font-medium text-right">{guestDetails.address}, {guestDetails.city}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stay Details */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Stay Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Check-in:</span>
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
                        <span className="text-gray-600">Check-out:</span>
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
                        <span className="text-gray-600">Total Nights:</span>
                        <span className="font-medium">{bill.nights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Guests:</span>
                        <span className="font-medium">
                          {totalGuestCounts.adults + totalGuestCounts.children + totalGuestCounts.infants}
                          <span className="text-gray-500 ml-1">
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
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Booking Details</h3>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Source:</span>
                        <span className="font-medium capitalize">{filters.source}</span>
                      </div>
                      {filters.promoCode && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Promo Code:</span>
                          <span className="font-medium">{filters.promoCode}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Rooms Booked:</span>
                        <span className="font-medium">
                          {selectedRooms.reduce((sum, room) => sum + room.quantity, 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Room Breakdown */}
                  <div className="pt-4 border-t">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Room Details</h3>
                    <div className="space-y-3">
                      {selectedRooms.flatMap(room =>
                        Array.from({ length: room.quantity }, (_, index) => {
                          const guestCount = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                          const mealPlan = room.mealPlans?.[index] || 'EP'

                          return (
                            <div key={`${room.id}-${index}`} className="bg-gray-50 rounded p-3 space-y-1.5">
                              <div className="flex justify-between items-start">
                                <span className="font-medium text-sm">{room.name}</span>
                                <span className="text-sm font-semibold">₹{(room.base_price * bill.nights).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Guests:</span>
                                <span>
                                  {guestCount.adults}A
                                  {guestCount.children > 0 && `, ${guestCount.children}C`}
                                  {guestCount.infants > 0 && `, ${guestCount.infants}I`}
                                </span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Meal Plan:</span>
                                <span>{mealPlan}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Rate per night:</span>
                                <span>₹{room.base_price.toFixed(2)}</span>
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
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b">
                  <h2 className="text-lg font-semibold">Accommodation Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
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
                              ₹{(room.base_price * bill.nights).toFixed(2)}
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
            <div className="bg-white rounded-lg shadow">
              {/* Bill Breakdown */}
              <div className="p-6 pb-4 border-b">
                <h2 className="text-lg font-semibold mb-4">Bill Breakdown</h2>

                <div className="space-y-4">
                  {/* Room Charges - Detailed */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Room Charges</h3>
                    <div className="space-y-3">
                      {selectedRooms.flatMap(room =>
                        Array.from({ length: room.quantity }, (_, index) => {
                          const roomSubtotal = room.base_price * bill.nights
                          const roomTax = roomSubtotal * 0.18
                          const roomTotal = roomSubtotal + roomTax

                          return (
                            <div key={`bill-${room.id}-${index}`} className="bg-gray-50 rounded p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="font-medium text-sm">{room.name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">
                                    Room {index + 1} of {room.quantity}
                                  </div>
                                </div>
                                <span className="text-sm font-semibold">₹{roomTotal.toFixed(2)}</span>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-gray-200">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Base Rate</span>
                                  <span>₹{room.base_price.toFixed(2)} × {bill.nights} nights</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Subtotal</span>
                                  <span>₹{roomSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">GST (18%)</span>
                                  <span>₹{roomTax.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs font-medium pt-1 border-t border-gray-200">
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
                          const roomSubtotal = room.base_price * bill.nights * room.quantity
                          const roomTax = roomSubtotal * 0.18
                          return sum + roomSubtotal + roomTax
                        }, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Add-ons - Detailed */}
                  {addons && addons.length > 0 && (
                    <div className="pt-3 border-t">
                      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Add-ons & Services</h3>
                      <div className="space-y-2">
                        {addons.map(addon => {
                          const addonSubtotal = addon.price * addon.quantity
                          const addonTax = addonSubtotal * 0.18
                          const addonTotal = addonSubtotal + addonTax

                          return (
                            <div key={addon.id} className="bg-gray-50 rounded p-3 space-y-2">
                              <div className="flex justify-between items-start">
                                <div className="font-medium text-sm">{addon.name}</div>
                                <span className="text-sm font-semibold">₹{addonTotal.toFixed(2)}</span>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-gray-200">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Unit Price</span>
                                  <span>₹{addon.price.toFixed(2)} × {addon.quantity}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">Subtotal</span>
                                  <span>₹{addonSubtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-600">GST (18%)</span>
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

                  {/* Grand Totals */}
                  <div className="pt-4 border-t-2 space-y-2">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Summary</h3>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal (Before Tax)</span>
                      <span className="font-medium">₹{bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total GST (18%)</span>
                      <span className="font-medium">₹{bill.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-3 border-t-2">
                      <span>Grand Total</span>
                      <span className="text-blue-600">₹{bill.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="p-6 pt-4 bg-gray-50">
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
                          <p className="text-xs text-gray-500">
                            Suggested: ₹{bill.suggestedDeposit.toFixed(2)}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Balance Due</Label>
                          <div className="h-10 flex items-center px-3 bg-white rounded border text-gray-700 font-medium">
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
                          className="bg-white"
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
      <div className="bg-white border-t px-6 py-4">
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