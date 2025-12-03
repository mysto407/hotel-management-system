import { useState, useEffect } from 'react'
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Calendar } from '../ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover'
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
  getTransactionsByReservation,
  getReservationsForRoom
} from '../../lib/supabase'
import { format, differenceInDays, addDays, isWithinInterval, isBefore, isAfter, isSameDay } from 'date-fns'

export default function ExtendNightsModal({
  open,
  onOpenChange,
  reservation,
  onSuccess
}) {
  const { rooms, roomTypes } = useRooms()
  const { updateReservation } = useReservations()

  const [checkIn, setCheckIn] = useState(null)
  const [checkOut, setCheckOut] = useState(null)
  const [unavailableRanges, setUnavailableRanges] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taxRate, setTaxRate] = useState(18)
  const [conflict, setConflict] = useState(null)

  // Load dynamic tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      const { rate } = await getTotalTaxRate('room_charge')
      if (rate > 0) setTaxRate(rate)
    }
    loadTaxRate()
  }, [])

  // Initialize data when modal opens
  useEffect(() => {
    if (reservation && open) {
      setCheckIn(new Date(reservation.check_in_date))
      setCheckOut(new Date(reservation.check_out_date))
      setConflict(null)

      if (reservation.room_id) {
        fetchUnavailableRanges(reservation.room_id, reservation.id)
      }
    }
  }, [reservation, open])

  // Fetch unavailable date ranges
  const fetchUnavailableRanges = async (roomId, currentReservationId) => {
    setLoading(true)
    try {
      const { data: roomReservations, error } = await getReservationsForRoom(roomId)

      if (error || !roomReservations) {
        console.error('Error fetching room reservations:', error)
        return
      }

      const ranges = roomReservations
        .filter(res => res.id !== currentReservationId && res.status !== 'Cancelled' && res.status !== 'No-show')
        .map(res => ({
          start: new Date(res.check_in_date),
          end: new Date(res.check_out_date)
        }))

      setUnavailableRanges(ranges)
    } catch (err) {
      console.error('Error fetching unavailable ranges:', err)
    } finally {
      setLoading(false)
    }
  }

  // Check for conflicts when dates change
  useEffect(() => {
    if (!checkIn || !checkOut || unavailableRanges.length === 0) {
      setConflict(null)
      return
    }

    for (const range of unavailableRanges) {
      // Check if our range overlaps with unavailable range
      const overlaps = (
        (checkIn < range.end && checkOut > range.start)
      )

      if (overlaps) {
        setConflict({
          start: range.start,
          end: range.end
        })
        return
      }
    }
    setConflict(null)
  }, [checkIn, checkOut, unavailableRanges])

  // Get room info
  const room = rooms.find(r => r.id === reservation?.room_id)
  const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation?.room_type_id))
  const roomRate = reservation?.room_rate_types?.base_price || roomType?.base_price || 0

  // Calculate totals
  const originalCheckIn = reservation ? new Date(reservation.check_in_date) : null
  const originalCheckOut = reservation ? new Date(reservation.check_out_date) : null
  const originalNights = originalCheckIn && originalCheckOut ? differenceInDays(originalCheckOut, originalCheckIn) : 0
  const newNights = checkIn && checkOut ? differenceInDays(checkOut, checkIn) : 0
  const nightsDifference = newNights - originalNights

  const originalSubtotal = roomRate * originalNights
  const originalTax = originalSubtotal * (taxRate / 100)
  const originalTotal = originalSubtotal + originalTax

  const newSubtotal = roomRate * newNights
  const newTax = newSubtotal * (taxRate / 100)
  const newTotal = newSubtotal + newTax

  const totalDifference = newTotal - originalTotal

  // Check if dates have changed
  const hasChanges = checkIn && checkOut && originalCheckIn && originalCheckOut && (
    !isSameDay(checkIn, originalCheckIn) || !isSameDay(checkOut, originalCheckOut)
  )

  // Disable dates that are unavailable
  const disabledDates = (date) => {
    for (const range of unavailableRanges) {
      if (date >= range.start && date < range.end) {
        return true
      }
    }
    return false
  }

  // Handle update
  const handleUpdate = async () => {
    if (!checkIn || !checkOut || newNights <= 0) return
    if (conflict) return

    setSaving(true)
    try {
      const newCheckInStr = checkIn.toISOString().split('T')[0]
      const newCheckOutStr = checkOut.toISOString().split('T')[0]

      // Get the folio for this reservation
      const { data: folio, error: folioError } = await getFolioByReservation(reservation.id)
      if (folioError || !folio) {
        throw new Error('Could not find folio for this reservation')
      }

      // Determine which dates were added and which were removed
      const originalDates = new Set()
      let d = new Date(originalCheckIn)
      while (d < originalCheckOut) {
        originalDates.add(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }

      const newDates = new Set()
      d = new Date(checkIn)
      while (d < checkOut) {
        newDates.add(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }

      const datesToAdd = [...newDates].filter(dt => !originalDates.has(dt)).sort()
      const datesToRemove = [...originalDates].filter(dt => !newDates.has(dt)).sort()

      // Handle added dates - generate charges
      if (datesToAdd.length > 0) {
        const addedRanges = groupConsecutiveDates(datesToAdd)

        for (const range of addedRanges) {
          const rangeCheckOut = new Date(range[range.length - 1])
          rangeCheckOut.setDate(rangeCheckOut.getDate() + 1)

          await generateDailyRoomChargesWithTax(
            reservation.id,
            folio.id,
            roomRate,
            range[0],
            rangeCheckOut.toISOString().split('T')[0],
            room?.room_number || 'TBD',
            null,
            true,
            roomType?.name || ''
          )

          // Generate meal charges if applicable
          if (reservation.meal_plan) {
            const mealPlanData = await getMealPlanWithMeals(reservation.meal_plan)
            if (mealPlanData?.data && mealPlanData.data.is_meal_plan !== false) {
              const totalGuests = (reservation.number_of_adults || 1) + (reservation.number_of_children || 0)
              await generateDailyMealChargesWithTax(
                reservation.id,
                folio.id,
                mealPlanData.data,
                totalGuests,
                range[0],
                rangeCheckOut.toISOString().split('T')[0],
                room?.room_number || 'TBD',
                null,
                true,
                roomType?.name || ''
              )
            }
          }
        }
      }

      // Handle removed dates - void charges
      if (datesToRemove.length > 0) {
        const { data: transactions } = await getTransactionsByReservation(reservation.id)
        if (transactions) {
          for (const dateStr of datesToRemove) {
            const chargesForDate = transactions.filter(t => {
              if (t.transaction_status !== 'pending') return false
              if (!t.scheduled_post_date) return false
              return t.scheduled_post_date.split('T')[0] === dateStr
            })

            for (const charge of chargesForDate) {
              await voidTransactionWithChildren(charge.id, 'Stay dates changed', null)
            }
          }
        }
      }

      // Update reservation
      await updateReservation(reservation.id, {
        check_in_date: newCheckInStr,
        check_out_date: newCheckOutStr,
        total_amount: newTotal,
        room_subtotal: newSubtotal
      }, { skipChargeReconciliation: true })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error updating stay:', error)
      alert('Failed to update stay: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  // Group consecutive dates into ranges
  const groupConsecutiveDates = (dates) => {
    if (dates.length === 0) return []
    const sorted = [...dates].sort()
    const ranges = []
    let currentRange = [sorted[0]]

    for (let i = 1; i < sorted.length; i++) {
      const prevDate = new Date(sorted[i - 1])
      prevDate.setDate(prevDate.getDate() + 1)
      if (prevDate.toISOString().split('T')[0] === sorted[i]) {
        currentRange.push(sorted[i])
      } else {
        ranges.push(currentRange)
        currentRange = [sorted[i]]
      }
    }
    ranges.push(currentRange)
    return ranges
  }

  if (!reservation) return null

  const info = {
    guestName: reservation.guests?.name || 'Guest',
    roomName: roomType?.name || 'Room',
    roomNumber: room?.room_number || 'TBD',
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Extend / Shorten Stay</DialogTitle>
          <DialogDescription>
            {info.guestName} • {info.roomName} (Room {info.roomNumber})
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkIn ? format(checkIn, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkIn}
                      onSelect={(date) => {
                        if (date) {
                          setCheckIn(date)
                          // If check-out is before new check-in, adjust it
                          if (checkOut && date >= checkOut) {
                            setCheckOut(addDays(date, 1))
                          }
                        }
                      }}
                      disabled={disabledDates}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Check-out</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {checkOut ? format(checkOut, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={checkOut}
                      onSelect={setCheckOut}
                      disabled={(date) => (checkIn && date <= checkIn) || disabledDates(date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Conflict Warning */}
            {conflict && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Date Conflict</p>
                  <p className="text-muted-foreground">
                    Room is booked {format(conflict.start, 'MMM d')} – {format(conflict.end, 'MMM d')}
                  </p>
                </div>
              </div>
            )}

            {/* Summary - Only show when there are changes */}
            {hasChanges && !conflict && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Original</span>
                  <span>{originalNights} night{originalNights !== 1 ? 's' : ''} • {formatCurrency(originalTotal)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>New</span>
                  <span>{newNights} night{newNights !== 1 ? 's' : ''} • {formatCurrency(newTotal)}</span>
                </div>
                <div className="pt-2 border-t">
                  <div className={`flex justify-between text-sm font-semibold ${
                    totalDifference > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span>{nightsDifference > 0 ? '+' : ''}{nightsDifference} night{Math.abs(nightsDifference) !== 1 ? 's' : ''}</span>
                    <span>{totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={saving || !hasChanges || !!conflict || newNights <= 0}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
