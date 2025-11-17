import { useState, useEffect } from 'react'
import { ChevronLeft, Edit, Calendar, User, Users, DollarSign, Home, MapPin, Phone, Mail, Building } from 'lucide-react'
import { useReservations } from '../../context/ReservationContext'
import { useRooms } from '../../context/RoomContext'
import { useGuests } from '../../context/GuestContext'
import { useAgents } from '../../context/AgentContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card'
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
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Card */}
        <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
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
                <p className="text-sm text-muted-foreground">
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
            </div>
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 pb-4 border-b">
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
              <p className="text-xs text-muted-foreground mb-1">Reservation Date</p>
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
                  : primaryReservation.direct_source || primaryReservation.booking_source || 'Walk-in'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Rate Plan</p>
              <p className="font-medium text-sm">{getMealPlanName(primaryReservation.meal_plan) || 'Base Rate'}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
              <p className={`font-bold text-lg ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{balanceDue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <Badge variant={getStatusBadgeVariant(primaryReservation.status)} className="text-sm">
              {primaryReservation.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="accommodations" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="accommodations">Accommodations</TabsTrigger>
          <TabsTrigger value="folio">Folio</TabsTrigger>
          <TabsTrigger value="guest-details">Guest Details</TabsTrigger>
          <TabsTrigger value="notes">Notes ({primaryReservation.special_requests ? '1' : '0'})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="accommodations" className="space-y-4">
          {/* Accommodations Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>RES ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Arrival/Departure</TableHead>
                    <TableHead className="text-center">Guests</TableHead>
                    <TableHead className="text-center">Nights</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-center">Edit</TableHead>
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
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{guestInfo.name}</span>
                          </div>
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
                        <TableCell className="text-center">{nights}</TableCell>
                        <TableCell className="text-right font-semibold">
                          ₹{reservation.total_amount?.toFixed(2) || '0.00'}
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
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <DollarSign className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="text-xl font-bold">₹{totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-xl font-bold text-green-600">₹{totalPaid.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <DollarSign className="h-8 w-8 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Balance Due</p>
                    <p className={`text-xl font-bold ${balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{balanceDue.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="folio">
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg font-medium">Folio Information</p>
                <p className="text-sm mt-2">Billing and payment details will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="guest-details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{guestInfo.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-medium">{guestInfo.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{guestInfo.phone || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">ID Proof:</span>
                  <span className="font-medium">
                    {guestInfo.id_proof_type && guestInfo.id_proof_type !== 'N/A'
                      ? `${guestInfo.id_proof_type} - ${guestInfo.id_proof_number}`
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">Address:</span>
                  <span className="font-medium">{guestInfo.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">City:</span>
                  <span className="font-medium">{guestInfo.city || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-muted-foreground">State:</span>
                  <span className="font-medium">{guestInfo.state || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">Country:</span>
                  <span className="font-medium">{guestInfo.country || 'N/A'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>Special Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {primaryReservation.special_requests ? (
                <p className="text-gray-700">{primaryReservation.special_requests}</p>
              ) : (
                <p className="text-muted-foreground italic">No special requests</p>
              )}
            </CardContent>
          </Card>
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
    </div>
  )
}
