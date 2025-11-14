// src/pages/dashboard/Dashboard.jsx
import { useState } from 'react';
import { LogIn, LogOut, Calendar, Clock, Plus, Search, Edit, Printer, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAlert, useConfirm } from '@/context/AlertContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { useRooms } from '../../context/RoomContext';
import { useMealPlans } from '../../context/MealPlanContext';
import { useReservations } from '../../context/ReservationContext';
import { calculateDays } from '../../utils/helpers';
import { cn } from '@/lib/utils'; // Import cn

const Dashboard = () => {
  const { rooms, roomTypes } = useRooms();
  const { getMealPlanName, getActivePlans } = useMealPlans();
  const { reservations, updateReservation, checkIn, checkOut } = useReservations();
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert();
  const confirm = useConfirm();
  const [activeType, setActiveType] = useState('arrival');
  const [activeDay, setActiveDay] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [activitiesTab, setActivitiesTab] = useState('bookings');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [initialFormData, setInitialFormData] = useState(null);
  const [initialRoomDetails, setInitialRoomDetails] = useState(null);
  
  // ... (All logic functions from the original file remain exactly the same) ...
  // getDateString, handleNewBooking, getTodaysDate, todayArrivals,
  // todayDepartures, totalAccommodations, todayString, bookingsMadeToday,
  // totalRoomNightsToday, sevenDaysAgo, reservationActivities, roomActivities,
  // recentActivities, getFilteredReservations, filteredCheckIns, showConfirm,
  // closeConfirmModal, closeModal, handleSubmit, handleEdit, handleCheckIn,
  // handleCheckOut, handlePrint, getStatusVariant, getActivityBadgeVariant,
  // getActivityLabel

    const getDateString = (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date.toISOString().split('T')[0];
  };
  
  const handleNewBooking = () => {
    // This should ideally navigate to the reservations page with a "new" state
    // For now, we'll just open the modal with empty data
    setEditingReservation(null);
    setInitialFormData(null);
    setInitialRoomDetails(null);
    setIsModalOpen(true);
  };

  const getTodaysDate = () => {
    const today = new Date();
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  const todayArrivals = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.check_in_date === today && r.status.toLowerCase() === 'confirmed';
  }).length;

  const todayDepartures = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.check_out_date === today;
  }).length;

  const totalAccommodations = reservations.length;

  // Today's bookings
  const todayString = new Date().toISOString().split('T')[0];
  const bookingsMadeToday = reservations.filter(r => {
    if (!r.created_at) return false;
    const createdDate = new Date(r.created_at).toISOString().split('T')[0];
    return createdDate === todayString && 
           r.status !== 'Checked-out' && 
           r.status !== 'Cancelled';
  });

  const totalRoomNightsToday = bookingsMadeToday.reduce((total, r) => {
    const nights = calculateDays(r.check_in_date, r.check_out_date);
    return total + nights;
  }, 0);

  // Recent activities
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const reservationActivities = reservations
    .filter(r => {
      const updatedDate = r.updated_at ? new Date(r.updated_at) : (r.created_at ? new Date(r.created_at) : null);
      if (!updatedDate) return false;
      
      const isSignificantActivity = 
        r.status === 'Cancelled' || 
        r.status === 'Checked-in' || 
        r.status === 'Checked-out';
      
      return updatedDate >= sevenDaysAgo && isSignificantActivity;
    })
    .map(r => ({
      type: 'reservation',
      action: r.status === 'Cancelled' ? 'cancelled' : 
              r.status === 'Checked-in' ? 'checked-in' : 
              'checked-out',
      reservation: r,
      timestamp: r.updated_at || r.created_at,
      guestName: r.guests?.name || 'Unknown',
      roomId: r.room_id,
      checkInDate: r.check_in_date
    }));

  const roomActivities = rooms
    .filter(room => {
      const updatedDate = room.updated_at ? new Date(room.updated_at) : null;
      if (!updatedDate) return false;
      
      const isSignificantStatus = room.status === 'Blocked' || room.status === 'Maintenance';
      
      return updatedDate >= sevenDaysAgo && isSignificantStatus;
    })
    .map(room => ({
      type: 'room',
      action: room.status === 'Blocked' ? 'blocked' : 'maintenance',
      room: room,
      timestamp: room.updated_at,
      roomNumber: room.room_number,
      roomId: room.id
    }));

  const recentActivities = [...reservationActivities, ...roomActivities]
    .sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateB - dateA;
    })
    .slice(0, 15);

  // Filter reservations
  const getFilteredReservations = () => {
    const targetDate = activeDay === 'today' ? getDateString(0) : getDateString(1);
    
    let filtered = reservations.filter(r => {
      if (activeType === 'arrival') {
        return r.check_in_date === targetDate && (r.status.toLowerCase() === 'confirmed' || r.status.toLowerCase() === 'hold');
      } else {
        return r.check_out_date === targetDate && r.status.toLowerCase() === 'checked-in';
      }
    });

    if (searchQuery.trim()) {
      filtered = filtered.filter(r => 
        r.guests?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredCheckIns = getFilteredReservations();

  // Modal handlers
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReservation(null);
    setInitialFormData(null);
    setInitialRoomDetails(null);
  };

  const handleSubmit = async (formData, roomDetails) => {
    try {
      if (editingReservation) {
        // ... (copy logic from original)
        const reservationData = {
          booking_source: formData.booking_source,
          agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
          direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
          guest_id: formData.guest_id,
          room_id: roomDetails[0].room_id,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          number_of_adults: parseInt(roomDetails[0].number_of_adults),
          number_of_children: parseInt(roomDetails[0].number_of_children),
          number_of_infants: parseInt(roomDetails[0].number_of_infants),
          number_of_guests: parseInt(roomDetails[0].number_of_adults) + parseInt(roomDetails[0].number_of_children) + parseInt(roomDetails[0].number_of_infants),
          meal_plan: formData.meal_plan,
          total_amount: parseFloat(formData.total_amount),
          advance_payment: parseFloat(formData.advance_payment),
          payment_status: formData.payment_status,
          status: formData.status,
          special_requests: formData.special_requests
        };
        await updateReservation(editingReservation.id, reservationData);
      }
      closeModal();
    } catch (error) {
      console.error('Error updating reservation:', error);
      showError('Failed to save booking: ' + error.message);
    }
  };

  const handleEdit = (reservation) => {
    // ... (copy logic from original)
    setEditingReservation(reservation);
    const room = rooms.find(r => r.id === reservation.room_id);
    const roomTypeId = room ? room.room_type_id : '';
    const formData = {
      booking_source: reservation.booking_source || 'direct',
      agent_id: reservation.agent_id || '',
      direct_source: reservation.direct_source || '',
      guest_id: reservation.guest_id,
      room_type_id: roomTypeId,
      number_of_rooms: 1,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      meal_plan: reservation.meal_plan || getActivePlans()[0]?.code || 'EP',
      total_amount: reservation.total_amount,
      advance_payment: reservation.advance_payment,
      payment_status: reservation.payment_status,
      status: reservation.status,
      special_requests: reservation.special_requests || ''
    };
    const roomDetails = [{
      room_type_id: roomTypeId,
      room_id: reservation.room_id,
      number_of_adults: reservation.number_of_adults || 1,
      number_of_children: reservation.number_of_children || 0,
      number_of_infants: reservation.number_of_infants || 0
    }];
    setInitialFormData(formData);
    setInitialRoomDetails(roomDetails);
    setIsModalOpen(true);
  };

  const handleCheckIn = async (reservation) => {
    const confirmed = await confirm({
      title: 'Check In',
      message: `Check in ${reservation.guests?.name}?`,
      variant: 'info',
      confirmText: 'Check In',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      checkIn(reservation.id);
    }
  };

  const handleCheckOut = async (reservation) => {
    const confirmed = await confirm({
      title: 'Check Out',
      message: `Check out ${reservation.guests?.name}?`,
      variant: 'info',
      confirmText: 'Check Out',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      checkOut(reservation.id);
    }
  };

  const handlePrint = (reservation) => {
    // ... (copy logic from original, no changes needed)
        const room = rooms.find(r => r.id === reservation.room_id);
    const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
    const days = calculateDays(reservation.check_in_date, reservation.check_out_date);
    const mealPlanName = getMealPlanName(reservation.meal_plan);

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Booking Confirmation - ${reservation.guests?.name}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
            .info-section { margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .info-row { display: flex; justify-content: space-between; margin: 10px 0; }
            .label { font-weight: bold; color: #374151; }
            .value { color: #1f2937; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #6b7280; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Booking Confirmation</h1>
          <div class="info-section">
            <h2>Guest Information</h2>
            <div class="info-row"><span class="label">Name:</span><span class="value">${reservation.guests?.name || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Phone:</span><span class="value">${reservation.guests?.phone || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Email:</span><span class="value">${reservation.guests?.email || 'N/A'}</span></div>
          </div>
          <div class="info-section">
            <h2>Booking Details</h2>
            <div class="info-row"><span class="label">Booking ID:</span><span class="value">#${reservation.id}</span></div>
            <div class="info-row"><span class="label">Room:</span><span class="value">${room?.room_number || 'N/A'} - ${roomType?.name || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Check-in:</span><span class="value">${reservation.check_in_date}</span></div>
            <div class="info-row"><span class="label">Check-out:</span><span class="value">${reservation.check_out_date}</span></div>
            <div class="info-row"><span class="label">Number of Nights:</span><span class="value">${days}</span></div>
            <div class="info-row"><span class="label">Guests:</span><span class="value">${reservation.number_of_adults || 0} Adults, ${reservation.number_of_children || 0} Children, ${reservation.number_of_infants || 0} Infants</span></div>
            <div class="info-row"><span class="label">Meal Plan:</span><span class="value">${mealPlanName || 'N/A'}</span></div>
            <div class="info-row"><span class="label">Status:</span><span class="value">${reservation.status}</span></div>
          </div>
          <div class="info-section">
            <h2>Payment Information</h2>
            <div class="info-row"><span class="label">Total Amount:</span><span class="value">₹${reservation.total_amount?.toLocaleString() || '0'}</span></div>
            <div class="info-row"><span class="label">Advance Payment:</span><span class="value">₹${reservation.advance_payment?.toLocaleString() || '0'}</span></div>
            <div class="info-row"><span class="label">Balance Due:</span><span class="value">₹${((reservation.total_amount || 0) - (reservation.advance_payment || 0)).toLocaleString()}</span></div>
            <div class="info-row"><span class="label">Payment Status:</span><span class="value">${reservation.payment_status}</span></div>
          </div>
          ${reservation.special_requests ? `<div class="info-section"><h2>Special Requests</h2><p>${reservation.special_requests}</p></div>` : ''}
          <div class="footer"><p>Thank you for choosing our hotel!</p><p>Printed on ${new Date().toLocaleDateString()}</p></div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 250);
  };

  const getStatusVariant = (status) => {
    // ... (copy logic from original)
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'confirmed': return 'info';
      case 'checked-in': return 'default';
      case 'checked-out': return 'success';
      case 'cancelled': return 'destructive';
      case 'hold': return 'warning';
      case 'tentative': return 'warning';
      default: return 'secondary';
    }
  };

  const getActivityBadgeVariant = (action) => {
    // ... (copy logic from original)
     switch (action) {
      case 'cancelled': return 'destructive';
      case 'checked-in': return 'default';
      case 'checked-out': return 'secondary';
      case 'blocked': return 'outline';
      case 'maintenance': return 'outline';
      default: return 'default';
    }
  };

  const getActivityLabel = (action) => {
    // ... (copy logic from original)
    switch (action) {
      case 'cancelled': return 'Cancelled';
      case 'checked-in': return 'Checked In';
      case 'checked-out': return 'Checked Out';
      case 'blocked': return 'Room Blocked';
      case 'maintenance': return 'Maintenance';
      default: return action;
    }
  };


  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">{getTodaysDate()}</h1>
        <Button onClick={handleNewBooking} className="gap-2">
          <Plus size={20} /> New Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrivals</CardTitle>
            <LogIn className="h-5 w-5 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayArrivals}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departures</CardTitle>
            <LogOut className="h-5 w-5 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayDepartures}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Accommodations Booked</CardTitle>
            <Calendar className="h-5 w-5 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAccommodations}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reservations Card */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Reservations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs value={activeType} onValueChange={setActiveType} className="w-full">
              <div className="px-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="arrival" className="gap-2">
                    <LogIn size={16} />
                    Arrival
                  </TabsTrigger>
                  <TabsTrigger value="departure" className="gap-2">
                    <LogOut size={16} />
                    Departure
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-6 py-4 border-b">
                <div className="flex gap-2">
                  <Button
                    variant={activeDay === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveDay('today')}
                  >
                    Today
                  </Button>
                  <Button
                    variant={activeDay === 'tomorrow' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveDay('tomorrow')}
                  >
                    Tomorrow
                  </Button>
                </div>
                <div className="relative w-full sm:w-auto sm:min-w-[250px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search guest name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <TabsContent value={activeType} className="m-0">
                <div className="px-6 pb-6">
                  {filteredCheckIns.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Calendar className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-sm text-gray-500">
                        No {activeType === 'arrival' ? 'arrivals' : 'departures'} for {activeDay}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Guest Name</TableHead>
                            <TableHead>Room No</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCheckIns.map(r => {
                            const room = rooms.find(room => room.id === r.room_id);
                            const isConfirmed = r.status.toLowerCase() === 'confirmed' || r.status.toLowerCase() === 'hold';
                            const isCheckedIn = r.status.toLowerCase() === 'checked-in';
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-semibold">{r.guests?.name || 'Unknown'}</TableCell>
                                <TableCell>{room?.room_number || 'N/A'}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={getStatusVariant(r.status)}>
                                    {r.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex justify-center gap-1">
                                    {activeType === 'arrival' && isConfirmed && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleCheckIn(r)}
                                        title="Check In"
                                        className="text-green-600 hover:text-green-700"
                                      >
                                        <LogIn size={16} />
                                      </Button>
                                    )}
                                    {activeType === 'departure' && isCheckedIn && (
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => handleCheckOut(r)}
                                        title="Check Out"
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <LogOut size={16} />
                                      </Button>
                                    )}
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handleEdit(r)}
                                      title="Edit"
                                      className="text-blue-600 hover:text-blue-700"
                                    >
                                      <Edit size={16} />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => handlePrint(r)}
                                      title="Print"
                                      className="text-gray-600 hover:text-gray-700"
                                    >
                                      <Printer size={16} />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Today's Activities Card */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Today's Activities</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mini Stats */}
            <div className="grid grid-cols-2 gap-4 px-6 py-4 bg-gray-50 border-b">
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase">Bookings Made Today</p>
                <p className="text-2xl font-bold">{bookingsMadeToday.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500 uppercase">Room Nights Booked</p>
                <p className="text-2xl font-bold">{totalRoomNightsToday}</p>
              </div>
            </div>

            <Tabs value={activitiesTab} onValueChange={setActivitiesTab} className="w-full">
              <div className="px-6 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                  <TabsTrigger value="activities">Activities</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="bookings" className="m-0 px-6 pb-6">
                {bookingsMadeToday.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No bookings made today</p>
                  </div>
                ) : (
                  <div className="rounded-md border mt-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guest Name</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Nights</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookingsMadeToday.map(r => {
                          const nights = calculateDays(r.check_in_date, r.check_out_date);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-semibold">{r.guests?.name || 'Unknown'}</TableCell>
                              <TableCell>{r.check_in_date}</TableCell>
                              <TableCell>{nights}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={getStatusVariant(r.status)}>
                                  {r.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activities" className="m-0 px-6 pb-6">
                {recentActivities.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <CalendarDays className="h-12 w-12 text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No recent activities</p>
                  </div>
                ) : (
                  <div className="space-y-3 mt-4 max-h-96 overflow-y-auto pr-2">
                    {recentActivities.map((activity, index) => {
                      const activityDate = activity.timestamp ? new Date(activity.timestamp) : null;
                      const timeDiff = activityDate ? Math.floor((new Date() - activityDate) / (1000 * 60 * 60 * 24)) : null;
                      const timeAgo = timeDiff === 0 ? 'Today' : 
                                      timeDiff === 1 ? 'Yesterday' : 
                                      timeDiff !== null ? `${timeDiff} days ago` : 'Unknown';
                      
                      if (activity.type === 'reservation') {
                        const room = rooms.find(r => r.id === activity.roomId);
                        
                        return (
                          <Card key={`res-${activity.reservation.id}-${index}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900 truncate">{activity.guestName}</span>
                                    <Badge variant={getActivityBadgeVariant(activity.action)} className="text-xs">
                                      {getActivityLabel(activity.action)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                    <span>Room {room?.room_number || 'N/A'}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <Clock size={12} />
                                    <span>{timeAgo}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <Calendar size={12} />
                                    <span>{activity.checkInDate}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      } else {
                        const roomType = roomTypes.find(rt => rt.id === activity.room.room_type_id);
                        
                        return (
                          <Card key={`room-${activity.room.id}-${index}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-semibold text-gray-900">Room {activity.roomNumber}</span>
                                    <Badge variant={getActivityBadgeVariant(activity.action)} className="text-xs">
                                      {getActivityLabel(activity.action)}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
                                    <span>{roomType?.name || 'Unknown Type'}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                                    <Clock size={12} />
                                    <span>{timeAgo}</span>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Edit Booking Modal */}
      <EditBookingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingReservation={editingReservation}
        editingGroup={null}
        initialFormData={initialFormData}
        initialRoomDetails={initialRoomDetails}
      />
    </div>
  );
};

export default Dashboard;