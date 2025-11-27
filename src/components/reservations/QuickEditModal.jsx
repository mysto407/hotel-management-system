import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Label } from '../ui/label'
import { useRooms } from '../../context/RoomContext'
import { formatCurrency } from '../../utils/currency'
import { getAvailableRooms, getActiveRoomRateTypes, getTotalTaxRate } from '../../lib/supabase'

export default function QuickEditModal({ open, onOpenChange, reservation, onSave }) {
  const { roomTypes, rooms } = useRooms()

  // State for date range display
  const [displayStartDate, setDisplayStartDate] = useState(null)
  const [allDates, setAllDates] = useState([])
  const [selectedDates, setSelectedDates] = useState([])
  const [bookedDates, setBookedDates] = useState(new Map()) // Map of date -> booking info

  // State for controls
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('')
  const [selectedRoomRateTypeId, setSelectedRoomRateTypeId] = useState('')
  const [selectedRoomIds, setSelectedRoomIds] = useState([]) // Array for multiple rooms
  const [quantity, setQuantity] = useState(1)
  const [availableRoomsForDates, setAvailableRoomsForDates] = useState([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [taxRate, setTaxRate] = useState(18) // Default 18%, loaded from tax_configurations

  // Load dynamic tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      const { rate } = await getTotalTaxRate('room_charge')
      if (rate > 0) setTaxRate(rate)
    }
    loadTaxRate()
  }, [])

  // State for modifications
  const [modifications, setModifications] = useState([])

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

  // Auto-assign rooms
  const handleAutoAssign = () => {
    if (!selectedRoomTypeId) {
      showAlert('Room Type Required', 'Please select a room type first.')
      return
    }

    if (availableRooms.length < quantity) {
      showAlert(
        'Not Enough Rooms',
        `Only ${availableRooms.length} room(s) available, but quantity is ${quantity}.`
      )
      return
    }

    // Auto-assign the first N available rooms
    const autoAssignedRooms = availableRooms.slice(0, quantity).map(room => room.id)
    setSelectedRoomIds(autoAssignedRooms)
  }

  useEffect(() => {
    if (reservation && open && rooms.length > 0 && roomTypes.length > 0) {
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
      const roomType = roomTypes.find(rt => rt.id === room?.room_type_id)

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0]
        dates.push(dateStr)

        // Mark as booked only if within the original reservation range
        const dateObj = new Date(currentDate)
        if (dateObj >= checkIn && dateObj < checkOut) {
          const bookingKey = `${dateStr}_${reservation.room_id}`
          bookedMap.set(bookingKey, {
            roomTypeId: room?.room_type_id,
            roomRateTypeId: reservation.rate_type_id,
            roomTypeName: roomType?.name || 'Unknown',
            roomId: reservation.room_id,
            roomNumber: room?.room_number || 'N/A',
            quantity: 1,
            price: reservation.room_rate_types?.base_price || roomType?.base_price || 0,
            date: dateStr,
          })
        }

        currentDate.setDate(currentDate.getDate() + 1)
      }

      setAllDates(dates)
      setBookedDates(bookedMap)
      // Jump to booked dates when modal opens
      setDisplayStartDate(checkIn)

      // Set default selections
      setSelectedRoomTypeId(room?.room_type_id || '')
      setSelectedRoomRateTypeId(reservation.rate_type_id || '')
      setSelectedRoomIds([reservation.room_id || ''])
    }
  }, [reservation, open, rooms, roomTypes])

  // Fetch room rate types when room type changes
  useEffect(() => {
    const fetchRoomRateTypes = async () => {
      if (!selectedRoomTypeId) {
        setSelectedRoomRateTypeId('')
        return
      }

      try {
        const { data: rateTypes, error } = await getActiveRoomRateTypes(selectedRoomTypeId)
        if (!error && rateTypes && rateTypes.length > 0) {
          // Use the default rate type or the first one
          const defaultRate = rateTypes.find(rt => rt.is_default) || rateTypes[0]
          setSelectedRoomRateTypeId(defaultRate.id)
        } else {
          setSelectedRoomRateTypeId('')
        }
      } catch (err) {
        console.error('Error fetching room rate types:', err)
        setSelectedRoomRateTypeId('')
      }
    }

    fetchRoomRateTypes()
  }, [selectedRoomTypeId])

  // Clear room selection when room type changes
  useEffect(() => {
    setSelectedRoomIds(Array(quantity).fill(''))
  }, [selectedRoomTypeId])

  // Resize room IDs array when quantity changes
  useEffect(() => {
    setSelectedRoomIds(prev => {
      const newArray = Array(quantity).fill('')
      // Preserve existing selections
      for (let i = 0; i < Math.min(prev.length, quantity); i++) {
        newArray[i] = prev[i] || ''
      }
      return newArray
    })
  }, [quantity])

  // Check room availability for selected dates
  useEffect(() => {
    const checkAvailability = async () => {
      if (selectedDates.length === 0 || !selectedRoomTypeId) {
        setAvailableRoomsForDates([])
        return
      }

      // Get the date range from selected dates
      const sortedDates = [...selectedDates].sort()
      const checkInDate = sortedDates[0]
      const checkOutDate = new Date(sortedDates[sortedDates.length - 1])
      checkOutDate.setDate(checkOutDate.getDate() + 1) // Add 1 day for checkout
      const checkOutStr = checkOutDate.toISOString().split('T')[0]

      setCheckingAvailability(true)
      try {
        const { data: availableRooms, error } = await getAvailableRooms(checkInDate, checkOutStr)

        if (!error && availableRooms) {
          // Filter to only rooms of the selected type
          const roomsOfType = availableRooms.filter(r => r.room_type_id === selectedRoomTypeId)
          setAvailableRoomsForDates(roomsOfType)
        } else {
          setAvailableRoomsForDates([])
        }
      } catch (err) {
        console.error('Error checking availability:', err)
        setAvailableRoomsForDates([])
      } finally {
        setCheckingAvailability(false)
      }
    }

    checkAvailability()
  }, [selectedDates, selectedRoomTypeId])

  // Toggle date selection
  const toggleDateSelection = (dateStr) => {
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

  // Navigate dates (show previous/next week)
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

  // Add booking for selected dates
  const handleAdd = () => {
    // Validation: all fields must be selected
    if (selectedDates.length === 0) {
      showAlert('Dates Required', 'Please select at least one date.')
      return
    }

    if (!selectedRoomTypeId) {
      showAlert('Room Type Required', 'Please select a Room Type.')
      return
    }

    if (!quantity || quantity < 1) {
      showAlert('Quantity Required', 'Please enter a valid Quantity.')
      return
    }

    // Validate all room slots are filled
    const filledRoomIds = selectedRoomIds.filter(id => id)
    if (filledRoomIds.length !== quantity) {
      showAlert('Room Selection Incomplete', `Please select all ${quantity} room number(s).`)
      return
    }

    // Check for duplicate room selections
    const uniqueRoomIds = new Set(filledRoomIds)
    if (uniqueRoomIds.size !== filledRoomIds.length) {
      showAlert('Duplicate Rooms', 'Cannot select the same room multiple times.')
      return
    }

    // Validate that all selected rooms exist
    for (const roomId of filledRoomIds) {
      const room = rooms.find(r => r.id === roomId)
      if (!room) {
        showAlert('Room Not Found', 'One or more selected rooms not found.')
        return
      }
    }

    // Note: We don't check room.status here because the room dropdown
    // already shows only rooms available for the selected dates (via getAvailableRooms API)

    const roomType = roomTypes.find(rt => rt.id === selectedRoomTypeId)
    const pricePerNight = roomType?.base_price || 0

    const newBookedDates = new Map(bookedDates)

    // Add bookings for each room
    selectedDates.forEach(dateStr => {
      filledRoomIds.forEach((roomId, index) => {
        const room = rooms.find(r => r.id === roomId)
        const bookingKey = `${dateStr}_${roomId}` // Unique key per date per room

        newBookedDates.set(bookingKey, {
          roomTypeId: selectedRoomTypeId,
          roomRateTypeId: selectedRoomRateTypeId,
          roomTypeName: roomType?.name || 'Unknown',
          roomId: roomId,
          roomNumber: room?.room_number || 'N/A',
          quantity: 1, // Each room is quantity 1
          price: pricePerNight,
          date: dateStr,
        })
      })
    })

    setBookedDates(newBookedDates)

    // Track modification
    setModifications(prev => [...prev, {
      action: 'add',
      dates: [...selectedDates],
      roomTypeId: selectedRoomTypeId,
      roomIds: [...filledRoomIds],
      quantity: quantity,
    }])

    clearSelection()
  }

  // Delete booking for selected dates
  const handleDelete = () => {
    if (selectedDates.length === 0) {
      showAlert('Dates Required', 'Please select dates to delete.')
      return
    }

    // Count how many bookings will be deleted
    let deleteCount = 0
    selectedDates.forEach(dateStr => {
      Array.from(bookedDates.keys()).forEach(key => {
        if (key.startsWith(dateStr)) {
          deleteCount++
        }
      })
    })

    showAlert(
      'Confirm Delete',
      `Remove ${deleteCount} booking(s) for ${selectedDates.length} date(s)?`,
      () => {
        const newBookedDates = new Map(bookedDates)
        const deletedRoomIds = []

        selectedDates.forEach(dateStr => {
          Array.from(bookedDates.keys()).forEach(key => {
            if (key.startsWith(dateStr)) {
              const booking = bookedDates.get(key)
              deletedRoomIds.push(booking.roomId)
              newBookedDates.delete(key)
            }
          })
        })

        setBookedDates(newBookedDates)

        // Track modification
        setModifications(prev => [...prev, {
          action: 'delete',
          dates: [...selectedDates],
          roomIds: deletedRoomIds,
        }])

        clearSelection()
        closeAlert()
      }
    )
  }

  // Calculate totals
  const calculateTotals = () => {
    let subtotal = 0
    bookedDates.forEach(booking => {
      subtotal += booking.price * booking.quantity
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

  // Use availability-checked rooms if we have selected dates, otherwise show all rooms of type
  const availableRooms = selectedDates.length > 0 && selectedRoomTypeId
    ? availableRoomsForDates
    : selectedRoomTypeId
      ? rooms.filter(r => r.room_type_id === selectedRoomTypeId && r.status === 'Available')
      : []

  // Calculate max quantity based on available rooms
  const maxQuantity = availableRooms.length || 1

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Handle update
  const handleUpdate = () => {
    if (bookedDates.size === 0) {
      showAlert('No Dates', 'Cannot update - no dates remaining.')
      return
    }

    // Convert bookedDates map to array format for backend
    const nights = []
    bookedDates.forEach((booking, key) => {
      nights.push({
        date: new Date(booking.date),
        roomTypeId: booking.roomTypeId,
        roomRateTypeId: booking.roomRateTypeId,
        roomId: booking.roomId,
        quantity: booking.quantity,
        price: booking.price,
      })
    })

    const splitData = {
      originalReservationId: reservation.id,
      nights: nights,
      totals: totals,
    }

    onSave(splitData)
  }

  // Get reservation info
  const getReservationInfo = () => {
    if (!reservation) return null

    const room = rooms.find(r => r.id === reservation.room_id)
    const roomType = roomTypes.find(rt => rt.id === room?.room_type_id)

    return {
      guestName: reservation.guests?.name || 'Guest',
      referenceNo: reservation.id.substring(0, 13),
      quantityOfRooms: 1, // Could be calculated based on grouped reservations
      roomName: roomType?.name || 'Unknown',
      roomNumber: room?.room_number || 'N/A',
      numberOfNights: allDates.length,
    }
  }

  const info = getReservationInfo()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {!reservation || allDates.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-muted-foreground">Loading reservation data...</p>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Quick Edit</DialogTitle>
              <DialogDescription>
                {info && (
                  <div className="text-sm font-medium text-foreground mt-2">
                    {info.guestName} – {info.referenceNo} – {info.quantityOfRooms} Room{info.quantityOfRooms !== 1 ? 's' : ''} – {info.roomName} (Room {info.roomNumber}) – {info.numberOfNights} Night{info.numberOfNights !== 1 ? 's' : ''}
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Controls Section */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="space-y-2">
                  <div className="h-5 flex items-center">
                    <Label className="flex items-center gap-1">
                      Room Type <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Select value={selectedRoomTypeId} onValueChange={setSelectedRoomTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select room type" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomTypes.map(rt => (
                        <SelectItem key={rt.id} value={rt.id}>
                          {rt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedRoomTypeId && selectedDates.length > 0 && (
                    <p className="text-xs text-red-500">Required to add booking</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="h-5 flex items-center">
                    <Label className="flex items-center gap-1">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                  </div>
                  <Select
                    value={quantity.toString()}
                    onValueChange={(value) => setQuantity(parseInt(value))}
                    disabled={!selectedRoomTypeId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select quantity" />
                    </SelectTrigger>
                    <SelectContent>
                      {!selectedRoomTypeId && (
                        <div className="p-2 text-xs text-muted-foreground">
                          Select room type first
                        </div>
                      )}
                      {selectedRoomTypeId && Array.from({ length: maxQuantity }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()}>
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!selectedRoomTypeId && selectedDates.length > 0 && (
                    <p className="text-xs text-muted-foreground">Select room type first</p>
                  )}
                  {selectedRoomTypeId && maxQuantity === 0 && (
                    <p className="text-xs text-red-500">No rooms available</p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="h-5 flex items-center justify-between">
                    <Label className="flex items-center gap-1">
                      Room Number{quantity > 1 ? 's' : ''} <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAutoAssign}
                      disabled={!selectedRoomTypeId || checkingAvailability || availableRooms.length < quantity}
                      className="h-5 px-2 text-xs"
                    >
                      Auto Assign
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Array.from({ length: quantity }, (_, index) => (
                      <Select
                        key={index}
                        value={selectedRoomIds[index] || ''}
                        onValueChange={(value) => {
                          const newRoomIds = [...selectedRoomIds]
                          newRoomIds[index] = value
                          setSelectedRoomIds(newRoomIds)
                        }}
                        disabled={!selectedRoomTypeId || checkingAvailability}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={checkingAvailability ? "Checking..." : `Room ${index + 1}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {checkingAvailability && (
                            <div className="p-2 text-xs text-muted-foreground">
                              Checking availability...
                            </div>
                          )}
                          {!checkingAvailability && availableRooms.length === 0 && selectedRoomTypeId && selectedDates.length > 0 && (
                            <div className="p-2 text-xs text-muted-foreground">
                              No rooms available for selected dates
                            </div>
                          )}
                          {!checkingAvailability && availableRooms
                            .filter(room => !selectedRoomIds.includes(room.id) || selectedRoomIds[index] === room.id)
                            .map(room => (
                              <SelectItem key={room.id} value={room.id}>
                                Room {room.room_number}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ))}
                  </div>
                  {!selectedRoomTypeId && selectedDates.length > 0 && (
                    <p className="text-xs text-muted-foreground">Select room type first</p>
                  )}
                  {checkingAvailability && (
                    <p className="text-xs text-muted-foreground">Checking availability for selected dates...</p>
                  )}
                  {!checkingAvailability && selectedRoomTypeId && availableRooms.length === 0 && selectedDates.length > 0 && (
                    <p className="text-xs text-red-500">No rooms available for selected dates</p>
                  )}
                  {!checkingAvailability && selectedRoomIds.filter(id => id).length < quantity && selectedDates.length > 0 && selectedRoomTypeId && availableRooms.length > 0 && (
                    <p className="text-xs text-red-500">Please select all {quantity} room(s)</p>
                  )}
                </div>
              </div>

              {/* Navigation Buttons */}
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
                    disabled={
                      selectedDates.length === 0 ||
                      !selectedRoomTypeId ||
                      !quantity ||
                      quantity < 1 ||
                      selectedRoomIds.filter(id => id).length !== quantity
                    }
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
                      // Show 21 dates at a time based on displayStartDate
                      if (!displayStartDate) return true
                      const displayStart = displayStartDate.toISOString().split('T')[0]
                      const displayIndex = allDates.indexOf(displayStart)
                      return index >= displayIndex && index < displayIndex + 21
                    })
                    .map(dateStr => {
                    // Find all bookings for this date
                    const dateBookings = Array.from(bookedDates.entries())
                      .filter(([key]) => key.startsWith(dateStr))
                      .map(([_, booking]) => booking)

                    const isBooked = dateBookings.length > 0
                    const isSelected = selectedDates.includes(dateStr)

                    // Calculate total price for all rooms on this date
                    const totalPrice = dateBookings.reduce((sum, booking) => sum + booking.price, 0)
                    const roomNumbers = dateBookings.map(b => b.roomNumber).join(', ')

                    return (
                      <div
                        key={dateStr}
                        onClick={() => toggleDateSelection(dateStr)}
                        className={`
                          flex flex-col items-center justify-center p-3 rounded-lg border-2 cursor-pointer
                          transition-all min-w-[80px]
                          ${isSelected
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
                        {isBooked && (
                          <>
                            <div className="text-xs text-muted-foreground">
                              {dateBookings[0].roomTypeName}
                              {dateBookings.length > 1 && ` (${dateBookings.length})`}
                            </div>
                            <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                              {formatCurrency(totalPrice)}
                            </div>
                            {dateBookings.length > 0 && (
                              <div className="text-xs text-muted-foreground truncate max-w-[80px]" title={roomNumbers}>
                                {roomNumbers}
                              </div>
                            )}
                          </>
                        )}
                        {!isBooked && (
                          <div className="text-xs text-muted-foreground">
                            Available
                          </div>
                        )}
                      </div>
                    )
                  })}
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

              {/* Totals */}
              <div className="border rounded-lg p-4 bg-muted/20">
                <h3 className="font-semibold mb-3">Recalculated Totals</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Number of Nights:</span>
                    <span className="font-medium">{totals.nights}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax ({totals.taxRate}% GST):</span>
                    <span className="font-medium">{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate}>
                  Update
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
