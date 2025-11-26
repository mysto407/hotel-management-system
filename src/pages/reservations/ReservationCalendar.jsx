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
  ArrowRightToLine,
  LogIn,
  LogOut,
  Search,
  Filter,
  XCircle,
  ArrowLeftRight,
  LayoutGrid,
  List,
  Wrench
} from 'lucide-react';
import { format, addDays, startOfDay, isToday, isWeekend, differenceInDays, parseISO } from 'date-fns';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useConfirm, useAlert } from '@/context/AlertContext';
import { useReservationFlow } from '../../context/ReservationFlowContext';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import RoomBlockingModal from '../../components/rooms/RoomBlockingModal';
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

const ReservationCalendar = ({ onNavigate }) => {
  // Contexts
  const { reservations, updateReservation, cancelReservation, deleteReservation, fetchReservations, checkIn, checkOut } = useReservations();
  const { rooms, roomTypes, blockings } = useRooms();
  const { guests } = useGuests();
  const confirm = useConfirm();
  const { success: showSuccess, error: showError } = useAlert();
  const { resetFlow, setFilters, addRoom, assignRoom } = useReservationFlow();

  // Calendar state
  const [startDate, setStartDate] = useState(() => startOfDay(new Date()));
  const [viewDays, setViewDays] = useState(14);
  const [collapsedRoomTypes, setCollapsedRoomTypes] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('detailed'); // 'detailed' | 'overview'

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Drag-and-drop state for moving reservations
  const [draggedReservation, setDraggedReservation] = useState(null);
  const [dragOverCell, setDragOverCell] = useState(null); // { roomId, date }

  // Resize state for extending/shortening reservations
  const [resizeState, setResizeState] = useState(null); // { reservation, edge: 'left'|'right', startX, originalDate }

  // Room swap state
  const [swapMode, setSwapMode] = useState(null); // { reservationA: object }

  // Selection state for drag selection
  const [selectedCells, setSelectedCells] = useState([]);

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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [editFormData, setEditFormData] = useState(null);
  const [editRoomDetails, setEditRoomDetails] = useState(null);

  // Blocking modal state
  const [isBlockingModalOpen, setIsBlockingModalOpen] = useState(false);
  const [blockingModalRoom, setBlockingModalRoom] = useState(null);
  const [blockingModalStartDate, setBlockingModalStartDate] = useState(null);
  const [blockingModalEndDate, setBlockingModalEndDate] = useState(null);
  const [editingBlocking, setEditingBlocking] = useState(null);

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

    // Build a map of room occupancy by date from reservations
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

    // Also mark blocked dates as unavailable
    if (blockings) {
      blockings.forEach(blocking => {
        const blockStart = parseISO(blocking.start_date);
        const blockEnd = parseISO(blocking.end_date);

        // Only process if overlaps with view range
        if (blockStart >= rangeEnd || blockEnd <= rangeStart) return;

        let date = blockStart < rangeStart ? rangeStart : blockStart;
        while (date < blockEnd && date < rangeEnd) {
          const key = `${blocking.room_id}_${format(date, 'yyyy-MM-dd')}`;
          map.set(key, false); // Mark as unavailable
          date = addDays(date, 1);
        }
      });
    }

    return map;
  }, [reservations, blockings, startDate, viewDays]);

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

  // Get blockings for a specific room within the date range
  const getBlockingsForRoom = useCallback((roomId) => {
    if (!blockings) return [];
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    return blockings.filter(blocking => {
      if (blocking.room_id !== roomId) return false;

      const blockStart = parseISO(blocking.start_date);
      const blockEnd = parseISO(blocking.end_date);

      // Check if blocking overlaps with view range
      return blockStart < rangeEnd && blockEnd > rangeStart;
    });
  }, [blockings, startDate, viewDays]);

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

  // Check if any filters are active
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || roomTypeFilter !== 'all';

  // Check if a reservation matches the current filters
  const reservationMatchesFilters = useCallback((reservation) => {
    // Status filter
    if (statusFilter !== 'all' && reservation.status !== statusFilter) {
      return false;
    }

    // Room type filter
    if (roomTypeFilter !== 'all') {
      const room = rooms.find(r => r.id === reservation.room_id);
      if (!room || room.room_type_id !== roomTypeFilter) {
        return false;
      }
    }

    // Search query (guest name)
    if (searchQuery) {
      const guest = guests.find(g => g.id === reservation.guest_id);
      const guestName = guest?.name?.toLowerCase() || '';
      if (!guestName.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    return true;
  }, [statusFilter, roomTypeFilter, searchQuery, rooms, guests]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setRoomTypeFilter('all');
  };

  // Check if a reservation can be moved to a specific room/date range
  const canMoveReservation = useCallback((reservation, targetRoomId, targetStartDate) => {
    const nights = differenceInDays(parseISO(reservation.check_out_date), parseISO(reservation.check_in_date));
    const targetEndDate = addDays(targetStartDate, nights);

    // Check if target room exists and is not blocked
    const targetRoom = rooms.find(r => r.id === targetRoomId);
    if (!targetRoom || targetRoom.status === 'Maintenance' || targetRoom.status === 'Blocked') {
      return false;
    }

    // Check for overlapping reservations (excluding the one being moved)
    const hasConflict = reservations.some(res => {
      if (res.id === reservation.id) return false;
      if (res.room_id !== targetRoomId) return false;
      if (res.status === 'Cancelled' || res.status === 'Checked-out') return false;

      const resStart = parseISO(res.check_in_date);
      const resEnd = parseISO(res.check_out_date);

      // Check overlap: starts before other ends AND ends after other starts
      return targetStartDate < resEnd && targetEndDate > resStart;
    });

    return !hasConflict;
  }, [rooms, reservations]);

  // Drag-and-drop handlers for moving reservations
  const handleReservationDragStart = useCallback((e, reservation) => {
    e.stopPropagation();
    setDraggedReservation(reservation);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', reservation.id);
    // Make the drag image semi-transparent
    if (e.target) {
      e.target.style.opacity = '0.5';
    }
  }, []);

  const handleReservationDragEnd = useCallback((e) => {
    if (e.target) {
      e.target.style.opacity = '1';
    }
    setDraggedReservation(null);
    setDragOverCell(null);
  }, []);

  const handleCellDragOver = useCallback((e, roomId, date) => {
    e.preventDefault();
    if (!draggedReservation) return;

    const canMove = canMoveReservation(draggedReservation, roomId, date);
    e.dataTransfer.dropEffect = canMove ? 'move' : 'none';
    setDragOverCell({ roomId, date, canDrop: canMove });
  }, [draggedReservation, canMoveReservation]);

  const handleCellDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  const handleCellDrop = useCallback(async (e, targetRoomId, targetDate) => {
    e.preventDefault();
    if (!draggedReservation) return;

    const canMove = canMoveReservation(draggedReservation, targetRoomId, targetDate);
    if (!canMove) {
      showError('Cannot move reservation here - room is blocked or there is a conflict');
      setDraggedReservation(null);
      setDragOverCell(null);
      return;
    }

    // Calculate the new dates
    const originalStart = parseISO(draggedReservation.check_in_date);
    const originalEnd = parseISO(draggedReservation.check_out_date);
    const nights = differenceInDays(originalEnd, originalStart);
    const newEndDate = addDays(targetDate, nights);

    const guest = guests.find(g => g.id === draggedReservation.guest_id);
    const targetRoom = rooms.find(r => r.id === targetRoomId);

    // Confirm the move
    const confirmed = await confirm({
      title: 'Move Reservation',
      message: `Move ${guest?.name || 'Guest'} to Room ${targetRoom?.room_number || 'N/A'}, ${format(targetDate, 'MMM d')} - ${format(newEndDate, 'MMM d')}?`,
      confirmText: 'Move',
      variant: 'default'
    });

    if (confirmed) {
      await updateReservation(draggedReservation.id, {
        room_id: targetRoomId,
        check_in_date: format(targetDate, 'yyyy-MM-dd'),
        check_out_date: format(newEndDate, 'yyyy-MM-dd')
      });
      showSuccess(`Moved ${guest?.name || 'Guest'} to Room ${targetRoom?.room_number}`);
    }

    setDraggedReservation(null);
    setDragOverCell(null);
  }, [draggedReservation, canMoveReservation, guests, rooms, confirm, updateReservation, showSuccess, showError]);

  // Resize handlers for extending/shortening reservations
  const handleResizeStart = useCallback((e, reservation, edge) => {
    e.stopPropagation();
    e.preventDefault();

    const originalDate = edge === 'left'
      ? parseISO(reservation.check_in_date)
      : parseISO(reservation.check_out_date);

    setResizeState({
      reservation,
      edge,
      startX: e.clientX,
      originalDate,
      currentDate: originalDate
    });
  }, []);

  // Check if a resize is valid (no conflicts, minimum 1 night)
  const canResize = useCallback((reservation, edge, newDate) => {
    const checkIn = edge === 'left' ? newDate : parseISO(reservation.check_in_date);
    const checkOut = edge === 'right' ? newDate : parseISO(reservation.check_out_date);

    // Minimum 1 night
    if (differenceInDays(checkOut, checkIn) < 1) {
      return false;
    }

    // Check for overlapping reservations
    const hasConflict = reservations.some(res => {
      if (res.id === reservation.id) return false;
      if (res.room_id !== reservation.room_id) return false;
      if (res.status === 'Cancelled' || res.status === 'Checked-out') return false;

      const resStart = parseISO(res.check_in_date);
      const resEnd = parseISO(res.check_out_date);

      return checkIn < resEnd && checkOut > resStart;
    });

    return !hasConflict;
  }, [reservations]);

  // Handle mouse move during resize
  useEffect(() => {
    if (!resizeState) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - resizeState.startX;
      const daysDelta = Math.round(deltaX / CELL_WIDTH);

      if (daysDelta === 0) return;

      const newDate = addDays(resizeState.originalDate, daysDelta);

      setResizeState(prev => ({
        ...prev,
        currentDate: newDate,
        isValid: canResize(prev.reservation, prev.edge, newDate)
      }));
    };

    const handleMouseUp = async () => {
      if (!resizeState.currentDate || resizeState.currentDate.getTime() === resizeState.originalDate.getTime()) {
        setResizeState(null);
        return;
      }

      const isValid = canResize(resizeState.reservation, resizeState.edge, resizeState.currentDate);

      if (!isValid) {
        showError('Cannot resize - minimum 1 night required or there is a conflict');
        setResizeState(null);
        return;
      }

      const updateData = resizeState.edge === 'left'
        ? { check_in_date: format(resizeState.currentDate, 'yyyy-MM-dd') }
        : { check_out_date: format(resizeState.currentDate, 'yyyy-MM-dd') };

      await updateReservation(resizeState.reservation.id, updateData);

      const guest = guests.find(g => g.id === resizeState.reservation.guest_id);
      showSuccess(`Updated ${guest?.name || 'reservation'} dates`);

      setResizeState(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizeState, canResize, updateReservation, guests, showSuccess, showError]);

  // Room swap handlers
  const handleStartSwap = useCallback((reservation) => {
    setSwapMode({ reservationA: reservation });
    closeActionMenu();
  }, []);

  const handleCancelSwap = useCallback(() => {
    setSwapMode(null);
  }, []);

  const handleCompleteSwap = useCallback(async (reservationB) => {
    if (!swapMode?.reservationA) return;

    const reservationA = swapMode.reservationA;

    // Don't swap with itself
    if (reservationA.id === reservationB.id) {
      setSwapMode(null);
      return;
    }

    // Swap the room_ids
    const guestA = guests.find(g => g.id === reservationA.guest_id);
    const guestB = guests.find(g => g.id === reservationB.guest_id);
    const roomA = rooms.find(r => r.id === reservationA.room_id);
    const roomB = rooms.find(r => r.id === reservationB.room_id);

    // Perform the swap
    await updateReservation(reservationA.id, { room_id: reservationB.room_id });
    await updateReservation(reservationB.id, { room_id: reservationA.room_id });

    showSuccess(`Swapped rooms: ${guestA?.name || 'Guest'} (${roomA?.room_number}) ↔ ${guestB?.name || 'Guest'} (${roomB?.room_number})`);
    setSwapMode(null);
  }, [swapMode, guests, rooms, updateReservation, showSuccess]);

  // Cancel swap mode with Escape key
  useEffect(() => {
    if (!swapMode) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSwapMode(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [swapMode]);

  // View mode toggle
  const toggleViewMode = () => {
    if (viewMode === 'detailed') {
      setViewMode('overview');
      setViewDays(30); // Default to 30 days for overview
    } else {
      setViewMode('detailed');
    }
  };

  // Switch from overview to detailed view at a specific date and room type
  const switchToDetailedView = (date, roomTypeId) => {
    setStartDate(date);
    setViewMode('detailed');
    setRoomTypeFilter(roomTypeId);
    setViewDays(14);
  };

  // Get occupancy percentage for a room type on a specific date
  const getOccupancyByType = useCallback((roomTypeId, date) => {
    const typeRooms = rooms.filter(r => r.room_type_id === roomTypeId && r.status !== 'Maintenance' && r.status !== 'Blocked');
    if (typeRooms.length === 0) return 0;

    const occupiedCount = reservations.filter(res => {
      if (res.status === 'Cancelled' || res.status === 'Checked-out') return false;
      const room = rooms.find(r => r.id === res.room_id);
      if (!room || room.room_type_id !== roomTypeId) return false;
      const checkIn = parseISO(res.check_in_date);
      const checkOut = parseISO(res.check_out_date);
      return date >= checkIn && date < checkOut;
    }).length;

    return Math.round((occupiedCount / typeRooms.length) * 100);
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

  // Optimized selection calculation - returns cells array
  const calculateSelectedCells = useCallback((startCell, endCell) => {
    if (!startCell || !endCell) return { cells: [] };

    const cells = [];
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
          }
        }
      }
      currentDate = addDays(currentDate, 1);
    }

    return { cells };
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
    const { cells } = calculateSelectedCells(startCell, { roomId, date, dateStr });
    setSelectedCells(cells);
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

    // Reset the reservation flow and set up new booking
    resetFlow();

    // Find the overall date range (min checkIn, max checkOut)
    const allCheckIns = pending.map(p => p.checkIn);
    const allCheckOuts = pending.map(p => p.checkOut);
    const overallCheckIn = new Date(Math.min(...allCheckIns));
    const overallCheckOut = new Date(Math.max(...allCheckOuts));

    // Set filters with the selected date range
    setFilters({
      checkIn: format(overallCheckIn, 'yyyy-MM-dd'),
      checkOut: format(overallCheckOut, 'yyyy-MM-dd'),
      source: 'walk-in',
      promoCode: '',
      searchQuery: ''
    });

    // Add each room to the cart with pre-assigned room numbers
    // We need a small delay to ensure filters are set before adding rooms
    setTimeout(() => {
      pending.forEach((booking) => {
        const room = rooms.find(r => r.id === booking.roomId);
        if (room) {
          const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
          if (roomType) {
            const checkInStr = format(booking.checkIn, 'yyyy-MM-dd');
            const checkOutStr = format(booking.checkOut, 'yyyy-MM-dd');

            // Add the room type to the cart
            const roomWithRate = {
              ...roomType,
              ratePrice: roomType.base_price
            };
            addRoom(roomWithRate, 1, null, checkInStr, checkOutStr);

            // Pre-assign the specific room
            // The cartKey format is: `${room.id}_${checkIn}_${checkOut}_${rateTypeId || 'default'}`
            const cartKey = `${roomType.id}_${checkInStr}_${checkOutStr}_default`;
            assignRoom(cartKey, booking.roomId, 0);
          }
        }
      });

      // Navigate to new reservation page
      if (onNavigate) {
        onNavigate('new-reservation');
      }
    }, 0);

    closeActionMenu();
  };

  const handleBlockAction = () => {
    if (selectedCells.length === 0) return;

    // Get the first room and date range from selection
    const roomIds = [...new Set(selectedCells.map(c => c.roomId))];
    const dates = selectedCells.map(c => c.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    const endDate = addDays(maxDate, 1); // Blocking end is day after last selected

    // Open blocking modal - if multiple rooms selected, open for first one
    setBlockingModalRoom(roomIds[0]);
    setBlockingModalStartDate(minDate);
    setBlockingModalEndDate(endDate);
    setEditingBlocking(null);
    setIsBlockingModalOpen(true);
    closeActionMenu();
  };

  // Handle clicking on a blocking bar to edit it
  const handleBlockingClick = (blocking, e) => {
    e.stopPropagation();
    setEditingBlocking(blocking);
    setBlockingModalRoom(null);
    setBlockingModalStartDate(null);
    setBlockingModalEndDate(null);
    setIsBlockingModalOpen(true);
  };

  // Close blocking modal
  const closeBlockingModal = () => {
    setIsBlockingModalOpen(false);
    setBlockingModalRoom(null);
    setBlockingModalStartDate(null);
    setBlockingModalEndDate(null);
    setEditingBlocking(null);
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

  // Quick check-in handler
  const handleQuickCheckIn = async () => {
    if (!selectedReservation) return;

    const confirmed = await confirm({
      title: 'Check-in Guest',
      message: `Check in ${guests.find(g => g.id === selectedReservation.guest_id)?.name || 'Guest'} to Room ${rooms.find(r => r.id === selectedReservation.room_id)?.room_number || 'N/A'}?`,
      confirmText: 'Check In',
      variant: 'default'
    });

    if (confirmed) {
      await checkIn(selectedReservation.id);
      closeActionMenu();
    }
  };

  // Quick check-out handler
  const handleQuickCheckOut = async () => {
    if (!selectedReservation) return;

    const confirmed = await confirm({
      title: 'Check-out Guest',
      message: `Check out ${guests.find(g => g.id === selectedReservation.guest_id)?.name || 'Guest'} from Room ${rooms.find(r => r.id === selectedReservation.room_id)?.room_number || 'N/A'}?`,
      confirmText: 'Check Out',
      variant: 'default'
    });

    if (confirmed) {
      await checkOut(selectedReservation.id);
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

  // Render reservation bar with partial booking visualization
  // Check-in: bar starts at midpoint of check-in day (afternoon arrival)
  // Check-out: bar ends at midpoint of check-out day (morning departure)
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

    const extendsLeft = checkIn < rangeStart;
    const extendsRight = checkOut > rangeEnd;

    // Partial booking positioning logic:
    // - Check-in visible: start at midpoint of check-in day (afternoon arrival)
    // - Check-out visible: end at midpoint of check-out day (morning departure)
    // This allows two reservations to share a date visually (one ending, one starting)

    let barStart;
    if (extendsLeft) {
      barStart = 0;
    } else {
      // Start at midpoint of check-in day
      barStart = startOffset * CELL_WIDTH + CELL_WIDTH / 2;
    }

    let barEnd;
    if (extendsRight) {
      barEnd = viewDays * CELL_WIDTH;
    } else {
      // End at midpoint of check-out day
      // checkout day offset = startOffset + daySpan
      barEnd = (startOffset + daySpan) * CELL_WIDTH + CELL_WIDTH / 2;
    }

    const left = barStart + 2; // +2 for margin
    const width = barEnd - barStart - 4; // -4 for margin

    const guest = guests.find(g => g.id === reservation.guest_id);
    const guestName = guest?.name || 'Unknown Guest';

    // Check if reservation matches current filters
    const matchesFilters = reservationMatchesFilters(reservation);
    const dimmed = hasActiveFilters && !matchesFilters;

    // Check if this reservation is being resized
    const isResizing = resizeState?.reservation?.id === reservation.id;
    // Check if this is the selected swap reservation
    const isSwapSelected = swapMode?.reservationA?.id === reservation.id;
    // Check if swap mode is active (for other reservations to be clickable targets)
    const isSwapTarget = swapMode && !isSwapSelected;

    // Handle click - either complete swap or show action menu
    const handleBarClick = (e) => {
      if (swapMode) {
        e.stopPropagation();
        if (isSwapTarget) {
          handleCompleteSwap(reservation);
        }
        // If clicking the selected one, do nothing (or cancel)
        return;
      }
      handleReservationClick(reservation, e);
    };

    return (
      <TooltipProvider key={reservation.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              draggable={!isResizing && !swapMode}
              onDragStart={(e) => handleReservationDragStart(e, reservation)}
              onDragEnd={handleReservationDragEnd}
              className={cn(
                "absolute top-1 h-8 cursor-grab flex items-center text-white text-xs font-medium shadow-sm transition-all z-10 group/bar",
                STATUS_COLORS[reservation.status] || 'bg-gray-500',
                dimmed && "opacity-25",
                "active:cursor-grabbing",
                isResizing && "ring-2 ring-white ring-opacity-50",
                isSwapSelected && "ring-2 ring-yellow-400 animate-pulse",
                isSwapTarget && "cursor-pointer ring-2 ring-transparent hover:ring-yellow-400"
              )}
              style={{
                left: `${left + 2}px`,
                width: `${width}px`,
              }}
              onClick={handleBarClick}
            >
              {/* Left resize handle */}
              {!extendsLeft && (
                <div
                  className="absolute left-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, reservation, 'left')}
                  onClick={(e) => e.stopPropagation()}
                />
              )}

              {/* Content */}
              <div className="flex items-center px-2 flex-1 min-w-0">
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

              {/* Right resize handle */}
              {!extendsRight && (
                <div
                  className="absolute right-0 top-0 w-2 h-full cursor-ew-resize hover:bg-white/30 transition-colors"
                  onMouseDown={(e) => handleResizeStart(e, reservation, 'right')}
                  onClick={(e) => e.stopPropagation()}
                />
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
              <p className="text-xs text-muted-foreground">Drag edges to resize</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Render selection bar with partial booking visualization
  // Shows the same mid-day split as reservation bars
  const renderSelectionBar = useCallback((roomId) => {
    // Get selected cells for this room
    const roomCells = selectedCells.filter(cell => cell.roomId === roomId);
    if (roomCells.length === 0) return null;

    // Find min and max dates in selection
    const dates = roomCells.map(cell => cell.date.getTime());
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));

    // Calculate check-in (first selected date) and check-out (day after last selected)
    const checkIn = minDate;
    const checkOut = addDays(maxDate, 1); // Checkout is day after last night

    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    // Calculate visible portion
    const visibleStart = checkIn < rangeStart ? rangeStart : checkIn;
    const visibleEnd = checkOut > rangeEnd ? rangeEnd : checkOut;

    const startOffset = differenceInDays(visibleStart, rangeStart);
    const daySpan = differenceInDays(visibleEnd, visibleStart);

    if (daySpan <= 0) return null;

    const extendsLeft = checkIn < rangeStart;
    const extendsRight = checkOut > rangeEnd;

    // Use same partial booking positioning as reservation bars
    let barStart;
    if (extendsLeft) {
      barStart = 0;
    } else {
      barStart = startOffset * CELL_WIDTH + CELL_WIDTH / 2;
    }

    let barEnd;
    if (extendsRight) {
      barEnd = viewDays * CELL_WIDTH;
    } else {
      barEnd = (startOffset + daySpan) * CELL_WIDTH + CELL_WIDTH / 2;
    }

    const left = barStart + 2;
    const width = barEnd - barStart - 4;

    const nights = differenceInDays(checkOut, checkIn);

    return (
      <div
        key={`selection-${roomId}`}
        className="absolute top-1 h-8 flex items-center justify-center text-blue-800 dark:text-blue-200 text-xs font-medium border-2 border-blue-500 border-dashed bg-blue-100/80 dark:bg-blue-900/50 z-20 pointer-events-none"
        style={{
          left: `${left}px`,
          width: `${width}px`,
        }}
      >
        {nights} night{nights !== 1 ? 's' : ''}
      </div>
    );
  }, [selectedCells, startDate, viewDays]);

  // Render blocking bar (gray striped bar for maintenance/blocked dates)
  const renderBlockingBar = (blocking, roomId) => {
    const blockStart = parseISO(blocking.start_date);
    const blockEnd = parseISO(blocking.end_date);
    const rangeStart = startDate;
    const rangeEnd = addDays(startDate, viewDays);

    // Calculate visible portion
    const visibleStart = blockStart < rangeStart ? rangeStart : blockStart;
    const visibleEnd = blockEnd > rangeEnd ? rangeEnd : blockEnd;

    // Calculate position and width
    const startOffset = differenceInDays(visibleStart, rangeStart);
    const daySpan = differenceInDays(visibleEnd, visibleStart);

    if (daySpan <= 0) return null;

    const extendsLeft = blockStart < rangeStart;
    const extendsRight = blockEnd > rangeEnd;

    // Full cell coverage for blockings (not partial like reservations)
    const left = startOffset * CELL_WIDTH + 2;
    const width = daySpan * CELL_WIDTH - 4;

    const duration = differenceInDays(blockEnd, blockStart);

    return (
      <TooltipProvider key={blocking.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute top-1 h-8 cursor-pointer flex items-center text-gray-700 dark:text-gray-300 text-xs font-medium shadow-sm transition-all z-10",
                "bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600",
                "bg-stripes"
              )}
              style={{
                left: `${left}px`,
                width: `${width}px`,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)'
              }}
              onClick={(e) => handleBlockingClick(blocking, e)}
            >
              {/* Content */}
              <div className="flex items-center px-2 flex-1 min-w-0">
                {extendsLeft && (
                  <ArrowLeftToLine className="h-3 w-3 mr-1 flex-shrink-0" />
                )}
                <Wrench className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate flex-1">
                  {blocking.reason || 'Blocked'}
                </span>
                {extendsRight && (
                  <ArrowRightToLine className="h-3 w-3 ml-1 flex-shrink-0" />
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-1">
                <Wrench className="h-4 w-4" />
                {blocking.reason || 'Room Blocked'}
              </p>
              <p className="text-xs">
                {format(blockStart, 'MMM d')} - {format(blockEnd, 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">
                {duration} day{duration !== 1 ? 's' : ''} blocked
              </p>
              <p className="text-xs text-muted-foreground">Click to edit or remove</p>
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
            {/* View Mode Toggle */}
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('detailed')}
                className="rounded-r-none"
              >
                <List className="h-4 w-4 mr-1" />
                Detailed
              </Button>
              <Button
                variant={viewMode === 'overview' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => { setViewMode('overview'); setViewDays(30); }}
                className="rounded-l-none"
              >
                <LayoutGrid className="h-4 w-4 mr-1" />
                Overview
              </Button>
            </div>
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
              variant={showFilters || hasActiveFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Button>
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

      {/* Filter Bar */}
      {showFilters && (
        <div className="flex-shrink-0 px-4 py-3 border-b bg-muted/30 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search guest name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Checked-in">Checked-in</SelectItem>
              <SelectItem value="Hold">Hold</SelectItem>
              <SelectItem value="Tentative">Tentative</SelectItem>
            </SelectContent>
          </Select>

          {/* Room Type Filter */}
          <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Room Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Room Types</SelectItem>
              {roomTypes.map(rt => (
                <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <XCircle className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}

          {/* Active filter count */}
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-auto">
              {[searchQuery, statusFilter !== 'all', roomTypeFilter !== 'all'].filter(Boolean).length} filter(s) active
            </Badge>
          )}
        </div>
      )}

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

          {/* Overview Mode - Compressed occupancy view */}
          {viewMode === 'overview' && (
            <div>
              {roomTypes.map(roomType => {
                const typeRooms = rooms.filter(r => r.room_type_id === roomType.id);
                return (
                  <div key={roomType.id} className="flex border-b">
                    {/* Room Type Name */}
                    <div
                      className="flex-shrink-0 p-2 border-r flex items-center gap-2 sticky left-0 z-10 bg-card font-medium"
                      style={{ width: ROOM_COLUMN_WIDTH, height: 36 }}
                    >
                      <span className="text-sm">{roomType.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {typeRooms.length}
                      </Badge>
                    </div>
                    {/* Occupancy cells */}
                    {dateRange.map((date, idx) => {
                      const occupancy = getOccupancyByType(roomType.id, date);
                      const available = 100 - occupancy;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex-shrink-0 border-r flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity",
                            isToday(date) && "ring-1 ring-inset ring-blue-400",
                            isWeekend(date) && "bg-muted/20",
                            available > 50 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                            available > 20 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" :
                            "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                          )}
                          style={{ width: CELL_WIDTH, height: 36 }}
                          onClick={() => switchToDetailedView(date, roomType.id)}
                          title={`${available}% available - Click to view details`}
                        >
                          <span className="text-xs font-medium">{occupancy}%</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          {/* Detailed Mode - Room Type Sections */}
          {viewMode === 'detailed' && roomTypes.map(roomType => {
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
                          const available = isCellAvailableFast(room.id, date);
                          const isDragOver = dragOverCell?.roomId === room.id &&
                            dragOverCell?.date?.getTime() === date.getTime();

                          return (
                            <div
                              key={idx}
                              className={cn(
                                "flex-shrink-0 border-r relative group",
                                isToday(date) && "bg-blue-50/30 dark:bg-blue-950/30",
                                isWeekend(date) && "bg-muted/20",
                                available && !isBlocked && "cursor-pointer",
                                isBlocked && "bg-red-50/50 dark:bg-red-950/20 cursor-not-allowed",
                                // Drag-over visual feedback
                                isDragOver && dragOverCell?.canDrop && "bg-green-200 dark:bg-green-900/50",
                                isDragOver && !dragOverCell?.canDrop && "bg-red-200 dark:bg-red-900/50"
                              )}
                              style={{ width: CELL_WIDTH, height: '100%' }}
                              onMouseDown={(e) => handleCellMouseDown(room.id, date, e)}
                              onMouseEnter={() => handleCellMouseEnter(room.id, date)}
                              onDragOver={(e) => handleCellDragOver(e, room.id, date)}
                              onDragLeave={handleCellDragLeave}
                              onDrop={(e) => handleCellDrop(e, room.id, date)}
                            >
                              {/* Partial hover indicator - shows right half (afternoon check-in) */}
                              {available && !isBlocked && !draggedReservation && (
                                <div
                                  className="absolute top-0 right-0 h-full w-1/2 bg-accent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                />
                              )}
                            </div>
                          );
                        })}

                        {/* Blocking Bars */}
                        {getBlockingsForRoom(room.id).map(blocking => renderBlockingBar(blocking, room.id))}

                        {/* Reservation Bars */}
                        {roomReservations.map(res => renderReservationBar(res, room.id))}

                        {/* Selection Bar (shows partial booking visualization during selection) */}
                        {renderSelectionBar(room.id)}
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

      {/* Swap Mode Indicator */}
      {swapMode && (
        <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 rounded-lg shadow-lg p-3 z-50">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Click another reservation to swap rooms with {guests.find(g => g.id === swapMode.reservationA.guest_id)?.name || 'Guest'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSwap}
              className="text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-800"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
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
                  {/* Quick Check-in/Check-out actions */}
                  {selectedReservation.status === 'Confirmed' && parseISO(selectedReservation.check_in_date) <= startOfDay(new Date()) && (
                    <button
                      className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-green-600"
                      onClick={handleQuickCheckIn}
                    >
                      <LogIn className="h-4 w-4" />
                      Check-in Now
                    </button>
                  )}
                  {selectedReservation.status === 'Checked-in' && (
                    <button
                      className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2 text-blue-600"
                      onClick={handleQuickCheckOut}
                    >
                      <LogOut className="h-4 w-4" />
                      Check-out Now
                    </button>
                  )}
                  {(selectedReservation.status === 'Confirmed' || selectedReservation.status === 'Checked-in') && (
                    <div className="border-t my-1" />
                  )}
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => handleEditReservation(false)}
                  >
                    <Edit2 className="h-4 w-4 text-blue-500" />
                    Edit Reservation
                  </button>
                  <button
                    className="w-full px-2 py-1.5 text-sm text-left rounded hover:bg-accent flex items-center gap-2"
                    onClick={() => handleStartSwap(selectedReservation)}
                  >
                    <ArrowLeftRight className="h-4 w-4 text-purple-500" />
                    Swap Room
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

      {/* Room Blocking Modal */}
      <RoomBlockingModal
        isOpen={isBlockingModalOpen}
        onClose={closeBlockingModal}
        initialRoom={blockingModalRoom}
        initialStartDate={blockingModalStartDate}
        initialEndDate={blockingModalEndDate}
        editingBlocking={editingBlocking}
      />
    </div>
  );
};

export default ReservationCalendar;
