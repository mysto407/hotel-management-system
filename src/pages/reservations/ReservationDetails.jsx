import { useState, useEffect, useMemo } from 'react'
import { CalendarPlus, Calendar, Users, MoreVertical, Trash2, ArrowRight, Plus } from 'lucide-react'
import { useReservations } from '../../context/ReservationContext'
import { useRooms } from '../../context/RoomContext'
import { useGuests } from '../../context/GuestContext'
import { useAgents } from '../../context/AgentContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { getActiveReservationNotes, getTotalTaxRate, getFoliosByReservation, getFolioBalance } from '../../lib/supabase'
import { groupConsecutiveReservations, formatRoomChangeSequence } from '../../utils/bookingUtils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu'
import NotesTab from '../../components/reservations/NotesTab'
import ExtendNightsModal from '../../components/reservations/ExtendNightsModal'
import MealPlanEditModal from '../../components/reservations/MealPlanEditModal'
import GuestDetailsTab from '../../components/reservations/GuestDetailsTab'
import FolioTab from '../../components/reservations/FolioTab'

export default function ReservationDetails({ onNavigate }) {
  const { reservations, updateReservation } = useReservations()
  const { rooms, roomTypes } = useRooms()
  const { guests } = useGuests()
  const { agents } = useAgents()
  const { getMealPlanName, calculateMealPlanCost } = useMealPlans()
  const { setAddToExistingBooking } = useReservationFlow()

  const [groupedReservations, setGroupedReservations] = useState([])
  const [primaryReservation, setPrimaryReservation] = useState(null)
  const [guestInfo, setGuestInfo] = useState(null)
  const [additionalGuestsInfo, setAdditionalGuestsInfo] = useState([])
  const [agentInfo, setAgentInfo] = useState(null)
  const [notesCount, setNotesCount] = useState(0)
  const [extendNightsModalOpen, setExtendNightsModalOpen] = useState(false)
  const [selectedReservationForExtend, setSelectedReservationForExtend] = useState(null)
  const [mealPlanModalOpen, setMealPlanModalOpen] = useState(false)
  const [selectedReservationForMealPlan, setSelectedReservationForMealPlan] = useState(null)
  const [folioTotals, setFolioTotals] = useState({
    totalCharges: null,
    totalPayments: null,
    balance: null
  })
  const [roomTaxRate, setRoomTaxRate] = useState(0)

  // Load reservation details when component mounts
  useEffect(() => {
    // Read reservation IDs from sessionStorage
    const storedIds = sessionStorage.getItem('reservationDetailsIds')

    if (storedIds) {
      try {
        const reservationIds = JSON.parse(storedIds)

        if (reservationIds && reservationIds.length > 0) {
          const reservationGroup = reservations.filter(r => reservationIds.includes(r.id))

          if (reservationGroup.length > 0) {
            setGroupedReservations(reservationGroup)
            setPrimaryReservation(reservationGroup[0])

            // Load primary guest info
            const guest = guests.find(g => g.id === reservationGroup[0].guest_id)
            setGuestInfo(guest)

            // Load additional guests if they exist
            const additionalGuestIds = reservationGroup[0].additional_guest_ids || []
            if (additionalGuestIds && additionalGuestIds.length > 0) {
              const additionalGuests = additionalGuestIds
                .map(guestId => guests.find(g => g.id === guestId))
                .filter(Boolean) // Remove any null/undefined entries
              setAdditionalGuestsInfo(additionalGuests)
            } else {
              setAdditionalGuestsInfo([])
            }

            // Load agent info if applicable
            if (reservationGroup[0].agent_id) {
              const agent = agents.find(a => a.id === reservationGroup[0].agent_id)
              setAgentInfo(agent)
            }

            // Load notes count
            loadNotesCount(reservationGroup[0].id)
          }
        }

        // Clean up sessionStorage after reading
        // sessionStorage.removeItem('reservationDetailsIds')
      } catch (error) {
        console.error('Error parsing reservation IDs from sessionStorage:', error)
      }
    }
  }, [reservations, guests, agents])

  const loadNotesCount = async (reservationId) => {
    try {
      const { data, error } = await getActiveReservationNotes(reservationId)
      if (!error && data) {
        setNotesCount(data.length)
      }
    } catch (error) {
      console.error('Error loading notes count:', error)
    }
  }

  // Fetch tax rate for room charges
  useEffect(() => {
    const fetchTaxRate = async () => {
      try {
        const { rate } = await getTotalTaxRate('room_charge')
        setRoomTaxRate(rate)
      } catch (error) {
        console.error('Error fetching tax rate:', error)
      }
    }
    fetchTaxRate()
  }, [])

  // Fetch real-time folio totals for all reservations in the group
  const fetchFolioTotals = async () => {
    if (!groupedReservations.length) return

    try {
      let totalCharges = 0
      let totalPayments = 0
      const seenFolioIds = new Set()

      // Get folios for each reservation and sum their totals (deduplicating shared folios)
      const bookingId = groupedReservations[0]?.booking_id
      for (const reservation of groupedReservations) {
        const { data: folios, error: folioError } = await getFoliosByReservation(reservation.id, bookingId)
        if (folioError) {
          console.error('Error fetching folios:', folioError)
          continue
        }
        for (const folio of (folios || [])) {
          // Skip if we've already counted this folio (shared folios for multi-room bookings)
          if (seenFolioIds.has(folio.id)) continue
          seenFolioIds.add(folio.id)

          const { data: balanceData, error: balanceError } = await getFolioBalance(folio.id)
          if (balanceError) {
            console.error('Error fetching folio balance:', balanceError)
            continue
          }
          if (balanceData) {
            totalCharges += balanceData.charges || 0
            totalPayments += balanceData.payments || 0
          }
        }
      }
      setFolioTotals({
        totalCharges,
        totalPayments,
        balance: totalCharges - totalPayments
      })
    } catch (error) {
      console.error('Error fetching folio totals:', error)
    }
  }

  useEffect(() => {
    fetchFolioTotals()
  }, [groupedReservations])

  // Helper function to get room info (must be before useMemo)
  const getRoomInfo = (roomId, roomTypeId = null) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) {
      // Room not assigned yet - look up room type directly
      const roomType = roomTypes.find(rt => rt.id === roomTypeId)
      return {
        number: 'Unassigned',
        type: roomType?.name || 'Unknown',
        room: null
      }
    }
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id)
    return {
      number: room.room_number,
      type: roomType?.name || 'Unknown',
      room: room
    }
  }

  // Group consecutive reservations for better display (must be before early returns)
  const stays = useMemo(() =>
    groupConsecutiveReservations(groupedReservations, getRoomInfo),
    [groupedReservations, rooms, roomTypes]
  )

  if (!primaryReservation || !guestInfo) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Loading reservation details...</p>
          <Button onClick={() => onNavigate('reservations')} variant="outline">
            Back to Reservations
          </Button>
        </div>
      </div>
    )
  }

  // Calculate totals
  const totalAmount = groupedReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0)
  const totalPaid = groupedReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0)
  const balanceDue = totalAmount - totalPaid

  // Calculate nights
  const checkIn = new Date(primaryReservation.check_in_date)
  const checkOut = new Date(primaryReservation.check_out_date)
  const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

  // Calculate total guests
  const totalGuests = groupedReservations.reduce((sum, r) =>
    sum + (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0), 0
  )

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Inquiry': return 'purple'
      case 'Tentative': return 'warning'
      case 'Hold': return 'orange'
      case 'Confirmed': return 'info'
      case 'Checked-in': return 'default'
      case 'Checked-out': return 'success'
      case 'Cancelled': return 'destructive'
      default: return 'default'
    }
  }

  const handleStatusChange = async (newStatus) => {
    try {
      // Update all reservations in the group
      for (const reservation of groupedReservations) {
        await updateReservation(reservation.id, { status: newStatus })
      }
    } catch (error) {
      console.error('Error updating reservation status:', error)
    }
  }

  const handleExtendNights = (reservation) => {
    setSelectedReservationForExtend(reservation)
    setExtendNightsModalOpen(true)
  }

  // Handle adding a new room to the existing booking
  const handleAddRoom = () => {
    // Set context to indicate we're adding to an existing booking
    setAddToExistingBooking({
      bookingId: primaryReservation.booking_id,
      guestId: primaryReservation.guest_id,
      guestName: guestInfo?.name,
      agentId: primaryReservation.agent_id,
      bookingSource: primaryReservation.booking_source,
      reservationIds: groupedReservations.map(r => r.id)
    })
    // Navigate to new reservation page
    onNavigate('new-reservation')
  }

  const handleEditMealPlan = (reservation) => {
    setSelectedReservationForMealPlan(reservation)
    setMealPlanModalOpen(true)
  }

  const handleSaveMealPlan = async (reservationId, mealPlan) => {
    try {
      // Find the reservation being updated
      const reservation = groupedReservations.find(r => r.id === reservationId)
      if (!reservation) return

      // Calculate nights
      const checkIn = new Date(reservation.check_in_date)
      const checkOut = new Date(reservation.check_out_date)
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

      // Calculate total guests
      const totalGuests = (reservation.number_of_adults || 0) +
                         (reservation.number_of_children || 0) +
                         (reservation.number_of_infants || 0)

      // Get room rate (use rate type price if available, otherwise room type base price)
      const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)
      const roomRate = reservation.room_rate_types?.base_price || roomInfo.room?.room_types?.base_price || 0

      // Calculate room cost
      const roomCost = roomRate * nights

      // Calculate meal plan cost
      const mealPlanCost = mealPlan ? calculateMealPlanCost(mealPlan, totalGuests, nights) : 0

      // Calculate subtotal and total with dynamic tax rate from tax_configurations
      const subtotal = roomCost + mealPlanCost
      const { rate: taxRate } = await getTotalTaxRate('room_charge')
      const tax = subtotal * (taxRate / 100)
      const totalAmount = subtotal + tax

      // Update reservation with new meal plan and total amount
      await updateReservation(reservationId, {
        meal_plan: mealPlan,
        total_amount: totalAmount
      })
    } catch (error) {
      console.error('Error updating meal plan:', error)
      alert('Failed to update meal plan: ' + error.message)
    }
  }

  // Handle successful extend nights - refresh folio totals
  const handleExtendNightsSuccess = () => {
    fetchFolioTotals()
  }

  return (
    <div className="w-full">
      <div className="max-w-[85rem] mx-auto py-6 space-y-6">
        {/* Header Card */}
        <Card>
        <CardContent className="py-4 space-y-3">
          {/* Row 1: Name, Res ID, and Status */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold">{guestInfo.name}</h1>
              <p className="text-xs text-muted-foreground">
                Reservation ID: {primaryReservation.id.substring(0, 13)}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="cursor-pointer hover:opacity-80">
                  <Badge variant={getStatusBadgeVariant(primaryReservation.status)} className="text-base px-3 py-1">
                    {primaryReservation.status}
                  </Badge>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => handleStatusChange('Inquiry')}>Inquiry</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Tentative')}>Tentative</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Hold')}>Hold</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Confirmed')}>Confirmed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Checked-in')}>Checked-in</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Checked-out')}>Checked-out</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('Cancelled')}>Cancelled</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Row 2: Quick Info */}
          <div className="flex items-start gap-10">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Check-In</p>
              <p className="font-medium text-sm">{new Date(primaryReservation.check_in_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Check-Out</p>
              <p className="font-medium text-sm">{new Date(primaryReservation.check_out_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nights</p>
              <p className="font-medium text-sm">{nights}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Res Date</p>
              <p className="font-medium text-sm">
                {new Date(primaryReservation.created_at || primaryReservation.check_in_date).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Guests</p>
              <p className="font-medium text-sm">{totalGuests}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Source</p>
              <p className="font-medium text-sm capitalize">
                {primaryReservation.booking_source === 'agent' && agentInfo
                  ? agentInfo.name
                  : primaryReservation.booking_source === 'walk-in'
                  ? 'Walk-in'
                  : primaryReservation.booking_source === 'phone'
                  ? 'Phone'
                  : primaryReservation.booking_source === 'email'
                  ? 'Email'
                  : primaryReservation.booking_source === 'website'
                  ? 'Website'
                  : primaryReservation.direct_source || primaryReservation.booking_source || 'Walk-in'}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
              <p className={`font-bold text-lg ${(folioTotals.balance ?? balanceDue) > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                ₹{(folioTotals.balance ?? balanceDue).toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="accommodations" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
          <TabsTrigger value="folio">Folio</TabsTrigger>
          <TabsTrigger value="guest-details">Guest Details</TabsTrigger>
          <TabsTrigger value="notes">Notes ({notesCount})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="accommodations" className="space-y-4">
          {/* Add Room Button */}
          <div className="flex justify-end">
            <Button onClick={handleAddRoom} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Room
            </Button>
          </div>

          {/* Accommodations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RES ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Arrival/Departure</TableHead>
                    <TableHead className="text-center">Guests</TableHead>
                    <TableHead className="text-center">Meal Plan</TableHead>
                    <TableHead className="text-center">Nights</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stays.map((stay, stayIndex) => {
                    const isConsecutive = stay.isConsecutive
                    const stayRooms = stay.rooms // These are the normalized reservations

                    return (
                      <>
                        {/* Show stay header if multiple stays or if it's a consecutive stay */}
                        {(stays.length > 1 || isConsecutive) && (
                          <TableRow key={`stay-header-${stayIndex}`} className="bg-muted/30">
                            <TableCell colSpan={10} className="py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  {isConsecutive ? 'Continuous Stay' : `Stay ${stayIndex + 1}`}
                                </span>
                                {isConsecutive && (
                                  <div className="flex items-center gap-1.5 text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1">
                                    <ArrowRight className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                    <span className="text-amber-800 dark:text-amber-300">
                                      Room Move: {formatRoomChangeSequence(stayRooms)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Render each reservation in the stay */}
                        {stayRooms.map((reservation) => {
                          const roomInfo = getRoomInfo(reservation.room_id, reservation.room_type_id)
                          const guestCount = (reservation.number_of_adults || 0) +
                                           (reservation.number_of_children || 0) +
                                           (reservation.number_of_infants || 0)

                          // Get the room rate - use rate type price if available, otherwise fall back to room type base price
                          const roomRate = reservation.room_rate_types?.base_price || roomInfo.room?.room_types?.base_price || 0

                          // Calculate nights for this specific reservation
                          const resCheckIn = new Date(reservation.check_in_date)
                          const resCheckOut = new Date(reservation.check_out_date)
                          const resNights = Math.ceil((resCheckOut - resCheckIn) / (1000 * 60 * 60 * 24))

                          // Calculate room-only total (excluding meal plan)
                          const roomCost = roomRate * resNights
                          const roomTax = roomCost * (roomTaxRate / 100)
                          const roomOnlyTotal = roomCost + roomTax

                          return (
                            <TableRow key={reservation.id}>
                        <TableCell className="font-mono text-xs">
                          {reservation.id.substring(0, 13)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{roomInfo.type}</div>
                          {reservation.room_rate_types?.rate_name && (
                            <div className="text-xs text-muted-foreground">
                              {reservation.room_rate_types.rate_name} - ₹{roomRate.toFixed(2)}/night
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">Room {roomInfo.number}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(reservation.check_in_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                          {' - '}
                          {new Date(reservation.check_out_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>{guestCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => handleEditMealPlan(reservation)}
                            className="text-sm underline decoration-dotted hover:text-primary cursor-pointer"
                          >
                            {getMealPlanName(reservation.meal_plan) || 'N/A'}
                          </button>
                        </TableCell>
                        <TableCell className="text-center">{resNights}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{roomOnlyTotal.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleExtendNights(reservation)}>
                                <CalendarPlus className="h-4 w-4 mr-2" />
                                Extend Nights
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                View on Calendar
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Accommodation
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                          )
                        })}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="folio">
          <FolioTab
            reservationIds={groupedReservations.map(r => r.id)}
            primaryReservation={primaryReservation}
            groupedReservations={groupedReservations}
            guests={guests}
            onFolioChange={fetchFolioTotals}
          />
        </TabsContent>

        <TabsContent value="guest-details">
          <GuestDetailsTab
            groupedReservations={groupedReservations}
            guests={guests}
            getRoomInfo={getRoomInfo}
          />
        </TabsContent>

        <TabsContent value="notes">
          <NotesTab reservationId={primaryReservation.id} />
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Reservation Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Reservation Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(primaryReservation.created_at || primaryReservation.check_in_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                <Badge variant={getStatusBadgeVariant(primaryReservation.status)}>
                  {primaryReservation.status}
                </Badge>
                <div>
                  <p className="font-medium">Current Status</p>
                  <p className="text-sm text-muted-foreground">
                    {groupedReservations.length} room{groupedReservations.length > 1 ? 's' : ''} booked
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Extend Nights Modal */}
      <ExtendNightsModal
        open={extendNightsModalOpen}
        onOpenChange={setExtendNightsModalOpen}
        reservation={selectedReservationForExtend}
        onSuccess={handleExtendNightsSuccess}
      />

      {/* Meal Plan Edit Modal */}
      <MealPlanEditModal
        open={mealPlanModalOpen}
        onOpenChange={setMealPlanModalOpen}
        reservation={selectedReservationForMealPlan}
        onSave={handleSaveMealPlan}
      />
    </div>
  )
}
