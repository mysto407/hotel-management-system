// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarDays, Users, Home, RefreshCw, X, Save, UserPlus, Lock, Calendar as CalendarIcon, Edit2, XOctagon } from 'lucide-react';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { Modal } from '../../components/common/Modal';
import { updateRoomStatus } from '../../lib/supabase';
import styles from './ReservationCalendar.module.css';

const ReservationCalendar = () => {
  const { reservations, fetchReservations, addReservation, updateReservation, cancelReservation } = useReservations();
  const { rooms, roomTypes, fetchRooms } = useRooms();
  const { guests, addGuest } = useGuests();
  
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Action menu state
  const [actionMenu, setActionMenu] = useState({
    visible: false,
    roomId: null,
    date: null,
    endDate: null,
    selectedCells: [],
    position: { x: 0, y: 0 }
  });
  
  // Drag selection state for multi-date booking
  const [dragSelection, setDragSelection] = useState({
    isSelecting: false,
    startRoomId: null,
    startDate: null,
    selectedCells: []
  });
  
  // Quick booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    guest_id: '',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0,
    meal_plan: 'NM',
    status: 'Confirmed',
    special_requests: ''
  });
  
  // Edit reservation modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  
  // Room status modal state
  const [isRoomStatusModalOpen, setIsRoomStatusModalOpen] = useState(false);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState(null);
  
  const [guestFormData, setGuestFormData] = useState({
    name: '',
    email: '',
    phone: '',
    id_proof_type: 'AADHAR',
    id_proof_number: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    guest_type: 'Regular'
  });
  
  // State for pending multi-room bookings
  const [pendingBookings, setPendingBookings] = useState([]);
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef(null);
  const actionMenuRef = useRef(null);

  // Generate dates for the calendar
  const generateDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < daysToShow; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }, [startDate, daysToShow]);

  // Check if a room is occupied on a specific date
  const getRoomStatus = (roomId, date) => {
    const reservation = reservations.find(r => {
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      const current = new Date(date);
      
      return r.room_id === roomId && 
             current >= checkIn && 
             current < checkOut &&
             (r.status === 'Confirmed' || r.status === 'Checked-in' || r.status === 'Hold');
    });

    if (reservation) {
      return {
        status: 'occupied',
        reservation: reservation,
        guestName: reservation.guests?.name || 'Unknown',
        statusType: reservation.status
      };
    }

    const room = rooms.find(r => r.id === roomId);
    if (room?.status === 'Maintenance') {
      return { status: 'maintenance' };
    }
    if (room?.status === 'Blocked') {
      return { status: 'blocked' };
    }

    return { status: 'available' };
  };

  // Get availability count for each room type on each date
  const getAvailabilityForType = (roomTypeId, date) => {
    const typeRooms = rooms.filter(r => r.room_type_id === roomTypeId);
    const available = typeRooms.filter(room => {
      const status = getRoomStatus(room.id, date);
      return status.status === 'available';
    });
    return { available: available.length, total: typeRooms.length };
  };

  // Get total availability across all rooms for a date
  const getTotalAvailability = (date) => {
    const available = rooms.filter(room => {
      const status = getRoomStatus(room.id, date);
      return status.status === 'available';
    });
    return { available: available.length, total: rooms.length };
  };

  // Toggle room type expansion
  const toggleRoomType = (roomTypeId) => {
    setExpandedRoomTypes(prev => ({
      ...prev,
      [roomTypeId]: !prev[roomTypeId]
    }));
  };

  // Navigate dates
  const goToPreviousWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() - 7);
    setStartDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(startDate);
    newDate.setDate(startDate.getDate() + 7);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  const handleDatePickerChange = (e) => {
    const selectedDate = new Date(e.target.value);
    setStartDate(selectedDate);
  };

  // Refresh calendar data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchReservations) await fetchReservations();
      if (fetchRooms) await fetchRooms();
      console.log('Calendar data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle cell click to show action menu
  const handleCellClick = (e, roomId, date) => {
    const roomStatus = getRoomStatus(roomId, date);
    
    if (isDragging) return;
    if (!containerRef.current) return;

    const cellRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;

    const x = cellRect.right - containerRect.left + scrollLeft + 10;
    const y = cellRect.top - containerRect.top + scrollTop;
    
    // If cell is occupied, show reservation details and edit options
    if (roomStatus.status === 'occupied') {
      setActionMenu({
        visible: true,
        roomId,
        date,
        endDate: null,
        selectedCells: [{ roomId, date }],
        position: { x, y },
        isOccupied: true,
        reservation: roomStatus.reservation,
        cellStatus: 'occupied'
      });
      return;
    }
    
    // If cell is blocked or maintenance, show room status change option
    if (roomStatus.status === 'blocked' || roomStatus.status === 'maintenance') {
      setActionMenu({
        visible: true,
        roomId,
        date,
        endDate: null,
        selectedCells: [{ roomId, date }],
        position: { x, y },
        isOccupied: false,
        cellStatus: roomStatus.status
      });
      return;
    }
    
    // Handle available cells (existing logic)
    if (roomStatus.status === 'available') {
      if (dragSelection.isSelecting) {
        return;
      }

      setDragSelection({
        isSelecting: false,
        startRoomId: roomId,
        startDate: date,
        selectedCells: [{ roomId, date }]
      });
      
      setActionMenu({
        visible: true,
        roomId,
        date,
        endDate: null,
        selectedCells: [{ roomId, date }],
        position: { x, y },
        isOccupied: false,
        cellStatus: 'available'
      });
    }
  };

  // Drag selection handlers for multi-date and multi-room booking
  const handleCellMouseDown = (e, roomId, date) => {
    const roomStatus = getRoomStatus(roomId, date);
    if (roomStatus.status !== 'available') return;
    
    if (isDragging) return;
    
    setDragSelection({
      isSelecting: true,
      startRoomId: roomId,
      startDate: date,
      selectedCells: [{ roomId, date }]
    });
    
    e.preventDefault();
  };

  const handleCellMouseEnter = (roomId, date) => {
    if (!dragSelection.isSelecting) return;
    
    const roomStatus = getRoomStatus(roomId, date);
    if (roomStatus.status !== 'available') return;
    
    const cellKey = `${roomId}-${date}`;
    const alreadySelected = dragSelection.selectedCells.some(
      cell => `${cell.roomId}-${cell.date}` === cellKey
    );
    
    if (!alreadySelected) {
      setDragSelection(prev => ({
        ...prev,
        selectedCells: [...prev.selectedCells, { roomId, date }]
      }));
    }
  };

  const handleCellMouseUp = (e, roomId, date) => {
    if (!dragSelection.isSelecting) return;
    
    if (dragSelection.selectedCells.length === 1) {
      const cell = dragSelection.selectedCells[0];
      
      if (!containerRef.current) return;

      const cellRect = e.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;

      const x = cellRect.right - containerRect.left + scrollLeft + 10;
      const y = cellRect.top - containerRect.top + scrollTop;
      
      setActionMenu({
        visible: true,
        roomId: cell.roomId,
        date: cell.date,
        endDate: null,
        selectedCells: [cell],
        position: { x, y }
      });
      
      setDragSelection(prev => ({
        ...prev,
        isSelecting: false
      }));
      
      return;
    }
    
    if (dragSelection.selectedCells.length > 1) {
      if (!containerRef.current) return;

      const cellRect = e.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;

      const x = cellRect.right - containerRect.left + scrollLeft + 10;
      const y = cellRect.top - containerRect.top + scrollTop;
      
      setActionMenu({
        visible: true,
        roomId: null,
        date: null,
        endDate: null,
        selectedCells: dragSelection.selectedCells,
        position: { x, y }
      });
    }
    
    setDragSelection(prev => ({
      ...prev,
      isSelecting: false
    }));
  };

  const handleGlobalMouseUp = () => {
    if (dragSelection.isSelecting) {
      setDragSelection({
        isSelecting: false,
        startRoomId: null,
        startDate: null,
        selectedCells: []
      });
    }
  };

  // Close action menu
  const closeActionMenu = () => {
    setActionMenu({
      visible: false,
      roomId: null,
      date: null,
      endDate: null,
      selectedCells: [],
      position: { x: 0, y: 0 }
    });
    setDragSelection({
      isSelecting: false,
      startRoomId: null,
      startDate: null,
      selectedCells: []
    });
  };

  // Handle Block action
  const handleBlockRoom = async () => {
    const selectedCells = actionMenu.selectedCells || [];
    
    if (selectedCells.length === 0) return;
    
    const uniqueRoomIds = [...new Set(selectedCells.map(c => c.roomId))];
    
    if (!window.confirm(
      `Block ${uniqueRoomIds.length} room${uniqueRoomIds.length !== 1 ? 's' : ''}?`
    )) {
      return;
    }
    
    try {
      const blockPromises = uniqueRoomIds.map(roomId => 
        updateRoomStatus(roomId, 'Blocked')
      );
      
      await Promise.all(blockPromises);
      await fetchRooms();
      
      alert(`${uniqueRoomIds.length} room${uniqueRoomIds.length !== 1 ? 's' : ''} blocked successfully`);
    } catch (error) {
      console.error('Error blocking rooms:', error);
      alert('Failed to block rooms: ' + error.message);
    }
    
    closeActionMenu();
  };

  // Handle Edit Reservation action
  const handleEditReservation = () => {
    if (!actionMenu.reservation) return;
    
    setEditingReservation(actionMenu.reservation);
    
    setBookingData({
      room_id: actionMenu.reservation.room_id,
      check_in_date: actionMenu.reservation.check_in_date,
      check_out_date: actionMenu.reservation.check_out_date,
      guest_id: actionMenu.reservation.guest_id,
      number_of_adults: actionMenu.reservation.number_of_adults || 1,
      number_of_children: actionMenu.reservation.number_of_children || 0,
      number_of_infants: actionMenu.reservation.number_of_infants || 0,
      meal_plan: actionMenu.reservation.meal_plan || 'NM',
      status: actionMenu.reservation.status,
      special_requests: actionMenu.reservation.special_requests || ''
    });
    
    closeActionMenu();
    setIsEditModalOpen(true);
  };

  // Handle Cancel Reservation action
  const handleCancelReservation = async () => {
    if (!actionMenu.reservation) return;
    
    const guestName = actionMenu.reservation.guests?.name || 'Unknown';
    
    if (!window.confirm(`Are you sure you want to cancel the reservation for ${guestName}?`)) {
      return;
    }
    
    try {
      await cancelReservation(actionMenu.reservation.id);
      await fetchReservations();
      await fetchRooms();
      
      alert('Reservation cancelled successfully!');
      closeActionMenu();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      alert('Failed to cancel reservation: ' + error.message);
    }
  };

  // Handle Change Room Status action
  const handleChangeRoomStatus = () => {
    if (!actionMenu.roomId) return;
    
    const room = rooms.find(r => r.id === actionMenu.roomId);
    setSelectedRoomForStatus(room);
    
    closeActionMenu();
    setIsRoomStatusModalOpen(true);
  };

  // Submit edit reservation
  const handleUpdateReservation = async () => {
    if (!bookingData.guest_id) {
      alert('Please select a guest');
      return;
    }
    
    if (!bookingData.check_out_date) {
      alert('Please select check-out date');
      return;
    }
    
    try {
      const room = rooms.find(r => r.id === bookingData.room_id);
      const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
      
      const checkIn = new Date(bookingData.check_in_date);
      const checkOut = new Date(bookingData.check_out_date);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalAmount = (roomType?.base_price || 0) * nights;
      
      const reservationData = {
        guest_id: bookingData.guest_id,
        room_id: bookingData.room_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        number_of_adults: parseInt(bookingData.number_of_adults),
        number_of_children: parseInt(bookingData.number_of_children),
        number_of_infants: parseInt(bookingData.number_of_infants),
        number_of_guests: parseInt(bookingData.number_of_adults) + parseInt(bookingData.number_of_children) + parseInt(bookingData.number_of_infants),
        meal_plan: bookingData.meal_plan,
        total_amount: totalAmount,
        status: bookingData.status,
        special_requests: bookingData.special_requests
      };
      
      await updateReservation(editingReservation.id, reservationData);
      await fetchReservations();
      
      alert('Reservation updated successfully!');
      
      setIsEditModalOpen(false);
      setEditingReservation(null);
      setBookingData({
        room_id: '',
        check_in_date: '',
        check_out_date: '',
        guest_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'NM',
        status: 'Confirmed',
        special_requests: ''
      });
      
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation: ' + error.message);
    }
  };

  // Submit room status change
  const handleSubmitRoomStatus = async (newStatus) => {
    if (!selectedRoomForStatus) return;
    
    try {
      await updateRoomStatus(selectedRoomForStatus.id, newStatus);
      await fetchRooms();
      
      alert(`Room ${selectedRoomForStatus.room_number} status changed to ${newStatus}`);
      
      setIsRoomStatusModalOpen(false);
      setSelectedRoomForStatus(null);
    } catch (error) {
      console.error('Error updating room status:', error);
      alert('Failed to update room status: ' + error.message);
    }
  };

  // Handle Hold action - Create a hold reservation
  const handleHoldRoom = async () => {
    const selectedCells = actionMenu.selectedCells || [];
    
    if (selectedCells.length === 0) return;
    
    if (selectedCells.length === 1) {
      const cell = selectedCells[0];
      const checkOutDate = new Date(cell.date);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      
      setBookingData({
        room_id: cell.roomId,
        check_in_date: cell.date,
        check_out_date: checkOutDate.toISOString().split('T')[0],
        guest_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'NM',
        status: 'Hold',
        special_requests: ''
      });
      
      closeActionMenu();
      setIsBookingModalOpen(true);
    } else {
      handleMultiCellBooking('Hold');
    }
  };
  
  // Handle multi-cell booking (for drag selections across multiple rooms/dates)
  const handleMultiCellBooking = async (status) => {
    const selectedCells = actionMenu.selectedCells || [];
    
    if (selectedCells.length === 0) return;
    
    const cellsByRoom = {};
    selectedCells.forEach(cell => {
      if (!cellsByRoom[cell.roomId]) {
        cellsByRoom[cell.roomId] = [];
      }
      cellsByRoom[cell.roomId].push(cell.date);
    });
    
    const bookings = [];
    Object.keys(cellsByRoom).forEach(roomId => {
      const dates = cellsByRoom[roomId].sort();
      
      let currentRange = [dates[0]];
      
      for (let i = 1; i < dates.length; i++) {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
        
        if (dayDiff === 1) {
          currentRange.push(dates[i]);
        } else {
          bookings.push({
            roomId,
            checkIn: currentRange[0],
            checkOut: new Date(new Date(currentRange[currentRange.length - 1]).getTime() + 86400000).toISOString().split('T')[0]
          });
          currentRange = [dates[i]];
        }
      }
      
      if (currentRange.length > 0) {
        bookings.push({
          roomId,
          checkIn: currentRange[0],
          checkOut: new Date(new Date(currentRange[currentRange.length - 1]).getTime() + 86400000).toISOString().split('T')[0]
        });
      }
    });
    
    const roomCount = Object.keys(cellsByRoom).length;
    const totalNights = selectedCells.length;
    const bookingCount = bookings.length;
    
    if (!window.confirm(
      `Create ${bookingCount} ${status.toLowerCase()} booking${bookingCount !== 1 ? 's' : ''}?\n\n` +
      `${roomCount} room${roomCount !== 1 ? 's' : ''} Ã— ${totalNights} total night${totalNights !== 1 ? 's' : ''}\n\n` +
      `You'll enter guest details once, and all bookings will be created with the same guest.`
    )) {
      return;
    }
    
    setPendingBookings(bookings);
    
    const firstBooking = bookings[0];
    
    setBookingData({
      room_id: firstBooking.roomId,
      check_in_date: firstBooking.checkIn,
      check_out_date: firstBooking.checkOut,
      guest_id: '',
      number_of_adults: 1,
      number_of_children: 0,
      number_of_infants: 0,
      meal_plan: 'NM',
      status: status,
      special_requests: bookingCount > 1 ? `Multi-room booking (1 of ${bookingCount})` : ''
    });
    
    closeActionMenu();
    setIsBookingModalOpen(true);
  };

  // Handle Book action - Open quick booking modal
  const handleBookRoom = () => {
    const selectedCells = actionMenu.selectedCells || [];
    
    if (selectedCells.length === 0) return;
    
    if (selectedCells.length === 1) {
      const cell = selectedCells[0];
      const checkOutDate = new Date(cell.date);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      
      setBookingData({
        room_id: cell.roomId,
        check_in_date: cell.date,
        check_out_date: checkOutDate.toISOString().split('T')[0],
        guest_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'NM',
        status: 'Confirmed',
        special_requests: ''
      });
      
      closeActionMenu();
      setIsBookingModalOpen(true);
    } else {
      handleMultiCellBooking('Confirmed');
    }
  };

  // Submit quick booking
  const handleQuickBooking = async () => {
    if (!bookingData.guest_id) {
      alert('Please select a guest');
      return;
    }
    
    if (!bookingData.check_out_date) {
      alert('Please select check-out date');
      return;
    }
    
    try {
      const room = rooms.find(r => r.id === bookingData.room_id);
      const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
      
      const checkIn = new Date(bookingData.check_in_date);
      const checkOut = new Date(bookingData.check_out_date);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      const totalAmount = (roomType?.base_price || 0) * nights;
      
      const reservationData = {
        booking_source: 'direct',
        direct_source: 'Calendar',
        guest_id: bookingData.guest_id,
        room_id: bookingData.room_id,
        check_in_date: bookingData.check_in_date,
        check_out_date: bookingData.check_out_date,
        number_of_adults: parseInt(bookingData.number_of_adults),
        number_of_children: parseInt(bookingData.number_of_children),
        number_of_infants: parseInt(bookingData.number_of_infants),
        number_of_guests: parseInt(bookingData.number_of_adults) + parseInt(bookingData.number_of_children) + parseInt(bookingData.number_of_infants),
        meal_plan: bookingData.meal_plan,
        total_amount: totalAmount,
        advance_payment: 0,
        payment_status: 'Pending',
        status: bookingData.status,
        special_requests: bookingData.special_requests
      };
      
      await addReservation(reservationData);
      
      if (pendingBookings.length > 1) {
        let successCount = 1;
        let failCount = 0;
        
        for (let i = 1; i < pendingBookings.length; i++) {
          const booking = pendingBookings[i];
          const bookingRoom = rooms.find(r => r.id === booking.roomId);
          const bookingRoomType = roomTypes.find(rt => rt.id === bookingRoom?.room_type_id);
          
          const bookingCheckIn = new Date(booking.checkIn);
          const bookingCheckOut = new Date(booking.checkOut);
          const bookingNights = Math.ceil((bookingCheckOut - bookingCheckIn) / (1000 * 60 * 60 * 24));
          const bookingTotal = (bookingRoomType?.base_price || 0) * bookingNights;
          
          try {
            await addReservation({
              booking_source: 'direct',
              direct_source: 'Calendar',
              guest_id: bookingData.guest_id,
              room_id: booking.roomId,
              check_in_date: booking.checkIn,
              check_out_date: booking.checkOut,
              number_of_adults: parseInt(bookingData.number_of_adults),
              number_of_children: parseInt(bookingData.number_of_children),
              number_of_infants: parseInt(bookingData.number_of_infants),
              number_of_guests: parseInt(bookingData.number_of_adults) + parseInt(bookingData.number_of_children) + parseInt(bookingData.number_of_infants),
              meal_plan: bookingData.meal_plan,
              total_amount: bookingTotal,
              advance_payment: 0,
              payment_status: 'Pending',
              status: bookingData.status,
              special_requests: `Multi-room booking (${i + 1} of ${pendingBookings.length})`
            });
            successCount++;
          } catch (error) {
            console.error(`Error creating booking ${i + 1}:`, error);
            failCount++;
          }
        }
        
        setPendingBookings([]);
        
        await fetchReservations();
        
        if (failCount > 0) {
          alert(`Created ${successCount} of ${pendingBookings.length} bookings successfully. ${failCount} booking(s) failed.`);
        } else {
          alert(`All ${successCount} bookings created successfully!`);
        }
      } else {
        await fetchReservations();
        alert('Booking created successfully!');
        setPendingBookings([]);
      }
      
      setIsBookingModalOpen(false);
      setBookingData({
        room_id: '',
        check_in_date: '',
        check_out_date: '',
        guest_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'NM',
        status: 'Confirmed',
        special_requests: ''
      });
      
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking: ' + error.message);
    }
  };

  // Guest modal handlers
  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setBookingData({ ...bookingData, guest_id: newGuest.id });
      setGuestFormData({
        name: '',
        email: '',
        phone: '',
        id_proof_type: 'AADHAR',
        id_proof_number: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        guest_type: 'Regular'
      });
      setIsGuestModalOpen(false);
    }
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        closeActionMenu();
      }
    };

    const handleMouseUp = () => {
      handleGlobalMouseUp();
    };
    
    if (actionMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [actionMenu.visible, dragSelection.isSelecting]);

  // Drag-to-scroll handlers
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setScrollLeft(containerRef.current.scrollLeft);
    containerRef.current.style.cursor = 'grabbing';
    containerRef.current.style.userSelect = 'none';
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    containerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    if (!containerRef.current) return;
    setIsDragging(false);
    containerRef.current.style.cursor = 'grab';
    containerRef.current.style.userSelect = '';
  };

  const handleMouseLeave = () => {
    if (isDragging && containerRef.current) {
      setIsDragging(false);
      containerRef.current.style.cursor = 'grab';
      containerRef.current.style.userSelect = '';
    }
  };

  // Set initial cursor style
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  // Get cell style based on status
  const getCellStyle = (status) => {
    switch (status) {
      case 'available':
        return styles.calendarCellAvailable;
      case 'occupied':
        return styles.calendarCellOccupied;
      case 'maintenance':
        return styles.calendarCellMaintenance;
      case 'blocked':
        return styles.calendarCellBlocked;
      default:
        return '';
    }
  };

  // Calculate summary statistics
  const totalAvailable = rooms.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    const status = getRoomStatus(r.id, today);
    return status.status === 'available';
  }).length;

  const totalOccupied = rooms.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    const status = getRoomStatus(r.id, today);
    return status.status === 'occupied';
  }).length;

  return (
    <div className={styles.calendarPage}>
      {/* Page Header */}
      <div className={styles.calendarPageHeader}>
        <div className={styles.calendarTitleBar}>
          <div>
            <h1 className={styles.calendarMainTitle}>
              <CalendarDays size={28} />
              Booking Calendar
            </h1>
            <p className={styles.calendarSubtitle}>Manage room availability and reservations</p>
          </div>
        </div>

        {/* Navigation & Controls Toolbar */}
        <div className={styles.calendarToolbar}>
          <div className={styles.calendarNavButtons}>
            <button onClick={goToPreviousWeek} className={styles.calendarNavBtn}>
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button onClick={goToToday} className={`${styles.calendarNavBtn} ${styles.todayBtn}`}>
              <Calendar size={18} />
              <span>Today</span>
            </button>
            <button onClick={goToNextWeek} className={styles.calendarNavBtn}>
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className={styles.calendarViewControls}>
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={handleDatePickerChange}
              className={styles.calendarDateInput}
            />
            <select
              value={daysToShow}
              onChange={(e) => setDaysToShow(parseInt(e.target.value))}
              className={styles.calendarDaysSelect}
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
          </div>
          
          <div className={styles.calendarHeaderActions}>
            <div className={styles.calendarQuickStats}>
              <div className={styles.quickStatItem}>
                <Home size={20} />
                <div>
                  <div className={styles.quickStatValue}>{totalAvailable}</div>
                  <div className={styles.quickStatLabel}>Available</div>
                </div>
              </div>
              <div className={styles.quickStatItem}>
                <Users size={20} />
                <div>
                  <div className={styles.quickStatValue}>{totalOccupied}</div>
                  <div className={styles.quickStatLabel}>Occupied</div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={handleRefresh} 
              className={`${styles.calendarRefreshBtn} ${isRefreshing ? styles.refreshing : ''}`}
              disabled={isRefreshing}
              title="Refresh calendar data"
            >
              <RefreshCw size={18} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div 
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={styles.calendarContainer}
      >
        <table className={styles.calendarTable}>
          <thead>
            {/* Date Headers */}
            <tr>
              <th className={styles.calendarFixedColumn}>
                <div className={styles.fixedColumnHeader}>
                  <span>Room Type / Room</span>
                </div>
              </th>
              {generateDates.map(date => {
                const dateObj = new Date(date);
                const isToday = date === new Date().toISOString().split('T')[0];
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                
                return (
                  <th 
                    key={date} 
                    className={`${styles.calendarDateHeader} ${isToday ? styles.today : ''} ${isWeekend ? styles.weekend : ''}`}
                  >
                    <div className={styles.dateHeaderContent}>
                      <div className={styles.dateDay}>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={styles.dateNum}>{dateObj.getDate()}</div>
                      <div className={styles.dateMonth}>{dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {/* Total Availability Row */}
            <tr className={styles.availabilityRow}>
              <th className={`${styles.calendarFixedColumn} ${styles.availabilityLabel}`}>
                <div className={styles.availabilityLabelContent}>
                  <CalendarDays size={16} />
                  <span>Total Availability</span>
                </div>
              </th>
              {generateDates.map(date => {
                const availability = getTotalAvailability(date);
                const percentage = (availability.available / availability.total) * 100;
                
                return (
                  <td key={date} className={styles.availabilityCell}>
                    <div className={styles.availabilityContent}>
                      <div className={styles.availabilityProgress}>
                        <div 
                          className={styles.availabilityProgressBar}
                          style={{ 
                            width: `${percentage}%`,
                            background: percentage > 60 ? '#10b981' : 
                                       percentage > 30 ? '#f59e0b' : 
                                       '#ef4444'
                          }}
                        />
                      </div>
                      <span className={styles.availabilityNumbers}>
                        {availability.available}/{availability.total}
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>

            {/* Room Types and Rooms */}
            {roomTypes.map(roomType => {
              const typeRooms = rooms.filter(r => r.room_type_id === roomType.id);
              const isExpanded = expandedRoomTypes[roomType.id];

              return (
                <>
                  {/* Room Type Row */}
                  <tr key={roomType.id} className={styles.roomTypeRow}>
                    <td className={`${styles.calendarFixedColumn} ${styles.roomTypeCell}`}>
                      <button
                        onClick={() => toggleRoomType(roomType.id)}
                        className={styles.roomTypeToggle}
                      >
                        <div className={styles.roomTypeIcon}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </div>
                        <div className={styles.roomTypeInfo}>
                          <strong>{roomType.name}</strong>
                          <span className={styles.roomCount}>{typeRooms.length} rooms</span>
                        </div>
                      </button>
                    </td>
                    {generateDates.map(date => {
                      const availability = getAvailabilityForType(roomType.id, date);
                      const percentage = (availability.available / availability.total) * 100;
                      
                      return (
                        <td key={date} className={styles.roomTypeAvailabilityCell}>
                          <div className={styles.availabilityBarContainer}>
                            <div 
                              className={styles.availabilityBar} 
                              style={{ 
                                width: `${percentage}%`,
                                background: percentage > 60 ? '#10b981' : 
                                           percentage > 30 ? '#f59e0b' : 
                                           '#ef4444'
                              }}
                            />
                            <span className={styles.availabilityText}>
                              {availability.available}/{availability.total}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Individual Room Rows (when expanded) */}
                  {isExpanded && typeRooms.map(room => (
                    <tr key={room.id} className={styles.roomRow}>
                      <td className={`${styles.calendarFixedColumn} ${styles.roomCell}`}>
                        <div className={styles.roomInfo}>
                          <span className={styles.roomNumber}>Room {room.room_number}</span>
                          <span className={styles.roomFloor}>Floor {room.floor}</span>
                        </div>
                      </td>
                      {generateDates.map(date => {
                        const roomStatus = getRoomStatus(room.id, date);
                        const isSelected = dragSelection.selectedCells.some(
                          cell => cell.roomId === room.id && cell.date === date
                        );
                        
                        return (
                          <td 
                            key={date} 
                            className={`${styles.calendarCell} ${getCellStyle(roomStatus.status)} ${isSelected ? styles.cellSelected : ''}`}
                            title={roomStatus.guestName || roomStatus.status}
                            onClick={(e) => handleCellClick(e, room.id, date)}
                            onMouseDown={(e) => handleCellMouseDown(e, room.id, date)}
                            onMouseEnter={() => handleCellMouseEnter(room.id, date)}
                            onMouseUp={(e) => handleCellMouseUp(e, room.id, date)}
                            style={{ 
                              cursor: 'pointer',
                              position: 'relative',
                              userSelect: 'none'
                            }}
                          >
                            {roomStatus.status === 'occupied' && (
                              <div className={`${styles.cellContent} ${styles.occupiedContent}`}>
                                <div className={styles.guestName}>{roomStatus.guestName}</div>
                                <div className={styles.reservationStatus}>{roomStatus.statusType}</div>
                              </div>
                            )}
                            {roomStatus.status === 'maintenance' && (
                              <div className={`${styles.cellContent} ${styles.maintenanceContent}`}>
                                <div className={styles.statusLabel}>Maintenance</div>
                              </div>
                            )}
                            {roomStatus.status === 'blocked' && (
                              <div className={`${styles.cellContent} ${styles.blockedContent}`}>
                                <div className={styles.statusLabel}>Blocked</div>
                              </div>
                            )}
                            {isSelected && (
                              <div className={styles.selectionOverlay}></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
        
        {/* Action Menu Popup */}
        {actionMenu.visible && (
          <div
            ref={actionMenuRef}
            className={styles.actionMenu}
            style={{
              left: `${actionMenu.position.x}px`,
              top: `${actionMenu.position.y}px`,
            }}
          >
            <div className={styles.actionMenuHeader}>
              {(() => {
                const room = rooms.find(r => r.id === actionMenu.roomId);
                
                // Show reservation details if occupied
                if (actionMenu.isOccupied && actionMenu.reservation) {
                  return (
                    <>
                      <div className={styles.actionMenuHeaderTitle}>
                        Room {room?.room_number || ''}
                      </div>
                      <div className={styles.actionMenuHeaderGuest}>
                        Guest: <strong>{actionMenu.reservation.guests?.name || 'Unknown'}</strong>
                      </div>
                      <div className={styles.actionMenuHeaderDates}>
                        {new Date(actionMenu.reservation.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' - '}
                        {new Date(actionMenu.reservation.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className={styles.actionMenuHeaderStatus}>
                        <span className={styles.actionMenuHeaderStatusTag} style={{ 
                          background: actionMenu.reservation.status === 'Confirmed' ? '#dcfce7' : 
                                     actionMenu.reservation.status === 'Checked-in' ? '#dbeafe' : 
                                     actionMenu.reservation.status === 'Hold' ? '#fed7aa' : '#e5e7eb',
                          color: actionMenu.reservation.status === 'Confirmed' ? '#166534' : 
                                actionMenu.reservation.status === 'Checked-in' ? '#1e40af' : 
                                actionMenu.reservation.status === 'Hold' ? '#9a3412' : '#374151'
                        }}>
                          {actionMenu.reservation.status}
                        </span>
                      </div>
                    </>
                  );
                }
                
                // Show blocked/maintenance status
                if (actionMenu.cellStatus === 'blocked' || actionMenu.cellStatus === 'maintenance') {
                  return (
                    <>
                      <div className={styles.actionMenuHeaderTitle}>
                        Room {room?.room_number || ''}
                      </div>
                      <div className={styles.actionMenuHeaderGuest}>
                        Status: <strong style={{ 
                          color: actionMenu.cellStatus === 'blocked' ? '#dc2626' : '#f59e0b',
                          textTransform: 'capitalize'
                        }}>
                          {actionMenu.cellStatus}
                        </strong>
                      </div>
                      <div className={styles.actionMenuHeaderDates}>
                        {new Date(actionMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </>
                  );
                }
                
                const selectedCells = actionMenu.selectedCells || [];
                
                if (selectedCells.length === 1) {
                  const cell = selectedCells[0];
                  return `${room ? `Room ${room.room_number}` : 'Room'} - ${new Date(cell.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (selectedCells.length > 1) {
                  const uniqueRooms = [...new Set(selectedCells.map(c => c.roomId))];
                  const uniqueDates = [...new Set(selectedCells.map(c => c.date))].sort();
                  
                  return (
                    <>
                      <div className={styles.actionMenuHeaderTitle}>
                        {selectedCells.length} cell{selectedCells.length !== 1 ? 's' : ''} selected
                      </div>
                      <div className={styles.actionMenuHeaderDates}>
                        {uniqueRooms.length} room{uniqueRooms.length !== 1 ? 's' : ''} × {uniqueDates.length} night{uniqueDates.length !== 1 ? 's' : ''}
                      </div>
                      <div className={styles.actionMenuHeaderDates} style={{ color: '#166534', fontWeight: '600' }}>
                        {uniqueDates[0] && new Date(uniqueDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {uniqueDates.length > 1 && ` - ${new Date(uniqueDates[uniqueDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                      </div>
                    </>
                  );
                }
                
                return 'Select a date';
              })()}
            </div>
            
            {/* Show different options based on cell status */}
            {actionMenu.isOccupied ? (
              // Options for occupied cells
              <>
                <button
                  onClick={handleEditReservation}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemAccent}`}
                >
                  <Edit2 size={16} />
                  Edit Reservation
                </button>
                
                <button
                  onClick={handleCancelReservation}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                >
                  <XOctagon size={16} />
                  Cancel Reservation
                </button>
                
                <button
                  onClick={handleChangeRoomStatus}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemNeutral} ${styles.actionMenuDivider}`}
                >
                  <Home size={16} />
                  Change Room Status
                </button>
              </>
            ) : actionMenu.cellStatus === 'blocked' || actionMenu.cellStatus === 'maintenance' ? (
              // Options for blocked/maintenance cells
              <>
                <button
                  onClick={handleChangeRoomStatus}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemNeutral}`}
                >
                  <Home size={16} />
                  Change Room Status
                </button>
              </>
            ) : (
              // Options for available cells
              <>
                <button
                  onClick={handleBookRoom}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemPrimary}`}
                >
                  <CalendarIcon size={16} />
                  Book
                </button>
                
                <button
                  onClick={handleHoldRoom}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemWarning}`}
                >
                  <Lock size={16} />
                  Hold
                </button>
                
                <button
                  onClick={handleBlockRoom}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemDanger}`}
                >
                  <X size={16} />
                  Block
                </button>
                
                <button
                  onClick={handleChangeRoomStatus}
                  className={`${styles.actionMenuItem} ${styles.actionMenuItemNeutral} ${styles.actionMenuDivider}`}
                >
                  <Home size={16} />
                  Change Room Status
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Quick Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setPendingBookings([]);
        }}
        title={pendingBookings.length > 1 ? `Quick Booking (Creating ${pendingBookings.length} bookings)` : "Quick Booking"}
        size="medium"
      >
        <div className="form-grid">
          {/* Multi-booking indicator */}
          {pendingBookings.length > 1 && (
            <div className="form-group full-width">
              <div className={`${styles.modalInfoBox} ${styles.modalInfoBoxWarning}`}>
                <div className={styles.modalInfoBoxWarningTitle}>
                  Multi-Room Booking
                </div>
                <div className={styles.modalInfoBoxWarningText}>
                  You're creating <strong>{pendingBookings.length} bookings</strong> at once. Enter guest details once, and all bookings will use the same information.
                </div>
                <div className={`${styles.modalInfoBoxWarningText}`} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                  Rooms: {pendingBookings.map((b, i) => {
                    const room = rooms.find(r => r.id === b.roomId);
                    return room?.room_number || '?';
                  }).join(', ')}
                </div>
              </div>
            </div>
          )}
          
          {/* Room and Date Info */}
          <div className="form-group full-width">
            <div className={styles.modalInfoBox}>
              <div className={styles.modalInfoBoxTitle}>
                {(() => {
                  const room = rooms.find(r => r.id === bookingData.room_id);
                  const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
                  return `Room ${room?.room_number || ''} - ${roomType?.name || ''}`;
                })()}
              </div>
              <div className={styles.modalInfoBoxText}>
                Check-in: {bookingData.check_in_date}
              </div>
              <div className={styles.modalInfoBoxText}>
                Check-out: {bookingData.check_out_date}
              </div>
              {bookingData.check_in_date && bookingData.check_out_date && (
                <div className={styles.modalInfoBoxText} style={{ fontWeight: '700', marginTop: '6px' }}>
                  {(() => {
                    const nights = Math.ceil((new Date(bookingData.check_out_date) - new Date(bookingData.check_in_date)) / (1000 * 60 * 60 * 24));
                    return `${nights} night${nights !== 1 ? 's' : ''}`;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Guest Selection */}
          <div className="form-group full-width">
            <label>Select Guest *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={bookingData.guest_id}
                onChange={(e) => setBookingData({ ...bookingData, guest_id: e.target.value })}
              >
                <option value="">Select Guest</option>
                {guests.map(guest => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name} - {guest.phone}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setIsGuestModalOpen(true)} 
                className="btn-secondary"
                type="button"
              >
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          {/* Check-out Date */}
          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={bookingData.check_out_date}
              onChange={(e) => setBookingData({ ...bookingData, check_out_date: e.target.value })}
              min={bookingData.check_in_date}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            <select
              value={bookingData.status}
              onChange={(e) => setBookingData({ ...bookingData, status: e.target.value })}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Hold">Hold</option>
              <option value="Tentative">Tentative</option>
            </select>
          </div>

          {/* Number of Guests */}
          <div className="form-group">
            <label>Adults *</label>
            <input
              type="number"
              min="1"
              value={bookingData.number_of_adults}
              onChange={(e) => setBookingData({ ...bookingData, number_of_adults: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Children</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_children}
              onChange={(e) => setBookingData({ ...bookingData, number_of_children: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Infants</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_infants}
              onChange={(e) => setBookingData({ ...bookingData, number_of_infants: e.target.value })}
            />
          </div>

          {/* Meal Plan */}
          <div className="form-group">
            <label>Meal Plan</label>
            <select
              value={bookingData.meal_plan}
              onChange={(e) => setBookingData({ ...bookingData, meal_plan: e.target.value })}
            >
              <option value="NM">No Meal</option>
              <option value="BO">Breakfast Only</option>
              <option value="HB">Half Board</option>
              <option value="FB">Full Board</option>
            </select>
          </div>

          {/* Special Requests */}
          <div className="form-group full-width">
            <label>Special Requests</label>
            <textarea
              value={bookingData.special_requests}
              onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={() => setIsBookingModalOpen(false)} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button onClick={handleQuickBooking} className="btn-primary">
            <Save size={18} /> Create Booking
          </button>
        </div>
      </Modal>

      {/* Quick Add Guest Modal */}
      <Modal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        title="Add New Guest"
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={guestFormData.name}
              onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={guestFormData.phone}
              onChange={(e) => setGuestFormData({ ...guestFormData, phone: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={guestFormData.email}
              onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof Type</label>
            <select
              value={guestFormData.id_proof_type}
              onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_type: e.target.value })}
            >
              <option value="AADHAR">AADHAR</option>
              <option value="PAN">PAN</option>
              <option value="Passport">Passport</option>
              <option value="Driving License">Driving License</option>
              <option value="Voter ID">Voter ID</option>
              <option value="N/A">N/A</option>
            </select>
          </div>
          <div className="form-group">
            <label>ID Proof Number</label>
            <input
              type="text"
              value={guestFormData.id_proof_number}
              onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_number: e.target.value })}
              placeholder="AADHAR-1234"
            />
          </div>
          <div className="form-group">
            <label>Guest Type</label>
            <select
              value={guestFormData.guest_type}
              onChange={(e) => setGuestFormData({ ...guestFormData, guest_type: e.target.value })}
            >
              <option value="Regular">Regular</option>
              <option value="VIP">VIP</option>
              <option value="Corporate">Corporate</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <input
              type="text"
              value={guestFormData.address}
              onChange={(e) => setGuestFormData({ ...guestFormData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={guestFormData.city}
              onChange={(e) => setGuestFormData({ ...guestFormData, city: e.target.value })}
              placeholder="Mumbai"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={guestFormData.state}
              onChange={(e) => setGuestFormData({ ...guestFormData, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={guestFormData.country}
              onChange={(e) => setGuestFormData({ ...guestFormData, country: e.target.value })}
              placeholder="India"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={() => setIsGuestModalOpen(false)} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button onClick={handleCreateGuest} className="btn-primary">
            <Save size={18} /> Add Guest
          </button>
        </div>
      </Modal>

      {/* Edit Reservation Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReservation(null);
        }}
        title="Edit Reservation"
        size="medium"
      >
        <div className="form-grid">
          {/* Room and Date Info */}
          <div className="form-group full-width">
            <div className={styles.modalInfoBox}>
              <div className={styles.modalInfoBoxTitle}>
                {(() => {
                  const room = rooms.find(r => r.id === bookingData.room_id);
                  const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
                  return `Room ${room?.room_number || ''} - ${roomType?.name || ''}`;
                })()}
              </div>
              <div className={styles.modalInfoBoxText}>
                Check-in: {bookingData.check_in_date}
              </div>
              <div className={styles.modalInfoBoxText}>
                Check-out: {bookingData.check_out_date}
              </div>
              {bookingData.check_in_date && bookingData.check_out_date && (
                <div className={styles.modalInfoBoxText} style={{ fontWeight: '700', marginTop: '6px' }}>
                  {(() => {
                    const nights = Math.ceil((new Date(bookingData.check_out_date) - new Date(bookingData.check_in_date)) / (1000 * 60 * 60 * 24));
                    return `${nights} night${nights !== 1 ? 's' : ''}`;
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Guest Selection */}
          <div className="form-group full-width">
            <label>Select Guest *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={bookingData.guest_id}
                onChange={(e) => setBookingData({ ...bookingData, guest_id: e.target.value })}
              >
                <option value="">Select Guest</option>
                {guests.map(guest => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name} - {guest.phone}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => setIsGuestModalOpen(true)} 
                className="btn-secondary"
                type="button"
              >
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          {/* Check-out Date */}
          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={bookingData.check_out_date}
              onChange={(e) => setBookingData({ ...bookingData, check_out_date: e.target.value })}
              min={bookingData.check_in_date}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            <select
              value={bookingData.status}
              onChange={(e) => setBookingData({ ...bookingData, status: e.target.value })}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Hold">Hold</option>
              <option value="Tentative">Tentative</option>
              <option value="Checked-in">Checked-in</option>
            </select>
          </div>

          {/* Number of Guests */}
          <div className="form-group">
            <label>Adults *</label>
            <input
              type="number"
              min="1"
              value={bookingData.number_of_adults}
              onChange={(e) => setBookingData({ ...bookingData, number_of_adults: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Children</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_children}
              onChange={(e) => setBookingData({ ...bookingData, number_of_children: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Infants</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_infants}
              onChange={(e) => setBookingData({ ...bookingData, number_of_infants: e.target.value })}
            />
          </div>

          {/* Meal Plan */}
          <div className="form-group">
            <label>Meal Plan</label>
            <select
              value={bookingData.meal_plan}
              onChange={(e) => setBookingData({ ...bookingData, meal_plan: e.target.value })}
            >
              <option value="NM">No Meal</option>
              <option value="BO">Breakfast Only</option>
              <option value="HB">Half Board</option>
              <option value="FB">Full Board</option>
            </select>
          </div>

          {/* Special Requests */}
          <div className="form-group full-width">
            <label>Special Requests</label>
            <textarea
              value={bookingData.special_requests}
              onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={() => setIsEditModalOpen(false)} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button onClick={handleUpdateReservation} className="btn-primary">
            <Save size={18} /> Update Reservation
          </button>
        </div>
      </Modal>

      {/* Room Status Change Modal */}
      <Modal
        isOpen={isRoomStatusModalOpen}
        onClose={() => {
          setIsRoomStatusModalOpen(false);
          setSelectedRoomForStatus(null);
        }}
        title="Change Room Status"
        size="small"
      >
        {selectedRoomForStatus && (
          <div>
            <div className={styles.modalInfoBox} style={{ marginBottom: '24px' }}>
              <div className={styles.modalInfoBoxTitle}>
                Room {selectedRoomForStatus.room_number}
              </div>
              <div className={styles.modalInfoBoxText}>
                Floor {selectedRoomForStatus.floor}
              </div>
              <div className={styles.modalInfoBoxText} style={{ marginTop: '8px' }}>
                Current Status: <strong>{selectedRoomForStatus.status}</strong>
              </div>
            </div>

            <div style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '12px'
            }}>
              Select New Status:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => handleSubmitRoomStatus('Available')}
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  background: selectedRoomForStatus.status === 'Available' ? '#f0fdf4' : 'white',
                  border: selectedRoomForStatus.status === 'Available' ? '2px solid #10b981' : '1px solid #d1d5db'
                }}
              >
                <Home size={18} />
                <span>Available</span>
              </button>

              <button
                onClick={() => handleSubmitRoomStatus('Maintenance')}
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  background: selectedRoomForStatus.status === 'Maintenance' ? '#fef3c7' : 'white',
                  border: selectedRoomForStatus.status === 'Maintenance' ? '2px solid #f59e0b' : '1px solid #d1d5db'
                }}
              >
                <RefreshCw size={18} />
                <span>Maintenance</span>
              </button>

              <button
                onClick={() => handleSubmitRoomStatus('Blocked')}
                className="btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '12px 16px',
                  background: selectedRoomForStatus.status === 'Blocked' ? '#fee2e2' : 'white',
                  border: selectedRoomForStatus.status === 'Blocked' ? '2px solid #ef4444' : '1px solid #d1d5db'
                }}
              >
                <Lock size={18} />
                <span>Blocked</span>
              </button>
            </div>

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button 
                onClick={() => {
                  setIsRoomStatusModalOpen(false);
                  setSelectedRoomForStatus(null);
                }} 
                className="btn-secondary"
                style={{ width: '100%' }}
              >
                <X size={18} /> Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ReservationCalendar;