import { useState, useEffect } from 'react'
import { ChevronLeft, Edit, Calendar, User, Users, DollarSign, Home, MapPin, Phone, Mail, Building } from 'lucide-react'
import { useReservations } from '../../context/ReservationContext'
import { useRooms } from '../../context/RoomContext'
import { useGuests } from '../../context/GuestContext'
import { useAgents } from '../../context/AgentContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'
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

export default function ReservationDetails({ onNavigate }) {
  const { reservations, updateReservation } = useReservations()
  const { rooms, roomTypes } = useRooms()
  const { guests } = useGuests()
  const { agents } = useAgents()
  const { getMealPlanName } = useMealPlans()

  const [groupedReservations, setGroupedReservations] = useState([])
  const [primaryReservation, setPrimaryReservation] = useState(null)
  const [guestInfo, setGuestInfo] = useState(null)
  const [agentInfo, setAgentInfo] = useState(null)

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

            // Load guest info
            const guest = guests.find(g => g.id === reservationGroup[0].guest_id)
            setGuestInfo(guest)

            // Load agent info if applicable
            if (reservationGroup[0].agent_id) {
              const agent = agents.find(a => a.id === reservationGroup[0].agent_id)
              setAgentInfo(agent)
            }
          }
        }

        // Clean up sessionStorage after reading
        // sessionStorage.removeItem('reservationDetailsIds')
      } catch (error) {
        console.error('Error parsing reservation IDs from sessionStorage:', error)
      }
    }
  }, [reservations, guests, agents])

  if (!primaryReservation || !guestInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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

  const getRoomInfo = (roomId) => {
    const room = rooms.find(r => r.id === roomId)
    if (!room) return { number: 'N/A', type: 'Unknown' }
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id)
    return {
      number: room.room_number,
      type: roomType?.name || 'Unknown',
      room: room
    }
  }

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

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => onNavigate('reservations')}
              variant="ghost"
              size="icon"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{guestInfo.name}</h1>
              <p className="text-sm text-gray-500">
                Reservation ID: {primaryReservation.id.substring(0, 13)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Status Dropdown */}
            <Select
              value={primaryReservation.status}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Inquiry">Inquiry</SelectItem>
                <SelectItem value="Tentative">Tentative</SelectItem>
                <SelectItem value="Hold">Hold</SelectItem>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Checked-in">Checked-in</SelectItem>
                <SelectItem value="Checked-out">Checked-out</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            {/* Actions Button */}
            <Button variant="default">
              ACTIONS
            </Button>
          </div>
        </div>

        {/* Quick Info Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs mb-1">Check-In</p>
            <p className="font-medium">{new Date(primaryReservation.check_in_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Check-Out</p>
            <p className="font-medium">{new Date(primaryReservation.check_out_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Nights</p>
            <p className="font-medium">{nights}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Reservation Date</p>
            <p className="font-medium">
              {new Date(primaryReservation.created_at || primaryReservation.check_in_date).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Guests</p>
            <p className="font-medium">{totalGuests}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Source</p>
            <p className="font-medium capitalize">
              {primaryReservation.booking_source === 'agent' && agentInfo
                ? agentInfo.name
                : primaryReservation.direct_source || primaryReservation.booking_source || 'Walk-in'}
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Rate Plan(s)</p>
            <p className="font-medium">{getMealPlanName(primaryReservation.meal_plan) || 'Base Rate'}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs mb-1">Balance Due</p>
            <p className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{balanceDue.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="flex-1 bg-white">
        <Tabs defaultValue="accommodations" className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-12 px-6">
            <TabsTrigger value="accommodations" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Accommodations
            </TabsTrigger>
            <TabsTrigger value="folio" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Folio
            </TabsTrigger>
            <TabsTrigger value="guest-details" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Guest Details
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Notes ({primaryReservation.special_requests ? '1' : '0'})
            </TabsTrigger>
            <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
              Reservation Activity
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accommodations" className="p-6">
            <div className="mb-4">
              <Button variant="default" className="bg-teal-500 hover:bg-teal-600">
                <Edit className="h-4 w-4 mr-2" />
                EDIT RESERVATION
              </Button>
            </div>

            {/* Accommodations Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-100">
                    <TableHead className="font-semibold">RES ID</TableHead>
                    <TableHead className="font-semibold">TYPE</TableHead>
                    <TableHead className="font-semibold">ASSIGNMENT</TableHead>
                    <TableHead className="font-semibold">GUEST</TableHead>
                    <TableHead className="font-semibold">ARRIVAL/DEPARTURE</TableHead>
                    <TableHead className="font-semibold text-center">GUESTS</TableHead>
                    <TableHead className="font-semibold text-center">NIGHTS</TableHead>
                    <TableHead className="font-semibold text-right">TOTAL</TableHead>
                    <TableHead className="font-semibold text-center">OCCUPIED</TableHead>
                    <TableHead className="font-semibold text-center">EDIT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupedReservations.map((reservation) => {
                    const roomInfo = getRoomInfo(reservation.room_id)
                    const guestCount = (reservation.number_of_adults || 0) +
                                     (reservation.number_of_children || 0) +
                                     (reservation.number_of_infants || 0)

                    return (
                      <TableRow key={reservation.id}>
                        <TableCell className="font-mono text-xs">
                          {reservation.id.substring(0, 13)}
                        </TableCell>
                        <TableCell className="font-medium">{roomInfo.type}</TableCell>
                        <TableCell>
                          <Badge variant="outline">Room {roomInfo.number}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span>{guestInfo.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(reservation.check_in_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                          {' - '}
                          {new Date(reservation.check_out_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            <span>{guestCount}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{nights}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{reservation.total_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={reservation.status === 'Checked-in' ? 'success' : 'secondary'}>
                            {reservation.status === 'Checked-in' ? '✓' : '✗'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="folio" className="p-6">
            <div className="text-center py-12 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p className="text-lg font-medium">Folio Information</p>
              <p className="text-sm mt-2">Billing and payment details will appear here</p>
            </div>
          </TabsContent>

          <TabsContent value="guest-details" className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{guestInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{guestInfo.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{guestInfo.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID Proof:</span>
                    <span className="font-medium">
                      {guestInfo.id_proof_type && guestInfo.id_proof_type !== 'N/A'
                        ? `${guestInfo.id_proof_type} - ${guestInfo.id_proof_number}`
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium">{guestInfo.address || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">City:</span>
                    <span className="font-medium">{guestInfo.city || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">State:</span>
                    <span className="font-medium">{guestInfo.state || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Country:</span>
                    <span className="font-medium">{guestInfo.country || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="p-6">
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Special Requests</h3>
              {primaryReservation.special_requests ? (
                <p className="text-gray-700">{primaryReservation.special_requests}</p>
              ) : (
                <p className="text-gray-500 italic">No special requests</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="p-6">
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">Reservation Created</p>
                  <p className="text-sm text-gray-600">
                    {new Date(primaryReservation.created_at || primaryReservation.check_in_date).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                <Badge variant={getStatusBadgeVariant(primaryReservation.status)}>
                  {primaryReservation.status}
                </Badge>
                <div>
                  <p className="font-medium">Current Status</p>
                  <p className="text-sm text-gray-600">
                    {groupedReservations.length} room{groupedReservations.length > 1 ? 's' : ''} booked
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
