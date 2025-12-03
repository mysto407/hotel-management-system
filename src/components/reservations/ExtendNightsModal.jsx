import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
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
import { differenceInDays } from 'date-fns'

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
        await fetchUnavailableDates(reservation.room_id, reservation.id)
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch dates that are unavailable due to other reservations
  const fetchUnavailableDates = async (roomId, currentReservationId) => {
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

  // Helper to find the current display index, handling cases where date isn't found
  const getCurrentDisplayIndex = () => {
    if (!displayStartDate || allDates.length === 0) return 0
    const currentDateStr = displayStartDate.toISOString().split('T')[0]
    let index = allDates.indexOf(currentDateStr)
    // If not found, find the closest date
    if (index === -1) {
      index = allDates.findIndex(d => d >= currentDateStr)
      if (index === -1) index = allDates.length - 14 // Past the end, go to last valid position
    }
    return Math.max(0, index)
  }

  // Navigate dates - ensure we always show exactly 14 dates
  const goToPrevious = () => {
    if (allDates.length > 0) {
      const currentIndex = getCurrentDisplayIndex()
      // Move back 14 days, but don't go before the first date
      const newIndex = Math.max(0, currentIndex - 14)
      setDisplayStartDate(new Date(allDates[newIndex]))
    }
  }

  const goToNext = () => {
    if (allDates.length > 0) {
      const currentIndex = getCurrentDisplayIndex()
      // Move forward 14 days, but ensure we still have 14 dates to show
      const maxStartIndex = Math.max(0, allDates.length - 14)
      const newIndex = Math.min(maxStartIndex, currentIndex + 14)
      setDisplayStartDate(new Date(allDates[newIndex]))
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        {loading || !reservation || allDates.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">Loading reservation data...</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="space-y-0">
              <div className="flex items-center justify-between">
                <DialogTitle>Extend / Shorten Stay</DialogTitle>
                {/* Compact Legend */}
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-emerald-100 dark:bg-emerald-900/40"></div>
                    <span>Booked</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-500"></div>
                    <span>Selected</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-sm bg-red-100 dark:bg-red-950/40"></div>
                    <span>Unavailable</span>
                  </div>
                </div>
              </div>
              <DialogDescription>
                {info && (
                  <span className="text-xs">
                    {info.guestName} – {info.referenceNo} – {info.roomName} (Room {info.roomNumber})
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Navigation and Action Buttons */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-1">
                  <Button onClick={goToPrevious} variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={() => setDisplayStartDate(new Date(reservation.check_in_date))}
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                  >
                    Booking
                  </Button>
                  <Button onClick={goToNext} variant="ghost" size="icon" className="h-8 w-8">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1">
                  {selectedDates.length > 0 && (
                    <span className="text-xs text-muted-foreground mr-2">
                      {selectedDates.length} selected
                    </span>
                  )}
                  <Button
                    onClick={handleAdd}
                    disabled={selectedDates.length === 0}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={selectedDates.length === 0}
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                  <Button onClick={clearSelection} variant="ghost" size="sm" className="h-7 text-xs">
                    Clear
                  </Button>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  // Get exactly 14 dates to display
                  const displayStart = displayStartDate?.toISOString().split('T')[0]
                  let startIndex = displayStart ? allDates.indexOf(displayStart) : 0
                  // If date not found in array, find the closest one
                  if (startIndex === -1) {
                    startIndex = allDates.findIndex(d => d >= displayStart) || 0
                  }
                  // Ensure we always show exactly 14 dates
                  const maxStartIndex = Math.max(0, allDates.length - 14)
                  startIndex = Math.min(Math.max(0, startIndex), maxStartIndex)
                  return allDates.slice(startIndex, startIndex + 14)
                })()
                  .map(dateStr => {
                    const booking = bookedDates.get(dateStr)
                    const isBooked = !!booking
                    const isSelected = selectedDates.includes(dateStr)
                    const isUnavailable = unavailableDates.has(dateStr)
                    const date = new Date(dateStr)
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
                    const dayNum = date.getDate()
                    const monthName = date.toLocaleDateString('en-US', { month: 'short' })

                    return (
                      <div
                        key={dateStr}
                        onClick={() => toggleDateSelection(dateStr)}
                        className={`
                          flex flex-col items-center justify-center py-2 px-1 rounded cursor-pointer
                          transition-all text-center min-h-[60px]
                          ${isUnavailable
                            ? 'bg-red-100 dark:bg-red-950/40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                              : isBooked
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : 'bg-muted/30 hover:bg-muted/60'
                          }
                        `}
                      >
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {dayName}
                        </span>
                        <span className={`text-sm font-semibold leading-tight ${isBooked ? 'text-emerald-700 dark:text-emerald-300' : ''}`}>
                          {dayNum}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {monthName}
                        </span>
                        {isBooked && (
                          <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                            {formatCurrency(booking.price)}
                          </span>
                        )}
                        {isUnavailable && !isBooked && (
                          <span className="text-[9px] text-red-600 dark:text-red-400">
                            Booked
                          </span>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Totals Comparison - Only show after changes */}
              {nightsDifference !== 0 && (
                <div className="border rounded-md p-3 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Original: </span>
                        <span>{originalTotals.nights} nights • {formatCurrency(originalTotals.total)}</span>
                      </div>
                      <div className="text-xs font-medium">
                        <span className="text-muted-foreground">New: </span>
                        <span>{totals.nights} nights • {formatCurrency(totals.total)}</span>
                      </div>
                    </div>
                    <div className={`text-xs font-semibold px-2 py-1 rounded ${
                      totalDifference > 0
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    }`}>
                      {nightsDifference > 0 ? '+' : ''}{nightsDifference} night{Math.abs(nightsDifference) !== 1 ? 's' : ''} ({totalDifference > 0 ? '+' : ''}{formatCurrency(totalDifference)})
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t">
                <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleUpdate} disabled={saving || nightsDifference === 0}>
                  {saving ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
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
