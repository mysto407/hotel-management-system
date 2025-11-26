// src/pages/reservations/ReservationCalendar.jsx
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lock,
  Plus,
  Edit2,
  Trash2,
  X,
  Ban,
  Users,
  ArrowLeftToLine,
  ArrowRightToLine
} from 'lucide-react';
import { format, addDays, startOfDay, isToday, isWeekend, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useMealPlans } from '../../context/MealPlanContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { useConfirm, useAlert } from '@/context/AlertContext';
import { QuickBookingModal } from '../../components/reservations/QuickBookingModal';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { AddGuestModal } from '../../components/guests/AddGuestModal';
import { AddAgentModal } from '../../components/agents/AddAgentModal';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Status colors for reservation bars
const STATUS_COLORS = {
  'Confirmed': 'bg-green-500 hover:bg-green-600',
  'Checked-in': 'bg-blue-500 hover:bg-blue-600',
  'Hold': 'bg-orange-500 hover:bg-orange-600',
  'Tentative': 'bg-yellow-500 hover:bg-yellow-600',
  'Cancelled': 'bg-red-500 hover:bg-red-600',
  'Checked-out': 'bg-gray-400 hover:bg-gray-500',
};

const STATUS_TEXT_COLORS = {
  'Confirmed': 'text-green-500',
  'Checked-in': 'text-blue-500',
  'Hold': 'text-orange-500',
  'Tentative': 'text-yellow-500',
  'Cancelled': 'text-red-500',
  'Checked-out': 'text-gray-400',
};

// Cell width in pixels
const CELL_WIDTH = 100;
const ROOM_COLUMN_WIDTH = 150;

const ReservationCalendar = () => {
  // Contexts
  const { reservations, addReservation, updateReservation, cancelReservation, deleteReservation, fetchReservations } = useReservations();
  const { rooms, roomTypes, updateRoomStatus } = useRooms();
  const { getActivePlans } = useMealPlans();
  const { guests } = useGuests();
  const { agents } = useAgents();
  const confirm = useConfirm();
  const { success: showSuccess, error: showError, warning: showWarning } = useAlert();

  // Calendar state
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [viewDays, setViewDays] = useState(14);
  const [collapsedRoomTypes, setCollapsedRoomTypes] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  // Selection state for drag selection
  const [selectedCells, setSelectedCells] = useState([]);
  const [selectedCellKeys, setSelectedCellKeys] = useState(new Set());

  // Use refs for drag state to avoid async state issues and throttling
  const dragStateRef = useRef({
    isSelecting: false,
    startCell: null,
    currentCell: null,
    lastUpdateKey: null
  });

  // Action menu state
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [actionMenuType, setActionMenuType] = useState(null); // 'empty' or 'reservation'
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [relatedReservations, setRelatedReservations] = useState([]);

  // Modal state
  const [isQuickBookingOpen, setIsQuickBookingOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddGuestOpen, setIsAddGuestOpen] = useState(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [bookingData, setBookingData] = useState({
    guest_id: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0,
    meal_plan: 'EP',
    status: 'Confirmed',
    special_requests: '',
    rate_type_id: ''
  });
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editRoomDetails, setEditRoomDetails] = useState(null);

  const calendarRef = useRef(null);

  // Generate date range for the calendar
  const dateRange = useMemo(() => {
    return Array.from({ length: viewDays }, (_, i) => addDays(startDate, i));
  }, [startDate, viewDays]);

  // Get rooms grouped by room type
  const roomsByType = useMemo(() => {
    const grouped = {};
    roomTypes.forEach(type => {
      grouped[type.id] = rooms.filter(room => room.room_type_id === type.id)
        .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }));
    });
    return grouped;
  }, [rooms, roomTypes]);

  // Ordered list of selectable rooms (for selection calculations)
  const selectableRoomIds = useMemo(() => {
    return rooms
      .filter(r => r.status !== 'Maintenance' && r.status !== 'Blocked')
      .map(r => r.id);
  }, [rooms]);

  // Pre-compute cell availability map for performance
  const cellAvailabilityMap = useMemo(() => {
    const map = new Map();
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    // Build a map of room occupancy by date
    reservations.forEach(res => {
      if (res.status === 'Cancelled' || res.status === 'Checked-out') return;

      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);

      // Only process if overlaps with view range
      if (checkIn >= rangeEnd || checkOut <= rangeStart) return;

      let date = checkIn < rangeStart ? rangeStart : checkIn;
      while (date < checkOut && date < rangeEnd) {
        const key = `${res.room_id}_${format(date, 'yyyy-MM-dd')}`;
        map.set(key, false); // Mark as unavailable
        date = addDays(date, 1);
      }
    });

    return map;
  }, [reservations, startDate, viewDays]);

  // Fast cell availability check using pre-computed map
  const isCellAvailableFast = useCallback((roomId, date) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room || room.status === 'Maintenance' || room.status === 'Blocked') return false;

    const key = `${roomId}_${format(date, 'yyyy-MM-dd')}`;
    return !cellAvailabilityMap.has(key);
  }, [rooms, cellAvailabilityMap]);

  // Get reservations for a specific room within the date range
  const getReservationsForRoom = useCallback((roomId) => {
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    return reservations.filter(res => {
      if (res.room_id !== roomId) return false;
      if (res.status === 'Cancelled') return false;

      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);

      // Check if reservation overlaps with view range
      return checkIn < rangeEnd && checkOut > rangeStart;
    });
  }, [reservations, startDate, viewDays]);

  // Calculate availability percentage for a date
  const getAvailabilityForDate = useCallback((date) => {
    const totalRooms = rooms.filter(r => r.status !== 'Maintenance' && r.status !== 'Blocked').length;
    if (totalRooms === 0) return 100;

    const occupiedCount = reservations.filter(res => {
      if (res.status === 'Cancelled' || res.status === 'Checked-out') return false;
      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);
      return date >= checkIn && date < checkOut;
    }).length;

    return Math.round(((totalRooms - occupiedCount) / totalRooms) * 100);
  }, [rooms, reservations]);

  // Get available room count by type for a date
  const getAvailableCountByType = useCallback((roomTypeId, date) => {
    const typeRooms = rooms.filter(r => r.room_type_id === roomTypeId && r.status !== 'Maintenance' && r.status !== 'Blocked');

    const occupiedRoomIds = new Set(
      reservations
        .filter(res => {
          if (res.status === 'Cancelled' || res.status === 'Checked-out') return false;
          const room = rooms.find(r => r.id === res.room_id);
          if (!room || room.room_type_id !== roomTypeId) return false;
          const checkIn = parseISO(res.check_in_date);
          const checkOut = parseISO(res.check_out_date);
          return date >= checkIn && date < checkOut;
        })
        .map(res => res.room_id)
    );

    return typeRooms.length - occupiedRoomIds.size;
  }, [rooms, reservations]);

  // Navigation handlers
  const goToPreviousWeek = () => setStartDate(prev => addDays(prev, -7));
  const goToNextWeek = () => setStartDate(prev => addDays(prev, 7));
  const goToToday = () => setStartDate(startOfDay(new Date()));
  const goToDate = (dateString) => {
    if (dateString) {
      setStartDate(startOfDay(parseISO(dateString)));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
    showSuccess('Calendar refreshed');
  };

  // Toggle room type collapse
  const toggleRoomType = (roomTypeId) => {
    setCollapsedRoomTypes(prev => ({
      ...prev,
      [roomTypeId]: !prev[roomTypeId]
    }));
  };

  // Optimized selection calculation - returns both cells array and keys Set
  const calculateSelectedCells = useCallback((startCell, endCell) => {
    if (!startCell || !endCell) return { cells: [], keys: new Set() };

    const cells = [];
    const keys = new Set();
    const startDateObj = startCell.date;
    const endDateObj = endCell.date;

    // Get date range
    const minDate = startDateObj <= endDateObj ? startDateObj : endDateObj;
    const maxDate = startDateObj <= endDateObj ? endDateObj : startDateObj;

    // Get room range
    const startRoomIndex = selectableRoomIds.indexOf(startCell.roomId);
    const endRoomIndex = selectableRoomIds.indexOf(endCell.roomId);
    const minRoomIndex = Math.min(startRoomIndex, endRoomIndex);
    const maxRoomIndex = Math.max(startRoomIndex, endRoomIndex);

    // Generate all cells in the selection rectangle
    let currentDate = new Date(minDate);
    while (currentDate <= maxDate) {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      for (let i = minRoomIndex; i <= maxRoomIndex; i++) {
        const roomId = selectableRoomIds[i];
        if (roomId) {
          const key = `${roomId}_${dateStr}`;
          // Use pre-computed map - if key exists, cell is occupied
          if (!cellAvailabilityMap.has(key)) {
            cells.push({ roomId, date: new Date(currentDate), dateStr });
            keys.add(key);
          }
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    return { cells, keys };
  }, [selectableRoomIds, cellAvailabilityMap]);

  // Selection handlers using refs for immediate state access
  const handleCellMouseDown = useCallback((roomId, date, e) => {
    if (!isCellAvailableFast(roomId, date)) return;

    e.preventDefault();
    closeActionMenu();

    const dateStr = format(date, 'yyyy-MM-dd');
    const cell = { roomId, date, dateStr };
    const key = `${roomId}_${dateStr}`;

    // Use ref for immediate access
    dragStateRef.current = {
      isSelecting: true,
      startCell: cell,
      currentCell: cell,
      lastUpdateKey: key
    };

    // Set initial selection
    setSelectedCells([cell]);
    setSelectedCellKeys(new Set([key]));
  }, [isCellAvailableFast]);

  const handleCellMouseEnter = useCallback((roomId, date) => {
    const { isSelecting, startCell, lastUpdateKey } = dragStateRef.current;
    if (!isSelecting || !startCell) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const currentKey = `${roomId}_${dateStr}`;

    // Skip if we're still on the same cell (prevents redundant updates)
    if (currentKey === lastUpdateKey) return;

    dragStateRef.current.lastUpdateKey = currentKey;
    dragStateRef.current.currentCell = { roomId, date, dateStr };

    // Calculate and update selected cells
    const { cells, keys } = calculateSelectedCells(startCell, { roomId, date, dateStr });
    setSelectedCells(cells);
    setSelectedCellKeys(keys);
  }, [calculateSelectedCells]);

  const handleCellMouseUp = useCallback((e) => {
    const { isSelecting, startCell } = dragStateRef.current;

    if (!isSelecting) return;

    // Reset drag state
    dragStateRef.current.isSelecting = false;

    // Get the current selection from state
    // For single click, we need to ensure startCell is used
    const cellsToUse = startCell ? [startCell] : [];

    // Show action menu if we have selected cells
    setSelectedCells(prev => {
      const cells = prev.length > 0 ? prev : cellsToUse;
      if (cells.length > 0) {
        const rect = e.target?.getBoundingClientRect?.() || { left: e.clientX, bottom: e.clientY, width: 0 };
        setActionMenuPosition({
          x: rect.left + (rect.width || 0) / 2,
          y: rect.bottom + 5
        });
        setActionMenuType('empty');
      }
      return cells;
    });
  }, []);

  // Check if cell is selected - O(1) lookup using Set
  const isCellSelected = useCallback((roomId, dateStr) => {
    return selectedCellKeys.has(`${roomId}_${dateStr}`);
  }, [selectedCellKeys]);

  // Reservation click handler
  const handleReservationClick = (reservation, e) => {
    e.stopPropagation();
    closeActionMenu();

    setSelectedReservation(reservation);

    // Find related reservations (same guest, same dates, created within 30 seconds)
    const related = findRelatedReservations(reservation);
    setRelatedReservations(related);

    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenuPosition({ x: rect.left + rect.width / 2, y: rect.bottom + 5 });
    setActionMenuType('reservation');
  };

  // Find related reservations for group handling
  const findRelatedReservations = (reservation) => {
    if (!reservation) return [];

    const createdAt = new Date(reservation.created_at);
    const thirtySecondsMs = 30 * 1000;

    return reservations.filter(res => {
      if (res.id === reservation.id) return false;
      if (res.status === 'Cancelled') return false;

      // Same guest
      if (res.guest_id !== reservation.guest_id) return false;

      // Same dates
      if (res.check_in_date !== reservation.check_in_date) return false;
      if (res.check_out_date !== reservation.check_out_date) return false;

      // Same booking source
      if (res.booking_source !== reservation.booking_source) return false;
      if (res.agent_id !== reservation.agent_id) return false;

      // Same meal plan
      if (res.meal_plan !== reservation.meal_plan) return false;

      // Created within 30 seconds
      const resCreatedAt = new Date(res.created_at);
      const timeDiff = Math.abs(createdAt - resCreatedAt);
      if (timeDiff > thirtySecondsMs) return false;

      return true;
    });
  };

  // Close action menu
  const closeActionMenu = () => {
    setActionMenuPosition(null);
    setActionMenuType(null);
    setSelectedReservation(null);
    setRelatedReservations([]);
    setSelectedCells([]);
    setSelectedCellKeys(new Set());
  };

  // Click outside to close action menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuPosition && !e.target.closest('.action-menu')) {
        closeActionMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [actionMenuPosition]);

  // Booking actions
  const handleBookAction = (status = 'Confirmed') => {
    if (selectedCells.length === 0) return;

    // Group cells by room to create booking entries
    const bookingsByRoom = {};
    selectedCells.forEach(cell => {
      if (!bookingsByRoom[cell.roomId]) {
        bookingsByRoom[cell.roomId] = [];
      }
      bookingsByRoom[cell.roomId].push(cell.date);
    });

    // Create pending bookings
    const pending = Object.entries(bookingsByRoom).map(([roomId, dates]) => {
      dates.sort((a, b) => a - b);
      return {
        roomId,
        checkIn: dates[0],
        checkOut: addDays(dates[dates.length - 1], 1)
      };
    });

    setPendingBookings(pending);

    // Set up booking data for the first room
    const firstBooking = pending[0];
    const room = rooms.find(r => r.id === firstBooking.roomId);

    setBookingData({
      guest_id: '',
      room_id: firstBooking.roomId,
      check_in_date: format(firstBooking.checkIn, 'yyyy-MM-dd'),
      check_out_date: format(firstBooking.checkOut, 'yyyy-MM-dd'),
      booking_source: 'direct',
      agent_id: '',
      direct_source: '',
      number_of_adults: 1,
      number_of_children: 0,
      number_of_infants: 0,
      meal_plan: getActivePlans()[0]?.code || 'EP',
      status: status,
      special_requests: '',
      rate_type_id: ''
    });

    closeActionMenu();
    setIsQuickBookingOpen(true);
  };

  const handleBlockAction = async () => {
    if (selectedCells.length === 0) return;

    const roomIds = [...new Set(selectedCells.map(c => c.roomId))];

    const confirmed = await confirm({
      title: 'Block Rooms',
      message: `Are you sure you want to block ${roomIds.length} room(s)?`,
      confirmText: 'Block',
      variant: 'warning'
    });

    if (confirmed) {
      for (const roomId of roomIds) {
        await updateRoomStatus(roomId, 'Blocked');
      }
      showSuccess(`${roomIds.length} room(s) blocked`);
      closeActionMenu();
    }
  };

  // Submit booking
  const handleSubmitBooking = async () => {
    if (!bookingData.guest_id) {
      showWarning('Please select a guest');
      return;
    }

    try {
      for (let i = 0; i < pendingBookings.length; i++) {
        const booking = pendingBookings[i];
        const room = rooms.find(r => r.id === booking.roomId);

        const reservationData = {
          guest_id: bookingData.guest_id,
          room_id: booking.roomId,
          check_in_date: format(booking.checkIn, 'yyyy-MM-dd'),
          check_out_date: format(booking.checkOut, 'yyyy-MM-dd'),
          booking_source: bookingData.booking_source,
          agent_id: bookingData.booking_source === 'agent' ? bookingData.agent_id : null,
          direct_source: bookingData.booking_source === 'direct' ? bookingData.direct_source : null,
          number_of_adults: parseInt(bookingData.number_of_adults) || 1,
          number_of_children: parseInt(bookingData.number_of_children) || 0,
          number_of_infants: parseInt(bookingData.number_of_infants) || 0,
          meal_plan: bookingData.meal_plan,
          status: bookingData.status,
          special_requests: pendingBookings.length > 1
            ? `Multi-room booking (${i + 1} of ${pendingBookings.length}). ${bookingData.special_requests || ''}`
            : bookingData.special_requests,
          rate_type_id: bookingData.rate_type_id || null
        };

        await addReservation(reservationData);
      }

      showSuccess(`${pendingBookings.length} booking(s) created successfully`);
      setIsQuickBookingOpen(false);
      setPendingBookings([]);
      setBookingData({
        guest_id: '',
        room_id: '',
        check_in_date: '',
        check_out_date: '',
        booking_source: 'direct',
        agent_id: '',
        direct_source: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0,
        meal_plan: 'EP',
        status: 'Confirmed',
        special_requests: '',
        rate_type_id: ''
      });
    } catch (error) {
      showError('Failed to create booking: ' + error.message);
    }
  };

  // Reservation actions
  const handleEditReservation = (editAll = false) => {
    if (!selectedReservation) return;

    const reservationsToEdit = editAll && relatedReservations.length > 0
      ? [selectedReservation, ...relatedReservations]
      : [selectedReservation];

    if (reservationsToEdit.length > 1) {
      setEditingGroup(reservationsToEdit);
      setEditingReservation(null);
    } else {
      setEditingReservation(selectedReservation);
      setEditingGroup(null);
    }

    // Prepare form data
    const firstRes = reservationsToEdit[0];
    setEditFormData({
      booking_source: firstRes.booking_source || 'direct',
      agent_id: firstRes.agent_id || '',
      direct_source: firstRes.direct_source || '',
      guest_id: firstRes.guest_id,
      room_type_id: rooms.find(r => r.id === firstRes.room_id)?.room_type_id || '',
      number_of_rooms: reservationsToEdit.length,
      check_in_date: firstRes.check_in_date,
      check_out_date: firstRes.check_out_date,
      meal_plan: firstRes.meal_plan || 'EP',
      total_amount: firstRes.total_amount || 0,
      advance_payment: firstRes.advance_payment || 0,
      payment_status: firstRes.payment_status || 'Pending',
      status: firstRes.status,
      special_requests: firstRes.special_requests || ''
    });

    setEditRoomDetails(reservationsToEdit.map(res => ({
      room_type_id: rooms.find(r => r.id === res.room_id)?.room_type_id || '',
      room_id: res.room_id,
      number_of_adults: res.number_of_adults || 1,
      number_of_children: res.number_of_children || 0,
      number_of_infants: res.number_of_infants || 0
    })));

    closeActionMenu();
    setIsEditModalOpen(true);
  };

  const handleCancelReservation = async (cancelAll = false) => {
    if (!selectedReservation) return;

    const reservationsToCancel = cancelAll && relatedReservations.length > 0
      ? [selectedReservation, ...relatedReservations]
      : [selectedReservation];

    const confirmed = await confirm({
      title: 'Cancel Reservation',
      message: `Are you sure you want to cancel ${reservationsToCancel.length} reservation(s)?`,
      confirmText: 'Cancel Reservation',
      variant: 'warning'
    });

    if (confirmed) {
      for (const res of reservationsToCancel) {
        await cancelReservation(res.id);
      }
      showSuccess(`${reservationsToCancel.length} reservation(s) cancelled`);
      closeActionMenu();
    }
  };

  const handleDeleteReservation = async (deleteAll = false) => {
    if (!selectedReservation) return;

    const reservationsToDelete = deleteAll && relatedReservations.length > 0
      ? [selectedReservation, ...relatedReservations]
      : [selectedReservation];

    // First confirmation
    const firstConfirm = await confirm({
      title: 'Delete Reservation',
      message: `Are you sure you want to permanently delete ${reservationsToDelete.length} reservation(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (!firstConfirm) return;

    // Second confirmation for safety
    const secondConfirm = await confirm({
      title: 'Confirm Deletion',
      message: `This will permanently remove the reservation(s) from the database. Are you absolutely sure?`,
      confirmText: 'Yes, Delete Permanently',
      variant: 'danger'
    });

    if (secondConfirm) {
      for (const res of reservationsToDelete) {
        await deleteReservation(res.id);
      }
      showSuccess(`${reservationsToDelete.length} reservation(s) deleted`);
      closeActionMenu();
    }
  };

  // Handle edit modal submit
  const handleEditSubmit = async (formData, roomDetails) => {
    try {
      if (editingGroup) {
        // Update all reservations in the group
        for (let i = 0; i < editingGroup.length; i++) {
          const res = editingGroup[i];
          const roomDetail = roomDetails[i];

          await updateReservation(res.id, {
            guest_id: formData.guest_id,
            room_id: roomDetail.room_id,
            check_in_date: formData.check_in_date,
            check_out_date: formData.check_out_date,
            booking_source: formData.booking_source,
            agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
            direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
            number_of_adults: parseInt(roomDetail.number_of_adults) || 1,
            number_of_children: parseInt(roomDetail.number_of_children) || 0,
            number_of_infants: parseInt(roomDetail.number_of_infants) || 0,
            meal_plan: formData.meal_plan,
            status: formData.status,
            special_requests: formData.special_requests,
            total_amount: formData.total_amount,
            advance_payment: formData.advance_payment,
            payment_status: formData.payment_status
          });
        }
        showSuccess(`${editingGroup.length} reservations updated`);
      } else if (editingReservation) {
        const roomDetail = roomDetails[0];
        await updateReservation(editingReservation.id, {
          guest_id: formData.guest_id,
          room_id: roomDetail.room_id,
          check_in_date: formData.check_in_date,
          check_out_date: formData.check_out_date,
          booking_source: formData.booking_source,
          agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
          direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
          number_of_adults: parseInt(roomDetail.number_of_adults) || 1,
          number_of_children: parseInt(roomDetail.number_of_children) || 0,
          number_of_infants: parseInt(roomDetail.number_of_infants) || 0,
          meal_plan: formData.meal_plan,
          status: formData.status,
          special_requests: formData.special_requests,
          total_amount: formData.total_amount,
          advance_payment: formData.advance_payment,
          payment_status: formData.payment_status
        });
        showSuccess('Reservation updated');
      }

      setIsEditModalOpen(false);
      setEditingReservation(null);
      setEditingGroup(null);
    } catch (error) {
      showError('Failed to update reservation: ' + error.message);
    }
  };

  // Guest/Agent modal handlers
  const handleGuestAdded = (newGuest) => {
    setBookingData(prev => ({ ...prev, guest_id: newGuest.id }));
    setIsAddGuestOpen(false);
  };

  const handleAgentAdded = (newAgent) => {
    setBookingData(prev => ({ ...prev, agent_id: newAgent.id }));
    setIsAddAgentOpen(false);
  };

  // Render reservation bar
  const renderReservationBar = (reservation, roomId) => {
    const checkIn = parseISO(reservation.check_in_date);
    const checkOut = parseISO(reservation.check_out_date);
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    // Calculate visible portion
    const visibleStart = checkIn < rangeStart ? rangeStart : checkIn;
    const visibleEnd = checkOut > rangeEnd ? rangeEnd : checkOut;

    // Calculate position and width
    const startOffset = differenceInDays(visibleStart, rangeStart);
    const daySpan = differenceInDays(visibleEnd, visibleStart);

    if (daySpan <= 0) return null;

    const left = startOffset * CELL_WIDTH;
    const width = daySpan * CELL_WIDTH - 4; // -4 for margin

    const extendsLeft = checkIn < rangeStart;
    const extendsRight = checkOut > rangeEnd;

    const guest = guests.find(g => g.id === reservation.guest_id);
    const guestName = guest?.name || 'Unknown Guest';

    return (
      <TooltipProvider key={reservation.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute top-1 h-8 rounded-md cursor-pointer flex items-center px-2 text-white text-xs font-medium shadow-sm transition-all z-10",
                STATUS_COLORS[reservation.status] || 'bg-gray-500',
                extendsLeft && "rounded-l-none",
                extendsRight && "rounded-r-none"
              )}
              style={{
                left: `${left + 2}px`,
                width: `${width}px`,
              }}
              onClick={(e) => handleReservationClick(reservation, e)}
            >
              {extendsLeft && (
                <ArrowLeftToLine className="h-3 w-3 mr-1 flex-shrink-0" />
              )}
              <span className="truncate flex-1">
                {reservation.status === 'Hold' && <Lock className="h-3 w-3 inline mr-1" />}
                {guestName}
              </span>
              {extendsRight && (
                <ArrowRightToLine className="h-3 w-3 ml-1 flex-shrink-0" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">{guestName}</p>
              <p className="text-xs">
                {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')}
              </p>
              <Badge className={cn("text-xs", STATUS_COLORS[reservation.status])}>
                {reservation.status}
              </Badge>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header / Navigation */}
      <div className="flex-shrink-0 p-4 border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={goToNextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Today
            </Button>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => goToDate(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-xl font-semibold">
              {format(startDate, 'MMMM yyyy')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {format(startDate, 'MMM d')} - {format(addDays(startDate, viewDays - 1), 'MMM d, yyyy')}
            </p>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-2">
            <Select value={String(viewDays)} onValueChange={(v) => setViewDays(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 Days</SelectItem>
                <SelectItem value="14">14 Days</SelectItem>
                <SelectItem value="30">30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div
        ref={calendarRef}
        className="flex-1 overflow-auto relative"
        onMouseUp={handleCellMouseUp}
        onMouseLeave={() => {
          if (isSelecting) {
            handleCellMouseUp({ target: document.body });
          }
        }}
      >
        <div className="inline-block min-w-full">
          {/* Header Row - Dates */}
          <div className="flex sticky top-0 z-20 bg-card border-b">
            {/* Room Column Header */}
            <div
              className="flex-shrink-0 p-2 border-r bg-card font-semibold text-sm sticky left-0 z-30"
              style={{ width: ROOM_COLUMN_WIDTH }}
            >
              Rooms
            </div>

            {/* Date Headers */}
            {dateRange.map((date, idx) => {
              const availability = getAvailabilityForDate(date);
              return (
                <div
                  key={idx}
                  className={cn(
                    "flex-shrink-0 p-2 border-r text-center",
                    isToday(date) && "bg-blue-50 dark:bg-blue-950",
                    isWeekend(date) && "bg-muted/50"
                  )}
                  style={{ width: CELL_WIDTH }}
                >
                  <div className="text-xs text-muted-foreground">
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    isToday(date) && "text-blue-600 dark:text-blue-400"
                  )}>
                    {format(date, 'd')}
                  </div>
                  <div className={cn(
                    "text-xs",
                    availability > 50 ? "text-green-600" : availability > 20 ? "text-yellow-600" : "text-red-600"
                  )}>
                    {availability}%
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room Type Sections */}
          {roomTypes.map(roomType => {
            const typeRooms = roomsByType[roomType.id] || [];
            const isCollapsed = collapsedRoomTypes[roomType.id];

            return (
              <div key={roomType.id}>
                {/* Room Type Header */}
                <div
                  className="flex sticky left-0 z-10 bg-muted/70 border-b cursor-pointer hover:bg-muted"
                  onClick={() => toggleRoomType(roomType.id)}
                >
                  <div
                    className="flex-shrink-0 p-2 border-r flex items-center gap-2 sticky left-0 z-20 bg-muted/70"
                    style={{ width: ROOM_COLUMN_WIDTH }}
                  >
                    {isCollapsed ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="font-semibold text-sm">{roomType.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {typeRooms.length}
                    </Badge>
                  </div>

                  {/* Availability per date for this room type */}
                  {dateRange.map((date, idx) => {
                    const available = getAvailableCountByType(roomType.id, date);
                    return (
                      <div
                        key={idx}
                        className={cn(
                          "flex-shrink-0 p-2 border-r text-center text-xs",
                          isToday(date) && "bg-blue-50/50 dark:bg-blue-950/50",
                          isWeekend(date) && "bg-muted/30"
                        )}
                        style={{ width: CELL_WIDTH }}
                      >
                        <span className={cn(
                          available > 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {available} avail
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Room Rows */}
                {!isCollapsed && typeRooms.map(room => {
                  const roomReservations = getReservationsForRoom(room.id);
                  const isBlocked = room.status === 'Blocked' || room.status === 'Maintenance';

                  return (
                    <div key={room.id} className="flex border-b relative">
                      {/* Room Number */}
                      <div
                        className={cn(
                          "flex-shrink-0 p-2 border-r flex items-center gap-2 sticky left-0 z-10 bg-card",
                          isBlocked && "bg-red-50 dark:bg-red-950/30"
                        )}
                        style={{ width: ROOM_COLUMN_WIDTH }}
                      >
                        <span className="font-medium text-sm">
                          {room.room_number}
                        </span>
                        {isBlocked && (
                          <Badge variant="destructive" className="text-xs">
                            {room.status}
                          </Badge>
                        )}
                      </div>

                      {/* Date Cells Container */}
                      <div className="relative flex" style={{ height: 40 }}>
                        {dateRange.map((date, idx) => {
                          const dateStr = format(date, 'yyyy-MM-dd');
                          const available = isCellAvailableFast(room.id, date);
                          const selected = isCellSelected(room.id, dateStr);

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-shrink-0 border-r",
                                isToday(date) && "bg-blue-50/30 dark:bg-blue-950/30",
                                isWeekend(date) && "bg-muted/20",
                                available && !isBlocked && "cursor-pointer hover:bg-accent",
                                selected && "bg-blue-200 dark:bg-blue-800",
                                isBlocked && "bg-red-50/50 dark:bg-red-950/20 cursor-not-allowed"
                              )}
                              style={{ width: CELL_WIDTH, height: '100%' }}
                              onMouseDown={(e) => handleCellMouseDown(room.id, date, e)}
                              onMouseEnter={() => handleCellMouseEnter(room.id, date)}
                            />
                          );
                        })}

                        {/* Reservation Bars */}
                        {roomReservations.map(res => renderReservationBar(res, room.id))}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selection Indicator */}
      {selectedCells.length > 0 && !actionMenuPosition && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-card border rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {[...new Set(selectedCells.map(c => c.roomId))].length} room(s)
            </Badge>
            <Badge variant="secondary">
              {(() => {
                const dates = selectedCells.map(c => c.date.getTime());
                const uniqueDates = [...new Set(dates)];
                return uniqueDates.length;
              })()} night(s)
            </Badge>
            <span className="text-sm text-muted-foreground">Selected</span>
          </div>
        </div>
      )}

      {/* Action Menu */}
      {actionMenuPosition && (
        <div
          className="action-menu fixed z-50 bg-card border rounded-lg shadow-xl p-2 min-w-48"
          style={{
            left: Math.min(actionMenuPosition.x, window.innerWidth - 200),
            top: Math.min(actionMenuPosition.y, window.innerHeight - 300)
          }}
        >
          {actionMenuType === 'empty' && (
            <>
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b mb-1">
                {selectedCells.length > 1
                  ? `${[...new Set(selectedCells.map(c => c.roomId))].length} room(s) × ${[...new Set(selectedCells.map(c => c.date.getTime()))].length} night(s)`
                  : 'Quick Actions'
                }
              </div>
              <button
                className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                onClick={() => handleBookAction('Confirmed')}
              >
                <Plus className="h-4 w-4 text-green-500" />
                Book
              </button>
              <button
                className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                onClick={() => handleBookAction('Hold')}
              >
                <Lock className="h-4 w-4 text-orange-500" />
                Hold
              </button>
              <button
                className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                onClick={handleBlockAction}
              >
                <Ban className="h-4 w-4 text-red-500" />
                Block
              </button>
              <div className="border-t mt-1 pt-1">
                <button
                  className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-muted-foreground"
                  onClick={closeActionMenu}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
              </div>
            </>
          )}

          {actionMenuType === 'reservation' && selectedReservation && (
            <>
              <div className="px-2 py-1.5 border-b mb-1">
                <p className="text-sm font-semibold">
                  {guests.find(g => g.id === selectedReservation.guest_id)?.name || 'Guest'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(selectedReservation.check_in_date), 'MMM d')} - {format(parseISO(selectedReservation.check_out_date), 'MMM d')}
                </p>
                <Badge className={cn("text-xs mt-1", STATUS_COLORS[selectedReservation.status])}>
                  {selectedReservation.status}
                </Badge>
                {relatedReservations.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1">
                    <Users className="h-3 w-3 inline mr-1" />
                    Group booking ({relatedReservations.length + 1} rooms)
                  </p>
                )}
              </div>

              {relatedReservations.length > 0 ? (
                <>
                  <div className="text-xs text-muted-foreground px-2 py-1">Edit</div>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => handleEditReservation(true)}
                  >
                    <Users className="h-4 w-4 text-blue-500" />
                    Edit All ({relatedReservations.length + 1})
                  </button>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => handleEditReservation(false)}
                  >
                    <Edit2 className="h-4 w-4 text-blue-500" />
                    Edit Single
                  </button>
                  <div className="border-t my-1" />
                  <div className="text-xs text-muted-foreground px-2 py-1">Cancel</div>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-orange-600"
                    onClick={() => handleCancelReservation(true)}
                  >
                    <X className="h-4 w-4" />
                    Cancel All ({relatedReservations.length + 1})
                  </button>
                  <div className="border-t my-1" />
                  <div className="text-xs text-muted-foreground px-2 py-1">Delete</div>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-red-600"
                    onClick={() => handleDeleteReservation(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete All ({relatedReservations.length + 1})
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => handleEditReservation(false)}
                  >
                    <Edit2 className="h-4 w-4 text-blue-500" />
                    Edit Reservation
                  </button>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-orange-600"
                    onClick={() => handleCancelReservation(false)}
                  >
                    <X className="h-4 w-4" />
                    Cancel Reservation
                  </button>
                  <div className="border-t my-1" />
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-red-600"
                    onClick={() => handleDeleteReservation(false)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Permanently
                  </button>
                </>
              )}

              <div className="border-t mt-1 pt-1">
                <button
                  className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-muted-foreground"
                  onClick={closeActionMenu}
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <QuickBookingModal
        isOpen={isQuickBookingOpen}
        onClose={() => {
          setIsQuickBookingOpen(false);
          setPendingBookings([]);
        }}
        onSubmit={handleSubmitBooking}
        bookingData={bookingData}
        setBookingData={setBookingData}
        guests={guests}
        rooms={rooms}
        roomTypes={roomTypes}
        agents={agents}
        pendingBookings={pendingBookings}
        onAddGuestClick={() => setIsAddGuestOpen(true)}
        onAddAgentClick={() => setIsAddAgentOpen(true)}
      />

      <EditBookingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingReservation(null);
          setEditingGroup(null);
        }}
        onSubmit={handleEditSubmit}
        editingReservation={editingReservation}
        editingGroup={editingGroup}
        initialFormData={editFormData}
        initialRoomDetails={editRoomDetails}
      />

      <AddGuestModal
        isOpen={isAddGuestOpen}
        onClose={() => setIsAddGuestOpen(false)}
        onGuestAdded={handleGuestAdded}
      />

      <AddAgentModal
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onAgentAdded={handleAgentAdded}
      />
    </div>
  );
};

export default ReservationCalendar;
