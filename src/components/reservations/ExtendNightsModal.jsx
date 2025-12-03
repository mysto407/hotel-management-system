import { useState, useEffect } from 'react'
import { format, addDays, differenceInDays } from 'date-fns'
import { Calendar, Loader2, Plus, Minus } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog'
import { Calendar as CalendarComponent } from '../ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
import { Label } from '../ui/label'
import { useRooms } from '../../context/RoomContext'
import { useReservations } from '../../context/ReservationContext'
import { formatCurrency } from '../../utils/currency'
import {
  getTotalTaxRate,
  getFolioByReservation,
  generateDailyRoomChargesWithTax,
  generateDailyMealChargesWithTax,
  getMealPlanWithMeals,
  voidTransactionWithChildren,
  getTransactionsByReservation
} from '../../lib/supabase'

export default function ExtendNightsModal({
  open,
  onOpenChange,
  reservation,
  onSuccess
}) {
  const { rooms, roomTypes } = useRooms()
  const { updateReservation } = useReservations()

  // State
  const [newCheckOutDate, setNewCheckOutDate] = useState(null)
  const [loading, setLoading] = useState(false)
  const [taxRate, setTaxRate] = useState(18)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Load dynamic tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      const { rate } = await getTotalTaxRate('room_charge')
      if (rate > 0) setTaxRate(rate)
    }
    loadTaxRate()
  }, [])

  // Initialize dates when reservation changes
  useEffect(() => {
    if (reservation && open) {
      setNewCheckOutDate(new Date(reservation.check_out_date))
    }
  }, [reservation, open])

  if (!reservation) return null

  // Get room and room type info
  const room = rooms.find(r => r.id === reservation.room_id)
  const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))

  // Calculate values
  const checkInDate = new Date(reservation.check_in_date)
  const originalCheckOut = new Date(reservation.check_out_date)
  const originalNights = differenceInDays(originalCheckOut, checkInDate)
  const newNights = newCheckOutDate ? differenceInDays(newCheckOutDate, checkInDate) : originalNights
  const nightsDifference = newNights - originalNights

  // Get room rate
  const roomRate = reservation.room_rate_types?.base_price || roomType?.base_price || 0

  // Calculate totals
  const originalSubtotal = roomRate * originalNights
  const newSubtotal = roomRate * newNights
  const originalTax = originalSubtotal * (taxRate / 100)
  const newTax = newSubtotal * (taxRate / 100)
  const originalTotal = originalSubtotal + originalTax
  const newTotal = newSubtotal + newTax
  const difference = newTotal - originalTotal

  // Quick adjust buttons
  const adjustNights = (days) => {
    if (!newCheckOutDate) return
    const adjusted = addDays(newCheckOutDate, days)
    // Don't allow check-out before or on check-in date
    if (adjusted > checkInDate) {
      setNewCheckOutDate(adjusted)
    }
  }

  // Handle save
  const handleSave = async () => {
    if (!newCheckOutDate || newNights === originalNights) {
      onOpenChange(false)
      return
    }

    setLoading(true)
    try {
      const newCheckOutStr = format(newCheckOutDate, 'yyyy-MM-dd')

      // Get the folio for this reservation
      const { data: folio, error: folioError } = await getFolioByReservation(reservation.id)
      if (folioError || !folio) {
        throw new Error('Could not find folio for this reservation')
      }

      if (nightsDifference > 0) {
        // EXTENDING: Add charges for the additional nights
        const extendStartDate = originalCheckOut
        const extendEndDate = newCheckOutDate

        // Generate room charges for the extended nights
        await generateDailyRoomChargesWithTax(
          reservation.id,
          folio.id,
          roomRate,
          format(extendStartDate, 'yyyy-MM-dd'),
          format(extendEndDate, 'yyyy-MM-dd'),
          room?.room_number || 'TBD',
          null, // userId
          true, // applyTaxes
          roomType?.name || '' // roomTypeName
        )

        // Generate meal charges if reservation has a meal plan
        if (reservation.meal_plan) {
          const mealPlanData = await getMealPlanWithMeals(reservation.meal_plan)
          if (mealPlanData?.data && mealPlanData.data.is_meal_plan !== false) {
            const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0)
            await generateDailyMealChargesWithTax(
              reservation.id,
              folio.id,
              mealPlanData.data,
              totalGuests,
              format(extendStartDate, 'yyyy-MM-dd'),
              format(extendEndDate, 'yyyy-MM-dd'),
              room?.room_number || 'TBD',
              null, // userId
              true, // applyTaxes
              roomType?.name || '' // roomTypeName
            )
          }
        }
      } else if (nightsDifference < 0) {
        // SHORTENING: Void pending charges for the removed nights
        const { data: transactions } = await getTransactionsByReservation(reservation.id)
        if (transactions) {
          // Find pending room charges for dates we're removing
          const pendingRoomCharges = transactions.filter(t =>
            t.transaction_type === 'room_charge' &&
            t.transaction_status === 'pending' &&
            t.scheduled_post_date
          )

          // Sort by date descending to remove from the end
          pendingRoomCharges.sort((a, b) =>
            new Date(b.scheduled_post_date) - new Date(a.scheduled_post_date)
          )

          // Void the appropriate number of charges from the end
          const chargesToVoid = pendingRoomCharges.slice(0, Math.abs(nightsDifference))
          for (const charge of chargesToVoid) {
            await voidTransactionWithChildren(charge.id, 'Stay shortened', null)
          }

          // Also void corresponding meal charges if applicable
          if (reservation.meal_plan) {
            const pendingMealCharges = transactions.filter(t =>
              t.transaction_type === 'service_charge' &&
              t.transaction_status === 'pending' &&
              t.service_category === 'Meal Plan' &&
              t.scheduled_post_date
            )

            pendingMealCharges.sort((a, b) =>
              new Date(b.scheduled_post_date) - new Date(a.scheduled_post_date)
            )

            const mealChargesToVoid = pendingMealCharges.slice(0, Math.abs(nightsDifference))
            for (const charge of mealChargesToVoid) {
              await voidTransactionWithChildren(charge.id, 'Stay shortened', null)
            }
          }
        }
      }

      // Calculate new total amount for the reservation
      const newTotalAmount = newSubtotal + newTax

      // Update reservation with new checkout date and total
      await updateReservation(reservation.id, {
        check_out_date: newCheckOutStr,
        total_amount: newTotalAmount,
        room_subtotal: newSubtotal
      }, { skipChargeReconciliation: true }) // Skip auto reconciliation since we handled it

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error extending nights:', error)
      alert('Failed to update stay: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extend/Shorten Stay</DialogTitle>
          <DialogDescription>
            Adjust the check-out date for {reservation.guests?.name || 'Guest'} -
            Room {room?.room_number || 'TBD'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Stay Info */}
          <div className="p-4 bg-muted/30 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Room Type:</span>
              <span className="font-medium">{roomType?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Rate:</span>
              <span className="font-medium">{formatCurrency(roomRate)}/night</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Check-in:</span>
              <span className="font-medium">{format(checkInDate, 'EEE, MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <Label>New Check-out Date</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustNights(-1)}
                disabled={newNights <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 justify-start text-left font-normal"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {newCheckOutDate ? format(newCheckOutDate, 'EEE, MMM dd, yyyy') : 'Select date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={newCheckOutDate}
                    onSelect={(date) => {
                      if (date && date > checkInDate) {
                        setNewCheckOutDate(date)
                        setCalendarOpen(false)
                      }
                    }}
                    disabled={(date) => date <= checkInDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="icon"
                onClick={() => adjustNights(1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Adjust Buttons */}
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewCheckOutDate(originalCheckOut)}
                className="text-xs"
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => adjustNights(7)}
                className="text-xs"
              >
                +1 Week
              </Button>
            </div>
          </div>

          {/* Nights Comparison */}
          <div className="flex items-center justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{originalNights}</p>
              <p className="text-xs text-muted-foreground">Original</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{newNights}</p>
              <p className="text-xs text-muted-foreground">New</p>
            </div>
            {nightsDifference !== 0 && (
              <Badge variant={nightsDifference > 0 ? 'default' : 'secondary'}>
                {nightsDifference > 0 ? '+' : ''}{nightsDifference} night{Math.abs(nightsDifference) !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Recalculated Totals */}
          <div className="border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">Recalculated Totals</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Room Subtotal:</span>
                <span>{formatCurrency(newSubtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax ({taxRate}%):</span>
                <span>{formatCurrency(newTax)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>New Total:</span>
                <span>{formatCurrency(newTotal)}</span>
              </div>
              {nightsDifference !== 0 && (
                <div className={`flex justify-between pt-2 ${difference > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  <span>Difference:</span>
                  <span className="font-semibold">
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Info about folio updates */}
          {nightsDifference !== 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {nightsDifference > 0
                ? 'Additional room charges will be added to the folio.'
                : 'Pending charges for removed nights will be voided.'}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || newNights === originalNights}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Updating...
              </>
            ) : (
              'Update Stay'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
