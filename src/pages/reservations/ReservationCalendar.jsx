// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarDays, Users, Home, RefreshCw, X, Save, UserPlus, Lock, Calendar as CalendarIcon, Edit2, XOctagon } from 'lucide-react';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { Modal } from '../../components/common/Modal';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { updateRoomStatus } from '../../lib/supabase';
import { calculateDays } from '../../utils/helpers';
import styles from './ReservationCalendar.module.css';

// Import the new components
import { QuickBookingModal } from '../../components/reservations/QuickBookingModal';
import { AddGuestModal } from '../../components/guests/AddGuestModal';
import { RoomStatusModal } from '../../components/rooms/RoomStatusModal';

const ReservationCalendar = () => {
  const { reservations, fetchReservations, addReservation, updateReservation, cancelReservation } = useReservations();
  const { rooms, roomTypes, fetchRooms } = useRooms();
  const { guests } = useGuests(); // Removed addGuest
  
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
  const [editingGroup, setEditingGroup] = useState(null);
  const [editModalFormData, setEditModalFormData] = useState(null);
  const [editModalRoomDetails, setEditModalRoomDetails] = useState(null);
  
  // Room status modal state
  const [isRoomStatusModalOpen, setIsRoomStatusModalOpen] = useState(false);
  const [selectedRoomForStatus, setSelectedRoomForStatus] = useState(null);
  
  // Removed guestFormData state
  
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

  // Find related reservations that belong to the same booking
  const findRelatedReservations = (reservation) => {
    if (!reservation) return [reservation];
    
    // Find all reservations that match this one (same booking)
    const related = reservations.filter(r => {
      const sameGuest = r.guest_id === reservation.guest_id;
      const sameDates = r.check_in_date === reservation.check_in_date && 
                       r.check_out_date === reservation.check_out_date;
      const sameSource = r.booking_source === reservation.booking_source && 
                        r.agent_id === reservation.agent_id;
      const sameMealPlan = r.meal_plan === reservation.meal_plan;
      
      // Check if created within 30 seconds of each other (same booking session)
      const timeDiff = Math.abs(new Date(r.created_at) - new Date(reservation.created_at));
      const createdTogether = timeDiff < 30000; // 30 seconds
      
      return sameGuest && sameDates && sameSource && sameMealPlan && createdTogether;
    });
    
    return related;
  };

  // Handle Edit Reservation action (single or group)
  const handleEditReservation = () => {
    if (!actionMenu.reservation) return;
    
    const relatedReservations = findRelatedReservations(actionMenu.reservation);
    
    if (relatedReservations.length > 1) {
      // Show option to edit as group or single
      const editAsGroup = window.confirm(
        `This reservation is part of a ${relatedReservations.length}-room booking.\n\n` +
        `Click OK to edit all rooms together.\n` +
        `Click Cancel to edit only this room.`
      );
      
      if (editAsGroup) {
        handleEditGroup(relatedReservations);
      } else {
        handleEditSingle(actionMenu.reservation);
      }
    } else {
      handleEditSingle(actionMenu.reservation);
    }
  };
  
  // Handle editing a single reservation
  const handleEditSingle = (reservation) => {
    setEditingReservation(reservation);
    setEditingGroup(null);
    
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
      meal_plan: reservation.meal_plan || 'NM',
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
    
    setEditModalFormData(formData);
    setEditModalRoomDetails(roomDetails);
    closeActionMenu();
    setIsEditModalOpen(true);
  };
  
  // Handle editing a group of reservations
  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditingReservation(null);
    
    const primaryReservation = group[0];
    
    // Calculate total amount and advance for the group
    const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const totalAdvance = group.reduce((sum, r) => sum + (r.advance_payment || 0), 0);
    
    const formData = {
      booking_source: primaryReservation.booking_source || 'direct',
      agent_id: primaryReservation.agent_id || '',
      direct_source: primaryReservation.direct_source || '',
      guest_id: primaryReservation.guest_id,
      room_type_id: '',
      number_of_rooms: group.length,
      check_in_date: primaryReservation.check_in_date,
      check_out_date: primaryReservation.check_out_date,
      meal_plan: primaryReservation.meal_plan || 'NM',
      total_amount: totalAmount,
      advance_payment: totalAdvance,
      payment_status: primaryReservation.payment_status,
      status: primaryReservation.status,
      special_requests: primaryReservation.special_requests || ''
    };
    
    // Load all room details from the group
    const roomDetails = group.map(reservation => {
      const room = rooms.find(r => r.id === reservation.room_id);
      return {
        room_type_id: room ? room.room_type_id : '',
        room_id: reservation.room_id,
        number_of_adults: reservation.number_of_adults || 1,
        number_of_children: reservation.number_of_children || 0,
        number_of_infants: reservation.number_of_infants || 0
      };
    });
    
    setEditModalFormData(formData);
    setEditModalRoomDetails(roomDetails);
    closeActionMenu();
    setIsEditModalOpen(true);
  };

  // Submit edit reservation
  const handleSubmitEditReservation = async (formData, roomDetails) => {
    try {
      if (editingReservation) {
        // Single reservation edit
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
        alert('Reservation updated successfully!');
      } else if (editingGroup) {
        // Group edit
        const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / editingGroup.length;

        for (let i = 0; i < editingGroup.length; i++) {
          const reservation = editingGroup[i];
          const roomDetail = roomDetails[i];
          
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          const days = calculateDays(formData.check_in_date, formData.check_out_date);
          const roomAmount = roomType ? roomType.base_price * days : 0;
          
          const reservationData = {
            booking_source: formData.booking_source,
            agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
            direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
            guest_id: formData.guest_id,
            room_id: roomDetail.room_id,
            check_in_date: formData.check_in_date,
            check_out_date: formData.check_out_date,
            number_of_adults: parseInt(roomDetail.number_of_adults),
            number_of_children: parseInt(roomDetail.number_of_children),
            number_of_infants: parseInt(roomDetail.number_of_infants),
            number_of_guests: parseInt(roomDetail.number_of_adults) + parseInt(roomDetail.number_of_children) + parseInt(roomDetail.number_of_infants),
            meal_plan: formData.meal_plan,
            total_amount: roomAmount,
            advance_payment: advancePerRoom,
            payment_status: formData.payment_status,
            status: formData.status,
            special_requests: formData.special_requests
          };
          
          await updateReservation(reservation.id, reservationData);
        }
        
        alert(`Successfully updated ${editingGroup.length} reservations!`);
      }
      
      await fetchReservations();
      await fetchRooms();
      
      setIsEditModalOpen(false);
      setEditingReservation(null);
      setEditingGroup(null);
      setEditModalFormData(null);
      setEditModalRoomDetails(null);
    } catch (error) {
      console.error('Error updating reservation:', error);
      alert('Failed to update reservation: ' + error.message);
    }
  };

  // Handle Cancel Reservation action
  const handleCancelReservation = async () => {
    if (!actionMenu.reservation) return;
    
    const relatedReservations = findRelatedReservations(actionMenu.reservation);
    const guestName = actionMenu.reservation.guests?.name || 'Unknown';
    
    let confirmMessage = `Are you sure you want to cancel the reservation for ${guestName}?`;
    
    if (relatedReservations.length > 1) {
      confirmMessage = `This reservation is part of a ${relatedReservations.length}-room booking.\n\n` +
                      `Are you sure you want to cancel ALL ${relatedReservations.length} rooms for ${guestName}?`;
    }
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      // Cancel all related reservations
      for (const reservation of relatedReservations) {
        await cancelReservation(reservation.id);
      }
      
      await fetchReservations();
      await fetchRooms();
      
      const message = relatedReservations.length > 1 
        ? `Successfully cancelled ${relatedReservations.length} reservations!`
        : 'Reservation cancelled successfully!';
      
      alert(message);
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


  // Submit room status change
  // This logic is now inside RoomStatusModal.jsx
  // const handleSubmitRoomStatus = async (newStatus) => { ... };

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
      `${roomCount} room${roomCount !== 1 ? 's' : ''} ÃƒÆ’Ã¢â‚¬â€  ${totalNights} total night${totalNights !== 1 ? 's' : ''}\n\n` +
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
  // This function is now the callback for the AddGuestModal
  const onGuestAdded = (newGuest) => {
    if (newGuest) {
      setBookingData({ ...bookingData, guest_id: newGuest.id });
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
                        {uniqueRooms.length} room{uniqueRooms.length !== 1 ? 's' : ''} Ã— {uniqueDates.length} night{uniqueDates.length !== 1 ? 's' : ''}
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
      <QuickBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => {
          setIsBookingModalOpen(false);
          setPendingBookings([]);
        }}
        onSubmit={handleQuickBooking}
        bookingData={bookingData}
        setBookingData={setBookingData}
        guests={guests}
        rooms={rooms}
        roomTypes={roomTypes}
        pendingBookings={pendingBookings}
        onAddGuestClick={() => setIsGuestModalOpen(true)}
      />

      {/* Quick Add Guest Modal */}
      <AddGuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onGuestAdded={onGuestAdded}
      />

      {/* Edit Reservation Modal */}
      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReservation(null);
          setEditingGroup(null);
          setEditModalFormData(null);
          setEditModalRoomDetails(null);
        }}
        onSubmit={handleSubmitEditReservation}
        editingReservation={editingReservation}
        editingGroup={editingGroup}
        initialFormData={editModalFormData}
        initialRoomDetails={editModalRoomDetails}
      />

      {/* Room Status Change Modal */}
      <RoomStatusModal
        isOpen={isRoomStatusModalOpen}
        onClose={() => {
          setIsRoomStatusModalOpen(false);
          setSelectedRoomForStatus(null);
        }}
        room={selectedRoomForStatus}
      />
    </div>
  );
};

export default ReservationCalendar;