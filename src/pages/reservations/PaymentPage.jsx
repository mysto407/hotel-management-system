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

  const { createReservation } = useReservations()
  const { addGuest } = useGuests()

  const [loading, setLoading] = useState(false)

  const bill = calculateBill()

  const handleConfirmReservation = async () => {
    setLoading(true)
    try {
      // First, create or get the guest
      let guestId = null

      // Create guest (simplified - in production you'd check if guest exists first)
      const newGuest = await addGuest({
        name: guestDetails.name,
        email: guestDetails.email,
        phone: guestDetails.phone,
        address: guestDetails.address,
        city: guestDetails.city,
        state: guestDetails.state,
        country: guestDetails.country,
        id_proof_type: guestDetails.idType || 'N/A',
        id_proof_number: guestDetails.idNumber || '',
        guest_type: 'Regular'
      })

      if (!newGuest) {
        alert('Failed to create guest')
        setLoading(false)
        return
      }

      guestId = newGuest.id

      // Create reservations for each selected room
      const reservationPromises = selectedRooms.flatMap(roomType => {
        // Create one reservation per quantity
        return Array.from({ length: roomType.quantity }, (_, index) => {
          return createReservation({
            guest_id: guestId,
            room_id: roomType.roomIds[index], // Assign specific room ID
            check_in_date: filters.checkIn,
            check_out_date: filters.checkOut,
            booking_source: filters.source === 'walk-in' ? 'direct' : filters.source,
            direct_source: filters.source === 'walk-in' ? 'Walk-in' : filters.source,
            number_of_adults: guestDetails.adults,
            number_of_children: guestDetails.children,
            number_of_infants: guestDetails.infants,
            status: 'Confirmed',
            meal_plan: 'NM',
            special_requests: ''
          })
        })
      })

      await Promise.all(reservationPromises)

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
        <div className="p-6 space-y-4">
          {/* Reservation Summary */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="space-y-2">
              {/* First Line: Check-in, Check-out, Nights, Guests, Source, Promo */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Check-in:</span>
                  <span className="font-medium">
                    {filters.checkIn ? new Date(filters.checkIn).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : '-'}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Check-out:</span>
                  <span className="font-medium">
                    {filters.checkOut ? new Date(filters.checkOut).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }) : '-'}
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Nights:</span>
                  <span className="font-medium">{bill.nights}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Guests:</span>
                  <span className="font-medium">
                    {guestDetails.adults + guestDetails.children + guestDetails.infants} ({guestDetails.adults}A
                    {guestDetails.children > 0 && `, ${guestDetails.children}C`}
                    {guestDetails.infants > 0 && `, ${guestDetails.infants}I`})
                  </span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium capitalize">{filters.source}</span>
                </div>
                {filters.promoCode && (
                  <>
                    <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Promo:</span>
                      <span className="font-medium">{filters.promoCode}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Second Line: Guest Details */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Guest:</span>
                  <span className="font-medium">{guestDetails.name}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{guestDetails.email}</span>
                </div>
                <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">Phone:</span>
                  <span className="font-medium">{guestDetails.phone}</span>
                </div>
                {guestDetails.address && (
                  <>
                    <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Address:</span>
                      <span className="font-medium">{guestDetails.address}, {guestDetails.city}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side: Accommodation Summary Table */}
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

            {/* Right Side: Bill Breakdown with Payment Information */}
            <div className="bg-white rounded-lg shadow">
              {/* Bill Breakdown */}
              <div className="p-6 pb-4 border-b">
                <h2 className="text-lg font-semibold mb-4">Bill Breakdown</h2>

                <div className="space-y-3">
                  {/* Room Charges */}
                  <div className="pb-3 border-b">
                    <h3 className="font-medium mb-2 text-sm">Room Charges</h3>
                    {selectedRooms.map(room => (
                      <div key={room.id} className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">
                          {room.name} × {room.quantity} × {bill.nights} nights
                        </span>
                        <span>₹{(room.base_price * room.quantity * bill.nights).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Add-ons */}
                  {addons && addons.length > 0 && (
                    <div className="pb-3 border-b">
                      <h3 className="font-medium mb-2 text-sm">Add-ons</h3>
                      {addons.map(addon => (
                        <div key={addon.id} className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">
                            {addon.name} × {addon.quantity}
                          </span>
                          <span>₹{(addon.price * addon.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>₹{bill.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>GST (18%)</span>
                      <span>₹{bill.tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Grand Total</span>
                      <span>₹{bill.total.toFixed(2)}</span>
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
