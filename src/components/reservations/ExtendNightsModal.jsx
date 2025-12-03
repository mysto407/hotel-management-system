import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog'
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
import { format, addDays, differenceInDays } from 'date-fns'

export default function ExtendNightsModal({
  open,
  onOpenChange,
  reservation,
  onSuccess
}) {
  const { rooms, roomTypes } = useRooms()
  const { updateReservation } = useReservations()

  // State for date range display
  const [displayStartDate, setDisplayStartDate] = useState(null)
  const [allDates, setAllDates] = useState([])
  const [selectedDates, setSelectedDates] = useState([])
  const [bookedDates, setBookedDates] = useState(new Map())
  const [unavailableDates, setUnavailableDates] = useState(new Set()) // Dates booked by OTHER reservations

  // State for loading and saving
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [taxRate, setTaxRate] = useState(18)

  // State for alert dialog
  const [alertDialog, setAlertDialog] = useState({
    open: false,
    title: '',
    description: '',
    onConfirm: null,
    showCancel: false,
  })

  const showAlert = (title, description, onConfirm = null) => {
    setAlertDialog({
      open: true,
      title,
      description,
      onConfirm,
      showCancel: !!onConfirm,
    })
  }

  const closeAlert = () => {
    setAlertDialog({ ...alertDialog, open: false })
  }

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
    if (reservation && open && rooms.length > 0 && roomTypes.length > 0) {
      initializeData()
    }
  }, [reservation, open, rooms, roomTypes])

  const initializeData = async () => {
    setLoading(true)
    try {
      const checkIn = new Date(reservation.check_in_date)
      const checkOut = new Date(reservation.check_out_date)

      // Generate extended date range (30 days before check-in to 30 days after check-out)
      const startDate = new Date(checkIn)
      startDate.setDate(startDate.getDate() - 30)

      const endDate = new Date(checkOut)
      endDate.setDate(endDate.getDate() + 30)

      const dates = []
      const bookedMap = new Map()
      let currentDate = new Date(startDate)

      // Get room and room type info
      const room = rooms.find(r => r.id === reservation.room_id)
      const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))
      const roomRate = reservation.room_rate_types?.base_price || roomType?.base_price || 0

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        dates.push(dateStr)

        // Mark as booked only if within the current reservation range
        const dateObj = new Date(currentDate)
        if (dateObj >= checkIn && dateObj < checkOut) {
          bookedMap.set(dateStr, {
            roomTypeName: roomType?.name || 'Unknown',
            roomNumber: room?.room_number || 'TBD',
            price: roomRate,
            date: dateStr,
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      setAllDates(dates)
      setBookedDates(bookedMap)
      setDisplayStartDate(checkIn)

      // Fetch unavailable dates (other reservations for this room)
      if (reservation.room_id) {
        await fetchUnavailableDates(reservation.room_id, reservation.id, dates)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch dates that are unavailable due to other reservations
  const fetchUnavailableDates = async (roomId, currentReservationId, allDatesList) => {
    try {
      // Get all reservations for this room
      const { data: roomReservations, error } = await getReservationsForRoom(roomId)

      if (error || !roomReservations) {
        console.error('Error fetching room reservations:', error)
        return
      }

      const unavailable = new Set()

      roomReservations.forEach(res => {
        // Skip the current reservation
        if (res.id === currentReservationId) return
        // Skip cancelled reservations
        if (res.status === 'Cancelled' || res.status === 'No-show') return

        const resCheckIn = new Date(res.check_in_date)
        const resCheckOut = new Date(res.check_out_date)

        // Mark all dates in this reservation as unavailable
        let date = new Date(resCheckIn)
        while (date < resCheckOut) {
          const dateStr = date.toISOString().split('T')[0]
          unavailable.add(dateStr)
          date.setDate(date.getDate() + 1)
        }
      })

      setUnavailableDates(unavailable)
    } catch (err) {
      console.error('Error fetching unavailable dates:', err)
    }
  }

  // Toggle date selection
  const toggleDateSelection = (dateStr) => {
    // Don't allow selecting unavailable dates
    if (unavailableDates.has(dateStr)) {
      showAlert('Date Unavailable', 'This date is already booked by another reservation.')
      return
    }

    setSelectedDates(prev => {
      if (prev.includes(dateStr)) {
        return prev.filter(d => d !== dateStr)
      } else {
        return [...prev, dateStr]
      }
    })
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedDates([])
  }

  // Navigate dates
  const goToPrevious = () => {
    if (displayStartDate) {
      const newDate = new Date(displayStartDate)
      newDate.setDate(newDate.getDate() - 7)
      setDisplayStartDate(newDate)
    }
  }

  const goToNext = () => {
    if (displayStartDate) {
      const newDate = new Date(displayStartDate)
      newDate.setDate(newDate.getDate() + 7)
      setDisplayStartDate(newDate)
    }
  }

  // Add selected dates to booking
  const handleAdd = () => {
    if (selectedDates.length === 0) {
      showAlert('Dates Required', 'Please select at least one date to add.')
      return
    }

    // Check if any selected dates are unavailable
    const unavailableSelected = selectedDates.filter(d => unavailableDates.has(d))
    if (unavailableSelected.length > 0) {
      showAlert('Dates Unavailable', 'Some selected dates are already booked by other reservations.')
      return
    }

    const room = rooms.find(r => r.id === reservation.room_id)
    const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))
    const roomRate = reservation.room_rate_types?.base_price || roomType?.base_price || 0

    const newBookedDates = new Map(bookedDates)

    selectedDates.forEach(dateStr => {
      if (!bookedDates.has(dateStr)) {
        newBookedDates.set(dateStr, {
          roomTypeName: roomType?.name || 'Unknown',
          roomNumber: room?.room_number || 'TBD',
          price: roomRate,
          date: dateStr,
        })
      }
    })

    setBookedDates(newBookedDates)
    clearSelection()
  }

  // Delete selected dates from booking
  const handleDelete = () => {
    if (selectedDates.length === 0) {
      showAlert('Dates Required', 'Please select dates to remove.')
      return
    }

    // Count how many bookings will be deleted
    const deleteCount = selectedDates.filter(d => bookedDates.has(d)).length

    if (deleteCount === 0) {
      showAlert('No Booked Dates', 'None of the selected dates are currently booked.')
      return
    }

    // Don't allow deleting all dates
    const remainingCount = bookedDates.size - deleteCount
    if (remainingCount === 0) {
      showAlert('Cannot Remove All', 'You must keep at least one night. To cancel the reservation entirely, use the Cancel action instead.')
      return
    }

    showAlert(
      'Confirm Remove',
      `Remove ${deleteCount} night${deleteCount !== 1 ? 's' : ''} from the booking?`,
      () => {
        const newBookedDates = new Map(bookedDates)
        selectedDates.forEach(dateStr => {
          newBookedDates.delete(dateStr)
        })
        setBookedDates(newBookedDates)
        clearSelection()
        closeAlert()
      }
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    bookedDates.forEach(booking => {
      subtotal += booking.price
    })
    const tax = subtotal * (taxRate / 100)
    return {
      subtotal,
      tax,
      taxRate,
      total: subtotal + tax,
      nights: bookedDates.size,
    }
  }

  const totals = calculateTotals()

  // Calculate original totals for comparison
  const calculateOriginalTotals = () => {
    const checkIn = new Date(reservation.check_in_date)
    const checkOut = new Date(reservation.check_out_date)
    const originalNights = differenceInDays(checkOut, checkIn)
    const room = rooms.find(r => r.id === reservation.room_id)
    const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))
    const roomRate = reservation.room_rate_types?.base_price || roomType?.base_price || 0
    const subtotal = roomRate * originalNights
    const tax = subtotal * (taxRate / 100)
    return {
      subtotal,
      tax,
      total: subtotal + tax,
      nights: originalNights,
    }
  }

  const originalTotals = reservation ? calculateOriginalTotals() : { nights: 0, total: 0 }
  const nightsDifference = totals.nights - originalTotals.nights
  const totalDifference = totals.total - originalTotals.total

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Handle update/save
  const handleUpdate = async () => {
    if (bookedDates.size === 0) {
      showAlert('No Dates', 'Cannot save - no dates remaining.')
      return
    }

    // Get the new date range from booked dates
    const sortedDates = Array.from(bookedDates.keys()).sort()
    const newCheckIn = sortedDates[0]
    const newCheckOutDate = new Date(sortedDates[sortedDates.length - 1])
    newCheckOutDate.setDate(newCheckOutDate.getDate() + 1)
    const newCheckOut = newCheckOutDate.toISOString().split('T')[0]

    // Check if dates have actually changed
    const originalCheckIn = reservation.check_in_date
    const originalCheckOut = reservation.check_out_date

    if (newCheckIn === originalCheckIn && newCheckOut === originalCheckOut) {
      onOpenChange(false)
      return
    }

    setSaving(true)
    try {
      const room = rooms.find(r => r.id === reservation.room_id)
      const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))
      const roomRate = reservation.room_rate_types?.base_price || roomType?.base_price || 0

      // Get the folio for this reservation
      const { data: folio, error: folioError } = await getFolioByReservation(reservation.id)
      if (folioError || !folio) {
        throw new Error('Could not find folio for this reservation')
      }

      // Determine which dates were added and which were removed
      const originalDates = new Set()
      const origCheckIn = new Date(originalCheckIn)
      const origCheckOut = new Date(originalCheckOut)
      let d = new Date(origCheckIn)
      while (d < origCheckOut) {
        originalDates.add(d.toISOString().split('T')[0])
        d.setDate(d.getDate() + 1)
      }

      const newDates = new Set(bookedDates.keys())

      // Dates to add (in new but not in original)
      const datesToAdd = [...newDates].filter(d => !originalDates.has(d)).sort()

      // Dates to remove (in original but not in new)
      const datesToRemove = [...originalDates].filter(d => !newDates.has(d)).sort()

      // Handle added dates - generate charges
      if (datesToAdd.length > 0) {
        // Group consecutive dates for charge generation
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
          // Find pending charges for the removed dates
          for (const dateStr of datesToRemove) {
            const dateToRemove = new Date(dateStr)

            const chargesForDate = transactions.filter(t => {
              if (t.transaction_status !== 'pending') return false
              if (!t.scheduled_post_date) return false
              const chargeDate = new Date(t.scheduled_post_date)
              return chargeDate.toISOString().split('T')[0] === dateStr
            })

            for (const charge of chargesForDate) {
              await voidTransactionWithChildren(charge.id, 'Stay dates changed', null)
            }
          }
        }
      }

      // Update reservation with new dates and total
      await updateReservation(reservation.id, {
        check_in_date: newCheckIn,
        check_out_date: newCheckOut,
        total_amount: totals.total,
        room_subtotal: totals.subtotal
      }, { skipChargeReconciliation: true })

      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error updating stay:', error)
      showAlert('Error', 'Failed to update stay: ' + error.message)
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
      const currDate = new Date(sorted[i])
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

  // Get reservation info
  const getReservationInfo = () => {
    if (!reservation) return null

    const room = rooms.find(r => r.id === reservation.room_id)
    const roomType = roomTypes.find(rt => rt.id === (room?.room_type_id || reservation.room_type_id))

    return {
      guestName: reservation.guests?.name || 'Guest',
      referenceNo: reservation.id.substring(0, 13),
      roomName: roomType?.name || 'Unknown',
      roomNumber: room?.room_number || 'TBD',
    }
  }

  const info = getReservationInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        {loading || !reservation || allDates.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading reservation data...</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Extend / Shorten Stay</DialogTitle>
              <DialogDescription>
                {info && (
                  <div className="text-sm font-medium text-foreground mt-2">
                    {info.guestName} – {info.referenceNo} – {info.roomName} (Room {info.roomNumber})
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Navigation and Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button onClick={goToPrevious} variant="outline" size="sm">
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    onClick={() => setDisplayStartDate(new Date(reservation.check_in_date))}
                    variant="outline"
                    size="sm"
                  >
                    Go to Booking
                  </Button>
                  <Button onClick={goToNext} variant="outline" size="sm">
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAdd}
                    disabled={selectedDates.length === 0}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={selectedDates.length === 0}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button onClick={clearSelection} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </div>

              {/* Dates Display */}
              <div className="border rounded-lg p-4 bg-background">
                <div className="flex flex-wrap gap-2">
                  {allDates
                    .filter((dateStr, index) => {
                      if (!displayStartDate) return true
                      const displayStart = displayStartDate.toISOString().split('T')[0]
                      const displayIndex = allDates.indexOf(displayStart)
                      return index >= displayIndex && index < displayIndex + 21
                    })
                    .map(dateStr => {
                      const booking = bookedDates.get(dateStr)
                      const isBooked = !!booking
                      const isSelected = selectedDates.includes(dateStr)
                      const isUnavailable = unavailableDates.has(dateStr)

                      return (
                        <div
                          key={dateStr}
                          onClick={() => toggleDateSelection(dateStr)}
                          className={`
                            flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer
                            transition-all min-w-[80px]
                            ${isUnavailable
                              ? 'border-red-300 bg-red-50 dark:bg-red-950/30 cursor-not-allowed opacity-75'
                              : isSelected
                                ? 'border-green-500 bg-green-50 dark:bg-green-950/30'
                                : isBooked
                                  ? 'border-primary bg-primary/10 shadow-md'
                                  : 'border-muted bg-muted/20 hover:border-primary/50'
                            }
                          `}
                        >
                          <div className="text-xs font-medium mb-1">
                            {formatDate(dateStr)}
                          </div>
                          {isUnavailable && !isBooked && (
                            <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                              Unavailable
                            </div>
                          )}
                          {isBooked && (
                            <>
                              <div className="text-xs text-muted-foreground">
                                {booking.roomTypeName}
                              </div>
                              <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(booking.price)}
                              </div>
                            </>
                          )}
                          {!isBooked && !isUnavailable && (
                            <div className="text-xs text-muted-foreground">
                              Available
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-primary bg-primary/10"></div>
                    <span>Current booking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-50 dark:bg-green-950/30"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-red-300 bg-red-50 dark:bg-red-950/30"></div>
                    <span>Unavailable (other booking)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded border-2 border-muted bg-muted/20"></div>
                    <span>Available</span>
                  </div>
                </div>

                {/* Selection Info */}
                {selectedDates.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <Badge variant="secondary">
                      {selectedDates.length} date{selectedDates.length !== 1 ? 's' : ''} selected
                    </Badge>
                  </div>
                )}
              </div>

              {/* Totals Comparison - Only show after changes */}
              {nightsDifference !== 0 && (
                <div className="border rounded-lg p-4 bg-muted/20">
                  <h3 className="font-semibold mb-3">Recalculated Totals</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">Original</div>
                      <div className="flex justify-between text-sm">
                        <span>Nights:</span>
                        <span>{originalTotals.nights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total:</span>
                        <span>{formatCurrency(originalTotals.total)}</span>
                      </div>
                    </div>

                    {/* New */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">New</div>
                      <div className="flex justify-between text-sm">
                        <span>Nights:</span>
                        <span className="font-medium">{totals.nights}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Tax ({totals.taxRate}%):</span>
                        <span>{formatCurrency(totals.tax)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Difference */}
                  <div className="mt-4 pt-4 border-t">
                    <div className={`flex justify-between text-sm font-semibold ${totalDifference > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      <span>
                        {nightsDifference > 0 ? '+' : ''}{nightsDifference} night{Math.abs(nightsDifference) !== 1 ? 's' : ''}
                      </span>
                      <span>
                        {totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {nightsDifference > 0
                        ? 'Additional room charges will be added to the folio.'
                        : 'Pending charges for removed nights will be voided.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={saving || nightsDifference === 0}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>

      {/* Alert Dialog */}
      <AlertDialog open={alertDialog.open} onOpenChange={closeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {alertDialog.showCancel && (
              <AlertDialogCancel onClick={closeAlert}>Cancel</AlertDialogCancel>
            )}
            <AlertDialogAction
              onClick={() => {
                if (alertDialog.onConfirm) {
                  alertDialog.onConfirm()
                } else {
                  closeAlert()
                }
              }}
            >
              {alertDialog.showCancel ? 'Confirm' : 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
