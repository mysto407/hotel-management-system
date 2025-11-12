// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, RefreshCw, X, Lock, Edit2, XOctagon, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { updateRoomStatus } from '../../lib/supabase';
import { calculateDays } from '../../utils/helpers';
import styles from './ReservationCalendar.module.css';

// Import the new components
import { QuickBookingModal } from '../../components/reservations/QuickBookingModal';
import { AddGuestModal } from '../../components/guests/AddGuestModal';
import { AddAgentModal } from '../../components/agents/AddAgentModal';
import { RoomStatusModal } from '../../components/rooms/RoomStatusModal';

// Import shadcn/ui components
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';

const ReservationCalendar = () => {
  const { reservations, fetchReservations, addReservation, updateReservation, cancelReservation, deleteReservation } = useReservations();
  const { rooms, roomTypes, fetchRooms } = useRooms();
  const { guests } = useGuests();
  const { agents } = useAgents();
  
// Set initial start date to 2 days before today
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - 2);
    return today;
  });

  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'confirm',
    variant: 'info',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: null
  });
  
  // Action menu state for reservations
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservationMenuPosition, setReservationMenuPosition] = useState({ x: 0, y: 0 });
  
  // Action menu state for empty cells
  const [actionMenu, setActionMenu] = useState({
    visible: false,
    roomId: null,
    date: null,
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
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [bookingData, setBookingData] = useState({
    booking_source: 'direct',
    agent_id: '',
    direct_source: 'Calendar',
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
  
  // State for pending multi-room bookings
  const [pendingBookings, setPendingBookings] = useState([]);
  
  const containerRef = useRef(null);
  const reservationMenuRef = useRef(null);
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

  // Get reservations for a specific room
  const getReservationsForRoom = (roomId) => {
    return reservations.filter(r => {
      return r.room_id === roomId && 
             (r.status === 'Confirmed' || r.status === 'Checked-in' || r.status === 'Hold');
    }).sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date));
  };

  // Calculate position and width for reservation bar
  const calculateBarPosition = (checkIn, checkOut) => {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const calendarStart = new Date(generateDates[0]);
    
    // The end of the *visible* calendar.
    // generateDates[generateDates.length - 1] is the *last visible day*.
    // We care about the *start* of the *next* day.
    const calendarEndDay = new Date(generateDates[generateDates.length - 1]);
    calendarEndDay.setDate(calendarEndDay.getDate() + 1); // This is 00:00 on the day *after* the last visible day.
    
    // Base calculations in days
    // (checkOutDate - checkInDate) gives the number of nights
    const daysFromStart = (checkInDate - calendarStart) / (1000 * 60 * 60 * 24);
    const totalDays = (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);

    // NEW VISUAL MODEL:
    // Bar starts at (check-in day index + 0.5)
    // Bar width is total nights (totalDays)
    // This makes the bar span from halfway through the check-in day
    // to halfway through the check-out day.
    // e.g., 1st -> 2nd (1 night): daysFromStart = 0, totalDays = 1.
    // Start: 0.5. Width: 1. End: 1.5. (Half 1st to Half 2nd). Correct.
    // e.g., 1st -> 3rd (2 nights): daysFromStart = 0, totalDays = 2.
    // Start: 0.5. Width: 2. End: 2.5. (Half 1st to Half 3rd). Correct.

// This overlap makes adjacent bars meet to close the
    // visual gap created by the slanted clip-path.
    // The overlap (0.2 days) is based on the slant (18px) vs. the cell width (90px).
    const overlap = 0.2; // (18px slant / 90px cell width)
    const barLeftInDays = daysFromStart + 0.5 - (overlap / 2);
    const barWidthInDays = totalDays + overlap;
    const barRightInDays = barLeftInDays + barWidthInDays;
    
    const calendarViewEndInDays = daysToShow;

    // Check if bar is visible at all
    if (barRightInDays <= 0 || barLeftInDays >= calendarViewEndInDays) {
      return null;
    }

    // Now, clip the bar to the view
    let visibleLeft = barLeftInDays;
    let visibleWidth = barWidthInDays;

    // Clip start
    if (visibleLeft < 0) {
      visibleWidth = visibleWidth + visibleLeft; // visibleLeft is negative
      visibleLeft = 0;
    }
    
    // Clip end
    if (visibleLeft + visibleWidth > calendarViewEndInDays) {
      visibleWidth = calendarViewEndInDays - visibleLeft;
    }

    // Keep track of whether the *true* reservation starts
    // before or ends after the current calendar view.
    // This is for the "partial" indicators (slants) if you
    // still use them, though the 0.5 offset handles this visually.
    const trueCheckInIsBefore = checkInDate < calendarStart;
    const trueCheckOutIsAfter = checkOutDate >= calendarEndDay;

    return {
      left: visibleLeft,
      width: visibleWidth,
      isPartialStart: trueCheckInIsBefore,
      isPartialEnd: trueCheckOutIsAfter,
    };
  };

  // Get availability count for each room type on each date
  const getAvailabilityForType = (roomTypeId, date) => {
    const typeRooms = rooms.filter(r => r.room_type_id === roomTypeId);
    const available = typeRooms.filter(room => {
      const roomReservations = getReservationsForRoom(room.id);
      const dateObj = new Date(date);
      
      const isOccupied = roomReservations.some(r => {
        const checkIn = new Date(r.check_in_date);
        const checkOut = new Date(r.check_out_date);
        return dateObj >= checkIn && dateObj < checkOut;
      });
      
      return !isOccupied && room.status === 'Available';
    });
    return { available: available.length, total: typeRooms.length };
  };

  // Get total availability across all rooms for a date
  const getTotalAvailability = (date) => {
    const available = rooms.filter(room => {
      const roomReservations = getReservationsForRoom(room.id);
      const dateObj = new Date(date);
      
      const isOccupied = roomReservations.some(r => {
        const checkIn = new Date(r.check_in_date);
        const checkOut = new Date(r.check_out_date);
        return dateObj >= checkIn && dateObj < checkOut;
      });
      
      return !isOccupied && room.status === 'Available';
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

  // Helper functions for confirm modal
  const showConfirm = (options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        type: 'confirm',
        variant: options.variant || 'info',
        title: options.title || 'Confirm',
        message: options.message || '',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => resolve(true)
      });
    });
  };

  const showAlert = (options) => {
    return new Promise((resolve) => {
      setConfirmModal({
        isOpen: true,
        type: 'alert',
        variant: options.variant || 'info',
        title: options.title || 'Notice',
        message: options.message || '',
        confirmText: options.confirmText || 'OK',
        onConfirm: () => resolve(true)
      });
    });
  };

  const closeConfirmModal = () => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  // Refresh calendar data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (fetchReservations) await fetchReservations();
      if (fetchRooms) await fetchRooms();
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle clicking on a reservation bar
  const handleReservationClick = (e, reservation) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (containerRect) {
      setSelectedReservation(reservation);
      setReservationMenuPosition({
        x: rect.right - containerRect.left + containerRef.current.scrollLeft + 10,
        y: rect.top - containerRect.top + containerRef.current.scrollTop
      });
    }
  };

  // Check if a cell is available (no reservation overlapping)
  const isCellAvailable = (roomId, date) => {
    const roomReservations = getReservationsForRoom(roomId);
    const dateObj = new Date(date);
    
    const isOccupied = roomReservations.some(r => {
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      return dateObj >= checkIn && dateObj < checkOut;
    });
    
    const room = rooms.find(r => r.id === roomId);
    return !isOccupied && room?.status === 'Available';
  };

  // Handle cell click to show action menu
  const handleCellClick = (e, roomId, date) => {
    if (!isCellAvailable(roomId, date)) return;
    if (!containerRef.current) return;

    const cellRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;

    // Position menu at the right edge of the selection bar (1.5 days from cell start)
    // Cell width is 90px, so 1.5 * 90 = 135px from the left edge of the cell
    const cellWidth = 90;
    const selectionOffset = 1.5 * cellWidth; // 0.5 day start + 1.0 day width
    const x = cellRect.left - containerRect.left + scrollLeft + selectionOffset + 10;
    const y = cellRect.top - containerRect.top + scrollTop;
    
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
      selectedCells: [{ roomId, date }],
      position: { x, y }
    });
  };

  // Drag selection handlers for multi-date and multi-room booking
  const handleCellMouseDown = (e, roomId, date) => {
    if (!isCellAvailable(roomId, date)) return;
    
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
    if (!isCellAvailable(roomId, date)) return;
    
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
    
    if (!containerRef.current) return;

    // Find the rightmost selected cell to position the menu at the end of the selection
    const selectedCells = dragSelection.selectedCells;
    const dates = selectedCells.map(cell => cell.date).sort();
    const rightmostDate = dates[dates.length - 1];
    
    // Find a cell with the rightmost date to get its position
    const rightmostCell = document.querySelector(
      `[data-room-id="${selectedCells.find(c => c.date === rightmostDate)?.roomId}"][data-date="${rightmostDate}"]`
    );
    
    let x, y;
    
    if (rightmostCell) {
      const cellRect = rightmostCell.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;
      
      // Position menu at the right edge of the selection bar (1.5 days from rightmost cell start)
      const cellWidth = 90;
      const selectionOffset = 1.5 * cellWidth;
      x = cellRect.left - containerRect.left + scrollLeft + selectionOffset + 10;
      y = cellRect.top - containerRect.top + scrollTop;
    } else {
      // Fallback to current cell position
      const cellRect = e.currentTarget.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const scrollLeft = containerRef.current.scrollLeft;
      const scrollTop = containerRef.current.scrollTop;
      
      const cellWidth = 90;
      const selectionOffset = 1.5 * cellWidth;
      x = cellRect.left - containerRect.left + scrollLeft + selectionOffset + 10;
      y = cellRect.top - containerRect.top + scrollTop;
    }
    
    setActionMenu({
      visible: true,
      roomId: dragSelection.selectedCells.length === 1 ? dragSelection.selectedCells[0].roomId : null,
      date: dragSelection.selectedCells.length === 1 ? dragSelection.selectedCells[0].date : null,
      selectedCells: dragSelection.selectedCells,
      position: { x, y }
    });
    
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

    // Close action menu immediately to prevent overlap with confirm modal
    closeActionMenu();

    const uniqueRoomIds = [...new Set(selectedCells.map(c => c.roomId))];

    const confirmed = await showConfirm({
      variant: 'warning',
      title: 'Block Rooms',
      message: `Are you sure you want to block ${uniqueRoomIds.length} room${uniqueRoomIds.length !== 1 ? 's' : ''}?`,
      confirmText: 'Block',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    try {
      const blockPromises = uniqueRoomIds.map(roomId => 
        updateRoomStatus(roomId, 'Blocked')
      );
      
      await Promise.all(blockPromises);
      await fetchRooms();
      
      await showAlert({
        variant: 'success',
        title: 'Success',
        message: `${uniqueRoomIds.length} room${uniqueRoomIds.length !== 1 ? 's' : ''} blocked successfully`,
        confirmText: 'OK'
      });
    } catch (error) {
      console.error('Error blocking rooms:', error);
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to block rooms: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  // Handle Hold action
  const handleHoldRoom = async () => {
    const selectedCells = actionMenu.selectedCells || [];

    if (selectedCells.length === 0) return;

    // Close action menu immediately to prevent overlap with modals
    closeActionMenu();

    if (selectedCells.length === 1) {
      const cell = selectedCells[0];
      const checkOutDate = new Date(cell.date);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      
      setBookingData({
        booking_source: 'direct',
        agent_id: '',
        direct_source: 'Calendar',
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

      setIsBookingModalOpen(true);
    } else {
      handleMultiCellBooking('Hold');
    }
  };

  // Handle Book action
  const handleBookRoom = () => {
    const selectedCells = actionMenu.selectedCells || [];

    if (selectedCells.length === 0) return;

    // Close action menu immediately to prevent overlap with modals
    closeActionMenu();

    if (selectedCells.length === 1) {
      const cell = selectedCells[0];
      const checkOutDate = new Date(cell.date);
      checkOutDate.setDate(checkOutDate.getDate() + 1);
      
      setBookingData({
        booking_source: 'direct',
        agent_id: '',
        direct_source: 'Calendar',
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

      setIsBookingModalOpen(true);
    } else {
      handleMultiCellBooking('Confirmed');
    }
  };

  // Handle multi-cell booking
  const handleMultiCellBooking = async (status) => {
    const selectedCells = actionMenu.selectedCells || [];

    if (selectedCells.length === 0) return;

    // Close action menu immediately (if not already closed) to prevent overlap with modals
    closeActionMenu();
    
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
    
    const confirmMessage = `Create ${bookingCount} ${status.toLowerCase()} booking${bookingCount !== 1 ? 's' : ''}?\n\n` +
      `${roomCount} room${roomCount !== 1 ? 's' : ''} Ãƒâ€” ${totalNights} total night${totalNights !== 1 ? 's' : ''}\n\n` +
      `You'll enter guest details once, and all bookings will be created with the same guest.`;
    
    const confirmed = await showConfirm({
      variant: 'info',
      title: 'Create Multiple Bookings',
      message: confirmMessage,
      confirmText: 'Continue',
      cancelText: 'Cancel'
    });
    
    if (!confirmed) return;
    
    setPendingBookings(bookings);
    
    const firstBooking = bookings[0];
    
    setBookingData({
      booking_source: 'direct',
      agent_id: '',
      direct_source: 'Calendar',
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

    setIsBookingModalOpen(true);
  };

  // Find related reservations that belong to the same booking
  const findRelatedReservations = (reservation) => {
    if (!reservation) return [reservation];
    
    const related = reservations.filter(r => {
      const sameGuest = r.guest_id === reservation.guest_id;
      const sameDates = r.check_in_date === reservation.check_in_date && 
                       r.check_out_date === reservation.check_out_date;
      const sameSource = r.booking_source === reservation.booking_source && 
                        r.agent_id === reservation.agent_id;
      const sameMealPlan = r.meal_plan === reservation.meal_plan;
      
      const timeDiff = Math.abs(new Date(r.created_at) - new Date(reservation.created_at));
      const createdTogether = timeDiff < 30000;
      
      return sameGuest && sameDates && sameSource && sameMealPlan && createdTogether;
    });
    
    return related;
  };

  // Handle Edit Reservation
  const handleEditReservation = async () => {
    if (!selectedReservation) return;

    // Close reservation menu immediately to prevent overlap with modals
    const reservationToEdit = selectedReservation;
    setSelectedReservation(null);

    const relatedReservations = findRelatedReservations(reservationToEdit);
    
    if (relatedReservations.length > 1) {
      const editAsGroup = await showConfirm({
        variant: 'info',
        title: 'Edit Reservation',
        message: `This reservation is part of a ${relatedReservations.length}-room booking.\n\nClick "Edit All" to edit all rooms together, or "Edit Single" to edit only this room.`,
        confirmText: 'Edit All',
        cancelText: 'Edit Single'
      });
      
      if (editAsGroup) {
        handleEditGroup(relatedReservations);
      } else {
        handleEditSingle(reservationToEdit);
      }
    } else {
      handleEditSingle(reservationToEdit);
    }
  };
  
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
    setIsEditModalOpen(true);
  };
  
  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditingReservation(null);
    
    const primaryReservation = group[0];
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
    setIsEditModalOpen(true);
  };

  const handleSubmitEditReservation = async (formData, roomDetails) => {
    try {
      if (editingReservation) {
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
        
        await showAlert({
          variant: 'success',
          title: 'Success',
          message: 'Reservation updated successfully!',
          confirmText: 'OK'
        });
      } else if (editingGroup) {
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
        
        await showAlert({
          variant: 'success',
          title: 'Success',
          message: `Successfully updated ${editingGroup.length} reservations!`,
          confirmText: 'OK'
        });
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
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to update reservation: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  // Handle Cancel Reservation
  const handleCancelReservation = async () => {
    if (!selectedReservation) return;

    // Close reservation menu immediately to prevent overlap with modals
    const reservationToCancel = selectedReservation;
    setSelectedReservation(null);

    const relatedReservations = findRelatedReservations(reservationToCancel);
    const guestName = reservationToCancel.guests?.name || 'Unknown';
    
    let confirmMessage = `Are you sure you want to cancel the reservation for ${guestName}?`;
    
    if (relatedReservations.length > 1) {
      confirmMessage = `This reservation is part of a ${relatedReservations.length}-room booking.\n\nAre you sure you want to cancel ALL ${relatedReservations.length} rooms for ${guestName}?`;
    }
    
    const confirmed = await showConfirm({
      variant: 'warning',
      title: 'Cancel Reservation',
      message: confirmMessage,
      confirmText: 'Cancel Reservation',
      cancelText: 'Keep Reservation'
    });
    
    if (!confirmed) return;
    
    try {
      for (const reservation of relatedReservations) {
        await cancelReservation(reservation.id);
      }
      
      await fetchReservations();
      await fetchRooms();
      
      const message = relatedReservations.length > 1 
        ? `Successfully cancelled ${relatedReservations.length} reservations!`
        : 'Reservation cancelled successfully!';
      
      await showAlert({
        variant: 'success',
        title: 'Success',
        message: message,
        confirmText: 'OK'
      });
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to cancel reservation: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  // Handle Delete Reservation
  const handleDeleteReservation = async () => {
    if (!selectedReservation) return;

    // Close reservation menu immediately to prevent overlap with modals
    const reservationToDelete = selectedReservation;
    setSelectedReservation(null);

    const relatedReservations = findRelatedReservations(reservationToDelete);
    const guestName = reservationToDelete.guests?.name || 'Unknown';
    
    let confirmMessage = `Ã¢Å¡Â Ã¯Â¸Â WARNING: Permanent Deletion\n\nAre you absolutely sure you want to PERMANENTLY DELETE this reservation?\n\nGuest: ${guestName}\nRoom: ${selectedReservation.rooms?.room_number || 'Unknown'}\nCheck-in: ${selectedReservation.check_in_date}\n\nThis action CANNOT be undone!`;
    
    if (relatedReservations.length > 1) {
      confirmMessage = `Ã¢Å¡Â Ã¯Â¸Â WARNING: Permanent Deletion\n\nThis is part of a ${relatedReservations.length}-room booking.\n\nAre you absolutely sure you want to PERMANENTLY DELETE ALL ${relatedReservations.length} reservations for ${guestName}?\n\nThis action CANNOT be undone!`;
    }
    
    const firstConfirm = await showConfirm({
      variant: 'danger',
      title: 'Permanent Deletion Warning',
      message: confirmMessage,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    
    if (!firstConfirm) return;
    
    const finalConfirmMessage = relatedReservations.length > 1
      ? `Final confirmation: Delete ALL ${relatedReservations.length} reservations permanently?`
      : 'Final confirmation: Delete this reservation permanently?';
    
    const finalConfirm = await showConfirm({
      variant: 'danger',
      title: 'Final Confirmation',
      message: finalConfirmMessage,
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel'
    });
    
    if (!finalConfirm) return;
    
    try {
      for (const reservation of relatedReservations) {
        await deleteReservation(reservation.id);
      }
      
      await fetchReservations();
      await fetchRooms();
      
      const message = relatedReservations.length > 1 
        ? `Successfully deleted ${relatedReservations.length} reservations!`
        : 'Reservation deleted successfully!';
      
      await showAlert({
        variant: 'success',
        title: 'Deleted',
        message: message,
        confirmText: 'OK'
      });
    } catch (error) {
      console.error('Error deleting reservation:', error);
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to delete reservation: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  // Submit quick booking
  const handleQuickBooking = async () => {
    if (!bookingData.guest_id) {
      await showAlert({
        variant: 'warning',
        title: 'Missing Information',
        message: 'Please select a guest',
        confirmText: 'OK'
      });
      return;
    }
    
    if (!bookingData.check_out_date) {
      await showAlert({
        variant: 'warning',
        title: 'Missing Information',
        message: 'Please select check-out date',
        confirmText: 'OK'
      });
      return;
    }

    if (bookingData.booking_source === 'agent' && !bookingData.agent_id) {
      await showAlert({
        variant: 'warning',
        title: 'Missing Information',
        message: 'Please select an agent',
        confirmText: 'OK'
      });
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
        booking_source: bookingData.booking_source,
        agent_id: bookingData.booking_source === 'agent' ? bookingData.agent_id : null,
        direct_source: bookingData.booking_source === 'direct' ? (bookingData.direct_source || 'Calendar') : null,
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
      
      // Handle pending multi-bookings
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
              booking_source: bookingData.booking_source,
              agent_id: bookingData.booking_source === 'agent' ? bookingData.agent_id : null,
              direct_source: bookingData.booking_source === 'direct' ? (bookingData.direct_source || 'Calendar') : null,
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
          await showAlert({
            variant: 'warning',
            title: 'Partial Success',
            message: `Created ${successCount} of ${pendingBookings.length} bookings successfully. ${failCount} booking(s) failed.`,
            confirmText: 'OK'
          });
        } else {
          await showAlert({
            variant: 'success',
            title: 'Success',
            message: `All ${successCount} bookings created successfully!`,
            confirmText: 'OK'
          });
        }
      } else {
        await fetchReservations();
        await showAlert({
          variant: 'success',
          title: 'Success',
          message: 'Booking created successfully!',
          confirmText: 'OK'
        });
        setPendingBookings([]);
      }
      
      setIsBookingModalOpen(false);
      setBookingData({
        booking_source: 'direct',
        agent_id: '',
        direct_source: 'Calendar',
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
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to create booking: ' + error.message,
        confirmText: 'OK'
      });
    }
  };

  // Guest/Agent modal handlers
  const onGuestAdded = (newGuest) => {
    if (newGuest) {
      setBookingData({ ...bookingData, guest_id: newGuest.id });
      setIsGuestModalOpen(false);
    }
  };

  const onAgentAdded = (newAgent) => {
    if (newAgent) {
      setBookingData({ ...bookingData, agent_id: newAgent.id, booking_source: 'agent' });
      setIsAgentModalOpen(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (reservationMenuRef.current && !reservationMenuRef.current.contains(e.target)) {
        setSelectedReservation(null);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        closeActionMenu();
      }
    };

    const handleMouseUp = () => {
      handleGlobalMouseUp();
    };
    
    if (selectedReservation || actionMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [selectedReservation, actionMenu.visible, dragSelection.isSelecting]);

  // Get status color for reservation bar
  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed':
        return '#10b981'; // Green
      case 'Checked-in':
        return '#3b82f6'; // Blue
      case 'Hold':
        return '#f59e0b'; // Orange
      default:
        return '#6b7280'; // Gray
    }
  };

  return (
    <div className={styles.calendarPage}>
      {/* Calendar Grid */}
      <div ref={containerRef} className={styles.calendarContainer}>
        <table className={styles.calendarTable}>
          <thead>
            <tr>
              <th className={styles.calendarFixedColumn}>
                <div className={styles.fixedColumnHeader}>
                  {/* Navigation & Controls Toolbar */}
                  <div className={styles.calendarToolbar}>
                    <div className={styles.calendarNavButtons}>
                      <Button
                        onClick={goToPreviousWeek}
                        variant="outline"
                        size="sm"
                        title="Previous week"
                        className="flex-1"
                      >
                        <ChevronLeft size={16} />
                      </Button>
                      <Button
                        onClick={goToToday}
                        variant="secondary"
                        size="sm"
                        title="Go to today"
                        className="flex-1 bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                      >
                        <Calendar size={16} />
                      </Button>
                      <Button
                        onClick={goToNextWeek}
                        variant="outline"
                        size="sm"
                        title="Next week"
                        className="flex-1"
                      >
                        <ChevronRight size={16} />
                      </Button>
                    </div>

                    <div className={styles.calendarViewControls}>
                      <Input
                        type="date"
                        value={startDate.toISOString().split('T')[0]}
                        onChange={handleDatePickerChange}
                        className="h-8 text-xs"
                      />
                      <Select
                        value={daysToShow.toString()}
                        onValueChange={(value) => setDaysToShow(parseInt(value))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 Days</SelectItem>
                          <SelectItem value="14">14 Days</SelectItem>
                          <SelectItem value="30">30 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      onClick={handleRefresh}
                      variant="outline"
                      size="sm"
                      disabled={isRefreshing}
                      title="Refresh calendar data"
                      className="w-full h-8 text-xs"
                    >
                      <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                    </Button>
                  </div>
                </div>
              </th>
              {generateDates.map(date => {
                const dateObj = new Date(date);
                const isToday = date === new Date().toISOString().split('T')[0];
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                const availability = getTotalAvailability(date);
                const percentage = (availability.total > 0 ? (availability.available / availability.total) * 100 : 0).toFixed(1);
                
                return (
                  <th 
                    key={date} 
                    className={`${styles.calendarDateHeader} ${isToday ? styles.today : ''} ${isWeekend ? styles.weekend : ''}`}
                  >
                    <div className={styles.dateHeaderContent}>
                      <div className={styles.dateDay}>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                      <div className={styles.dateNum}>{dateObj.getDate()}</div>
                      <div className={styles.dateMonth}>{dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                      <div className={styles.dateAvailability}>{percentage}%</div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
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
                      
                      return (
                        <td key={date} className={styles.roomTypeCell}>
                          <div className={styles.roomTypeAvailability}>
                            <span>{availability.available}</span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>

                  {/* Individual Room Rows */}
                  {isExpanded && typeRooms.map(room => {
                    const roomReservations = getReservationsForRoom(room.id);
                    
                    // Calculate selection bars for this room
                    const selectedCellsForRoom = (dragSelection.selectedCells.length > 0 ? dragSelection.selectedCells : actionMenu.selectedCells)
                      .filter(cell => cell.roomId === room.id)
                      .map(cell => cell.date)
                      .sort();
                    
                    // Group consecutive dates into ranges
                    const selectionRanges = [];
                    if (selectedCellsForRoom.length > 0) {
                      let currentRange = [selectedCellsForRoom[0]];
                      
                      for (let i = 1; i < selectedCellsForRoom.length; i++) {
                        const prevDate = new Date(selectedCellsForRoom[i - 1]);
                        const currDate = new Date(selectedCellsForRoom[i]);
                        const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
                        
                        if (dayDiff === 1) {
                          currentRange.push(selectedCellsForRoom[i]);
                        } else {
                          selectionRanges.push({
                            checkIn: currentRange[0],
                            checkOut: new Date(new Date(currentRange[currentRange.length - 1]).getTime() + 86400000).toISOString().split('T')[0]
                          });
                          currentRange = [selectedCellsForRoom[i]];
                        }
                      }
                      
                      if (currentRange.length > 0) {
                        selectionRanges.push({
                          checkIn: currentRange[0],
                          checkOut: new Date(new Date(currentRange[currentRange.length - 1]).getTime() + 86400000).toISOString().split('T')[0]
                        });
                      }
                    }
                    
                    return (
                      <tr key={room.id} className={styles.roomRow}>
                        <td className={`${styles.calendarFixedColumn} ${styles.roomCell}`}>
                          <div className={styles.roomInfo}>
                            <span className={styles.roomNumber}>{room.room_number}</span>
                          </div>
                        </td>
                        {generateDates.map(date => {
                          const isSelected = (dragSelection.selectedCells.length > 0 ? dragSelection.selectedCells : actionMenu.selectedCells).some(
                            cell => cell.roomId === room.id && cell.date === date
                          );
                          const isAvailable = isCellAvailable(room.id, date);
                          // Check if this date is today
                          const isToday = date === new Date().toISOString().split('T')[0];
                          
                          return (
                            <td 
                              key={date} 
                              className={`${styles.calendarCell} ${isToday ? styles.today : ''} ${isSelected ? styles.cellSelected : ''} ${isAvailable ? styles.cellAvailable : ''}`}
                              data-room-id={room.id}
                              data-date={date}
                              onClick={(e) => handleCellClick(e, room.id, date)}
                              onMouseDown={(e) => handleCellMouseDown(e, room.id, date)}
                              onMouseEnter={() => handleCellMouseEnter(room.id, date)}
                              onMouseUp={(e) => handleCellMouseUp(e, room.id, date)}
                            />
                          );
                        })}
                        
                        {/* Reservation Bars */}
                        <div className={styles.reservationBarsContainer}>
                          {/* Render Selection Bars */}
                          {selectionRanges.map((range, index) => {
                            const barPosition = calculateBarPosition(range.checkIn, range.checkOut);
                            
                            if (!barPosition) return null;
                            
                            return (
                              <div
                                key={`selection-${index}`}
                                className={styles.selectionBar}
                                style={{
                                  left: `calc(${(barPosition.left / daysToShow) * 100}% + 1px)`,
                                  width: `calc(${(barPosition.width / daysToShow) * 100}% - 2px)`
                                }}
                              >
                                <div className={styles.reservationBarContent}>
                                  <span className={styles.reservationBarText}>Selected</span>
                                </div>
                              </div>
                            );
                          })}
                          
                          {/* Render Reservation Bars */}
                          {roomReservations.map(reservation => {
                            const barPosition = calculateBarPosition(reservation.check_in_date, reservation.check_out_date);
                            
                            if (!barPosition) return null;
                            
                            const guestName = reservation.guests?.name || 'Unknown Guest';
                            const statusColor = getStatusColor(reservation.status);
                            
                            return (
                              <div
                                key={reservation.id}
                                className={styles.reservationBar}
                                style={{
                                  left: `calc(${(barPosition.left / daysToShow) * 100}% + 1px)`,
                                  width: `calc(${(barPosition.width / daysToShow) * 100}% - 2px)`,
                                  background: statusColor
                                }}
                                onClick={(e) => handleReservationClick(e, reservation)}
                                title={`${guestName} - ${reservation.check_in_date} to ${reservation.check_out_date}`}
                              >
                                <div className={styles.reservationBarContent}>
                                  {reservation.status === 'Hold' && <Lock size={12} />}
                                  <span className={styles.reservationBarText}>{guestName}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </tr>
                    );
                  })}
                </>
              );
            })}
          </tbody>
        </table>
        
        {/* Reservation Action Menu */}
        {selectedReservation && (
          <div
            ref={reservationMenuRef}
            className={styles.actionMenu}
            style={{
              left: `${reservationMenuPosition.x}px`,
              top: `${reservationMenuPosition.y}px`,
            }}
          >
            <div className={styles.actionMenuHeader}>
              <div className={styles.actionMenuHeaderTitle}>
                Room {selectedReservation.rooms?.room_number || ''}
              </div>
              <div className={styles.actionMenuHeaderGuest}>
                Guest: <strong>{selectedReservation.guests?.name || 'Unknown'}</strong>
              </div>
              <div className={styles.actionMenuHeaderDates}>
                {new Date(selectedReservation.check_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' - '}
                {new Date(selectedReservation.check_out_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <div className={styles.actionMenuHeaderStatus}>
                <Badge
                  className={
                    selectedReservation.status === 'Confirmed'
                      ? 'bg-green-100 text-green-700 hover:bg-green-100'
                      : selectedReservation.status === 'Checked-in'
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-100'
                      : selectedReservation.status === 'Hold'
                      ? 'bg-orange-100 text-orange-700 hover:bg-orange-100'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-200'
                  }
                >
                  {selectedReservation.status}
                </Badge>
              </div>
            </div>
            
            <Button
              onClick={handleEditReservation}
              variant="ghost"
              className="w-full justify-start text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Edit2 size={16} />
              Edit Reservation
            </Button>

            <Button
              onClick={handleCancelReservation}
              variant="ghost"
              className="w-full justify-start text-rose-700 hover:text-rose-800 hover:bg-rose-50"
            >
              <XOctagon size={16} />
              Cancel Reservation
            </Button>

            <Button
              onClick={handleDeleteReservation}
              variant="ghost"
              className="w-full justify-start bg-red-900 text-red-50 hover:bg-red-950 hover:text-red-50"
            >
              <Trash2 size={16} />
              Delete Permanently
            </Button>
          </div>
        )}

        {/* Action Menu for Empty Cells */}
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
                const selectedCells = actionMenu.selectedCells || [];
                
                if (selectedCells.length === 1) {
                  const cell = selectedCells[0];
                  const room = rooms.find(r => r.id === cell.roomId);
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
                        {uniqueRooms.length} room{uniqueRooms.length !== 1 ? 's' : ''} Ãƒâ€” {uniqueDates.length} night{uniqueDates.length !== 1 ? 's' : ''}
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
            
            <Button
              onClick={handleBookRoom}
              variant="ghost"
              className="w-full justify-start text-green-700 hover:text-green-800 hover:bg-green-50"
            >
              <CalendarIcon size={16} />
              Book
            </Button>

            <Button
              onClick={handleHoldRoom}
              variant="ghost"
              className="w-full justify-start text-amber-700 hover:text-amber-800 hover:bg-amber-50"
            >
              <Lock size={16} />
              Hold
            </Button>

            <Button
              onClick={handleBlockRoom}
              variant="ghost"
              className="w-full justify-start text-rose-700 hover:text-rose-800 hover:bg-rose-50"
            >
              <X size={16} />
              Block
            </Button>
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
        agents={agents}
        pendingBookings={pendingBookings}
        onAddGuestClick={() => setIsGuestModalOpen(true)}
        onAddAgentClick={() => setIsAgentModalOpen(true)}
      />

      {/* Quick Add Guest Modal */}
      <AddGuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onGuestAdded={onGuestAdded}
      />

      {/* Quick Add Agent Modal */}
      <AddAgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onAgentAdded={onAgentAdded}
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

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        type={confirmModal.type}
        variant={confirmModal.variant}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
      />
    </div>
  );
};

export default ReservationCalendar;