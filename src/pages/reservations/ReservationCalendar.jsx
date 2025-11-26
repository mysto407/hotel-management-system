// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useCallback, useRef } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Plus,
  User,
  MoreVertical,
  Edit2,
  Trash2,
  LogIn,
  LogOut,
  XCircle,
  Eye
} from 'lucide-react'
import { format, addDays, startOfDay, isSameDay, isWithinInterval, differenceInDays, isBefore, isAfter } from 'date-fns'
import { useReservations } from '../../context/ReservationContext'
import { useRooms } from '../../context/RoomContext'
import { useGuests } from '../../context/GuestContext'
import { useAgents } from '../../context/AgentContext'
import { useConfirm, useAlert } from '@/context/AlertContext'
import { QuickBookingModal } from '../../components/reservations/QuickBookingModal'
import { AddGuestModal } from '../../components/guests/AddGuestModal'
import { AddAgentModal } from '../../components/agents/AddAgentModal'
import { cn } from '@/lib/utils'

// shadcn components
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Status color mapping
const STATUS_COLORS = {
  'Inquiry': 'bg-purple-500 hover:bg-purple-600 border-purple-600',
  'Tentative': 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600',
  'Hold': 'bg-orange-500 hover:bg-orange-600 border-orange-600',
  'Confirmed': 'bg-blue-500 hover:bg-blue-600 border-blue-600',
  'Checked-in': 'bg-green-500 hover:bg-green-600 border-green-600',
  'Checked-out': 'bg-gray-400 hover:bg-gray-500 border-gray-500',
  'Cancelled': 'bg-red-400 hover:bg-red-500 border-red-500'
}

const STATUS_TEXT_COLORS = {
  'Inquiry': 'text-purple-600 dark:text-purple-400',
  'Tentative': 'text-yellow-600 dark:text-yellow-400',
  'Hold': 'text-orange-600 dark:text-orange-400',
  'Confirmed': 'text-blue-600 dark:text-blue-400',
  'Checked-in': 'text-green-600 dark:text-green-400',
  'Checked-out': 'text-gray-600 dark:text-gray-400',
  'Cancelled': 'text-red-600 dark:text-red-400'
}

export default function ReservationCalendar() {
  const { reservations, checkIn, checkOut, cancelReservation, deleteReservation, addReservation } = useReservations()
  const { rooms, roomTypes } = useRooms()
  const { guests, addGuest } = useGuests()
  const { agents, addAgent } = useAgents()
  const confirm = useConfirm()
  const { success: showSuccess, error: showError } = useAlert()

  // Calendar state
  const [startDate, setStartDate] = useState(startOfDay(new Date()))
  const [daysToShow, setDaysToShow] = useState(14)
  const [datePickerOpen, setDatePickerOpen] = useState(false)

  // Selection state for drag-select booking
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [selectedRoomId, setSelectedRoomId] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)

  // Modal states
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [guestModalOpen, setGuestModalOpen] = useState(false)
  const [agentModalOpen, setAgentModalOpen] = useState(false)
  const [bookingData, setBookingData] = useState({
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    guest_id: '',
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    status: 'Confirmed',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0,
    meal_plan: 'EP',
    special_requests: ''
  })

  // Calculate dates to display
  const dates = useMemo(() => {
    const dateArray = []
    for (let i = 0; i < daysToShow; i++) {
      dateArray.push(addDays(startDate, i))
    }
    return dateArray
  }, [startDate, daysToShow])

  // Group rooms by room type
  const roomsByType = useMemo(() => {
    const grouped = {}
    roomTypes.forEach(rt => {
      grouped[rt.id] = {
        roomType: rt,
        rooms: rooms.filter(r => r.room_type_id === rt.id).sort((a, b) =>
          a.room_number.localeCompare(b.room_number, undefined, { numeric: true })
        )
      }
    })
    return grouped
  }, [rooms, roomTypes])

  // Get reservations for a specific room
  const getReservationsForRoom = useCallback((roomId) => {
    return reservations.filter(r =>
      r.room_id === roomId &&
      r.status !== 'Cancelled'
    )
  }, [reservations])

  // Check if a cell has a reservation
  const getReservationForCell = useCallback((roomId, date) => {
    const roomReservations = getReservationsForRoom(roomId)
    return roomReservations.find(r => {
      const checkIn = startOfDay(new Date(r.check_in_date))
      const checkOut = startOfDay(new Date(r.check_out_date))
      const cellDate = startOfDay(date)
      return isWithinInterval(cellDate, { start: checkIn, end: addDays(checkOut, -1) })
    })
  }, [getReservationsForRoom])

  // Check if date is start of reservation
  const isReservationStart = useCallback((reservation, date) => {
    const checkIn = startOfDay(new Date(reservation.check_in_date))
    return isSameDay(checkIn, date)
  }, [])

  // Calculate reservation span (number of visible days)
  const getReservationSpan = useCallback((reservation, cellDate) => {
    const checkIn = startOfDay(new Date(reservation.check_in_date))
    const checkOut = startOfDay(new Date(reservation.check_out_date))
    const visibleStart = isBefore(checkIn, cellDate) ? cellDate : checkIn
    const lastVisibleDate = dates[dates.length - 1]
    const visibleEnd = isAfter(checkOut, addDays(lastVisibleDate, 1)) ? addDays(lastVisibleDate, 1) : checkOut
    return differenceInDays(visibleEnd, visibleStart)
  }, [dates])

  // Navigation handlers
  const goToPreviousWeek = () => setStartDate(prev => addDays(prev, -7))
  const goToNextWeek = () => setStartDate(prev => addDays(prev, 7))
  const goToToday = () => setStartDate(startOfDay(new Date()))

  // Selection handlers for creating new bookings
  const handleCellMouseDown = (roomId, date, reservation) => {
    if (reservation) return // Don't start selection on existing reservation

    setIsSelecting(true)
    setSelectedRoomId(roomId)
    setSelectionStart(date)
    setSelectionEnd(date)
  }

  const handleCellMouseEnter = (roomId, date) => {
    if (!isSelecting || roomId !== selectedRoomId) return
    setSelectionEnd(date)
  }

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd && selectedRoomId) {
      // Sort dates
      const sortedDates = [selectionStart, selectionEnd].sort((a, b) => a - b)
      const checkIn = sortedDates[0]
      const checkOut = addDays(sortedDates[1], 1) // Check-out is day after last selected

      // Check if range overlaps with existing reservation
      const roomReservations = getReservationsForRoom(selectedRoomId)
      const hasOverlap = roomReservations.some(r => {
        const resCheckIn = startOfDay(new Date(r.check_in_date))
        const resCheckOut = startOfDay(new Date(r.check_out_date))
        return (
          (checkIn < resCheckOut && checkOut > resCheckIn)
        )
      })

      if (!hasOverlap) {
        // Open booking modal with pre-filled dates
        setBookingData({
          ...bookingData,
          room_id: selectedRoomId,
          check_in_date: format(checkIn, 'yyyy-MM-dd'),
          check_out_date: format(checkOut, 'yyyy-MM-dd')
        })
        setBookingModalOpen(true)
      }
    }

    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
    setSelectedRoomId(null)
  }

  // Check if cell is in selection range
  const isCellSelected = useCallback((roomId, date) => {
    if (!isSelecting || !selectionStart || !selectionEnd || roomId !== selectedRoomId) return false
    const sortedDates = [selectionStart, selectionEnd].sort((a, b) => a - b)
    return isWithinInterval(date, { start: sortedDates[0], end: sortedDates[1] })
  }, [isSelecting, selectionStart, selectionEnd, selectedRoomId])

  // Handle single click on empty cell
  const handleEmptyCellClick = (roomId, date) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return

    setBookingData({
      ...bookingData,
      room_id: roomId,
      check_in_date: format(date, 'yyyy-MM-dd'),
      check_out_date: format(addDays(date, 1), 'yyyy-MM-dd')
    })
    setBookingModalOpen(true)
  }

  // Reservation action handlers
  const handleCheckIn = async (reservation) => {
    const confirmed = await confirm({
      variant: 'info',
      title: 'Check In',
      message: `Check in ${reservation.guests?.name}?`,
      confirmText: 'Check In'
    })
    if (confirmed) {
      await checkIn(reservation.id)
    }
  }

  const handleCheckOut = async (reservation) => {
    const confirmed = await confirm({
      variant: 'info',
      title: 'Check Out',
      message: `Check out ${reservation.guests?.name}?`,
      confirmText: 'Check Out'
    })
    if (confirmed) {
      await checkOut(reservation.id)
    }
  }

  const handleCancel = async (reservation) => {
    const confirmed = await confirm({
      variant: 'warning',
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this reservation?',
      confirmText: 'Cancel Reservation'
    })
    if (confirmed) {
      await cancelReservation(reservation.id)
    }
  }

  const handleDelete = async (reservation) => {
    const confirmed = await confirm({
      variant: 'danger',
      title: 'Delete Reservation',
      message: 'Are you sure you want to permanently delete this reservation? This cannot be undone.',
      confirmText: 'Delete Permanently'
    })
    if (confirmed) {
      await deleteReservation(reservation.id)
    }
  }

  const handleViewDetails = (reservation) => {
    sessionStorage.setItem('reservationDetailsIds', JSON.stringify([reservation.id]))
    window.location.hash = 'reservation-details'
  }

  // Quick booking submit
  const handleQuickBookingSubmit = async () => {
    try {
      const room = rooms.find(r => r.id === bookingData.room_id)
      const roomType = roomTypes.find(rt => rt.id === room?.room_type_id)

      const nights = differenceInDays(
        new Date(bookingData.check_out_date),
        new Date(bookingData.check_in_date)
      )
      const totalAmount = (roomType?.base_price || 0) * nights

      const reservationData = {
        ...bookingData,
        number_of_guests: parseInt(bookingData.number_of_adults) + parseInt(bookingData.number_of_children) + parseInt(bookingData.number_of_infants),
        total_amount: totalAmount,
        advance_payment: 0,
        payment_status: 'Pending'
      }

      await addReservation(reservationData)
      showSuccess('Reservation created successfully!')
      setBookingModalOpen(false)

      // Reset booking data
      setBookingData({
        room_id: '',
        check_in_date: '',
        check_out_date: '',
        guest_id: '',
        booking_source: 'direct',
        agent_id: '',
        direct_source: '',
        status: 'Confirmed',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'EP',
        special_requests: ''
      })
    } catch (error) {
      showError('Failed to create reservation: ' + error.message)
    }
  }

  // Guest added handler
  const handleGuestAdded = (newGuest) => {
    setBookingData({ ...bookingData, guest_id: newGuest.id })
    setGuestModalOpen(false)
  }

  // Agent added handler
  const handleAgentAdded = (newAgent) => {
    setBookingData({ ...bookingData, agent_id: newAgent.id })
    setAgentModalOpen(false)
  }

  // Check if date is today
  const isToday = (date) => isSameDay(date, new Date())

  // Check if date is weekend
  const isWeekend = (date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  // Refs for tracking drag
  const calendarRef = useRef(null)

  return (
    <TooltipProvider>
      <div
        className="flex flex-col h-screen bg-background"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Header */}
        <div className="flex-none border-b bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Reservation Calendar</h1>

              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="min-w-[200px]">
                      <CalendarDays className="h-4 w-4 mr-2" />
                      {format(startDate, 'MMM d, yyyy')} - {format(addDays(startDate, daysToShow - 1), 'MMM d, yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        if (date) {
                          setStartDate(startOfDay(date))
                          setDatePickerOpen(false)
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Button variant="outline" size="icon" onClick={goToNextWeek}>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                <Button variant="outline" onClick={goToToday}>
                  Today
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* Days to show selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">View:</span>
                <Select value={daysToShow.toString()} onValueChange={(v) => setDaysToShow(parseInt(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="14">14 Days</SelectItem>
                    <SelectItem value="21">21 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-500" />
                  <span>Confirmed</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-500" />
                  <span>Checked-in</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-orange-500" />
                  <span>Hold</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-yellow-500" />
                  <span>Tentative</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto" ref={calendarRef}>
          <div className="min-w-max">
            {/* Date Headers */}
            <div className="flex sticky top-0 z-20 bg-card border-b">
              {/* Room column header */}
              <div className="w-40 flex-none border-r bg-card px-3 py-2 font-medium sticky left-0 z-30">
                Room
              </div>

              {/* Date columns */}
              {dates.map((date, index) => (
                <div
                  key={index}
                  className={cn(
                    "w-24 flex-none border-r px-2 py-2 text-center",
                    isToday(date) && "bg-blue-50 dark:bg-blue-950",
                    isWeekend(date) && !isToday(date) && "bg-gray-50 dark:bg-gray-900"
                  )}
                >
                  <div className="text-xs text-muted-foreground">{format(date, 'EEE')}</div>
                  <div className={cn(
                    "text-sm font-medium",
                    isToday(date) && "text-blue-600 dark:text-blue-400"
                  )}>
                    {format(date, 'd MMM')}
                  </div>
                </div>
              ))}
            </div>

            {/* Room Rows grouped by Room Type */}
            {Object.entries(roomsByType).map(([typeId, { roomType, rooms: typeRooms }]) => (
              <div key={typeId}>
                {/* Room Type Header */}
                <div className="flex bg-muted/50 border-b sticky left-0">
                  <div className="w-40 flex-none border-r px-3 py-2 font-semibold text-sm bg-muted/50 sticky left-0 z-10">
                    {roomType.name}
                    <span className="text-xs font-normal text-muted-foreground ml-2">
                      ({typeRooms.length} rooms)
                    </span>
                  </div>
                  <div className="flex-1" style={{ width: `${daysToShow * 96}px` }} />
                </div>

                {/* Room Rows */}
                {typeRooms.map(room => (
                  <div key={room.id} className="flex border-b hover:bg-muted/20">
                    {/* Room Number */}
                    <div className="w-40 flex-none border-r px-3 py-3 bg-card sticky left-0 z-10">
                      <div className="font-medium text-sm">{room.room_number}</div>
                      <div className="text-xs text-muted-foreground">
                        Floor {room.floor || '-'}
                      </div>
                    </div>

                    {/* Date Cells */}
                    <div className="flex relative">
                      {dates.map((date, dateIndex) => {
                        const reservation = getReservationForCell(room.id, date)
                        const isStart = reservation && isReservationStart(reservation, date)
                        const span = reservation && isStart ? getReservationSpan(reservation, date) : 0
                        const isSelected = isCellSelected(room.id, date)

                        // Check if reservation starts before visible range
                        const startsBeforeRange = reservation && !isStart && dateIndex === 0 &&
                          isBefore(new Date(reservation.check_in_date), dates[0])

                        return (
                          <div
                            key={dateIndex}
                            className={cn(
                              "w-24 h-14 flex-none border-r relative cursor-pointer transition-colors",
                              isToday(date) && "bg-blue-50/50 dark:bg-blue-950/30",
                              isWeekend(date) && !isToday(date) && "bg-gray-50/50 dark:bg-gray-900/30",
                              isSelected && "bg-blue-100 dark:bg-blue-900/50",
                              !reservation && "hover:bg-muted/50"
                            )}
                            onMouseDown={() => handleCellMouseDown(room.id, date, reservation)}
                            onMouseEnter={() => handleCellMouseEnter(room.id, date)}
                            onClick={() => !reservation && !isSelecting && handleEmptyCellClick(room.id, date)}
                          >
                            {/* Reservation Bar */}
                            {(isStart || startsBeforeRange) && reservation && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "absolute top-1 left-0.5 h-12 rounded-md text-white text-xs font-medium flex items-center px-2 cursor-pointer transition-all shadow-sm border-l-4",
                                      STATUS_COLORS[reservation.status] || 'bg-gray-500',
                                      startsBeforeRange && "rounded-l-none border-l-0"
                                    )}
                                    style={{
                                      width: `calc(${span * 96 - 4}px)`,
                                      zIndex: 5
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleViewDetails(reservation)
                                    }}
                                  >
                                    <div className="flex items-center gap-1 truncate">
                                      <User className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {reservation.guests?.name || 'Guest'}
                                      </span>
                                    </div>

                                    {/* Action Menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          className="ml-auto p-1 hover:bg-white/20 rounded"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical className="h-3 w-3" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel>
                                          {reservation.guests?.name || 'Reservation'}
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem onClick={() => handleViewDetails(reservation)}>
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>

                                        {(reservation.status === 'Confirmed' || reservation.status === 'Hold') && (
                                          <DropdownMenuItem onClick={() => handleCheckIn(reservation)}>
                                            <LogIn className="h-4 w-4 mr-2" />
                                            Check In
                                          </DropdownMenuItem>
                                        )}

                                        {reservation.status === 'Checked-in' && (
                                          <DropdownMenuItem onClick={() => handleCheckOut(reservation)}>
                                            <LogOut className="h-4 w-4 mr-2" />
                                            Check Out
                                          </DropdownMenuItem>
                                        )}

                                        {reservation.status !== 'Cancelled' && reservation.status !== 'Checked-out' && (
                                          <DropdownMenuItem
                                            onClick={() => handleCancel(reservation)}
                                            className="text-orange-600"
                                          >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Cancel
                                          </DropdownMenuItem>
                                        )}

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem
                                          onClick={() => handleDelete(reservation)}
                                          className="text-red-600"
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <div className="space-y-1">
                                    <div className="font-semibold">{reservation.guests?.name || 'Guest'}</div>
                                    <div className="text-xs">
                                      {format(new Date(reservation.check_in_date), 'MMM d')} - {format(new Date(reservation.check_out_date), 'MMM d, yyyy')}
                                    </div>
                                    <div className={cn("text-xs font-medium", STATUS_TEXT_COLORS[reservation.status])}>
                                      {reservation.status}
                                    </div>
                                    {reservation.guests?.phone && (
                                      <div className="text-xs text-muted-foreground">
                                        {reservation.guests.phone}
                                      </div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            )}

                            {/* Empty cell indicator */}
                            {!reservation && (
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <Plus className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Quick Booking Modal */}
        <QuickBookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          onSubmit={handleQuickBookingSubmit}
          bookingData={bookingData}
          setBookingData={setBookingData}
          guests={guests}
          rooms={rooms}
          roomTypes={roomTypes}
          agents={agents}
          onAddGuestClick={() => setGuestModalOpen(true)}
          onAddAgentClick={() => setAgentModalOpen(true)}
        />

        {/* Add Guest Modal */}
        <AddGuestModal
          isOpen={guestModalOpen}
          onClose={() => setGuestModalOpen(false)}
          onGuestAdded={handleGuestAdded}
        />

        {/* Add Agent Modal */}
        <AddAgentModal
          isOpen={agentModalOpen}
          onClose={() => setAgentModalOpen(false)}
          onAgentAdded={handleAgentAdded}
        />
      </div>
    </TooltipProvider>
  )
}
