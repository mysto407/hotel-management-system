// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Edit2, XOctagon, CheckCircle, LogOut, Filter, ChevronDown, Calendar, Trash2, MoreVertical, Eye, Clock, Users, BedDouble, CalendarDays } from 'lucide-react';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import RoomAssignmentModal from '../../components/reservations/RoomAssignmentModal';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useMealPlans } from '../../context/MealPlanContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { useConfirm, useAlert } from '@/context/AlertContext';
import { calculateDays } from '../../utils/helpers';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Reservations = ({ onNavigate, searchTerm = '' }) => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation, deleteReservation, assignRoom } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { getActivePlans } = useMealPlans();
  const { guests } = useGuests();
  const { agents } = useAgents();
  const confirm = useConfirm();
  const { alert: showAlert } = useAlert();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const [initialFormData, setInitialFormData] = useState(null);
  const [initialRoomDetails, setInitialRoomDetails] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');

  const [dateFilterType, setDateFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [filterGuestCount, setFilterGuestCount] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Room assignment modal state for unassigned reservations
  const [isRoomAssignmentModalOpen, setIsRoomAssignmentModalOpen] = useState(false);
  const [roomAssignmentReservation, setRoomAssignmentReservation] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const setDatePreset = (preset) => {
    const todayDate = new Date();
    let start, end;
    switch(preset) {
      case 'weekly':
        start = new Date(todayDate);
        end = new Date(todayDate);
        end.setDate(end.getDate() + 7);
        break;
      case 'fortnightly':
        start = new Date(todayDate);
        end = new Date(todayDate);
        end.setDate(end.getDate() + 14);
        break;
      case 'monthly':
        start = new Date(todayDate);
        end = new Date(todayDate);
        end.setMonth(end.getMonth() + 1);
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        setDateFilterType('all');
        return;
    }
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
    setDateFilterType(preset);
  };

  const clearAllFilters = () => {
    setFilterStatus('all');
    setFilterMealPlan('all');
    setFilterGuestCount('all');
    setDateFilterType('all');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters = () => {
    return filterStatus !== 'all' ||
           searchTerm !== '' ||
           filterMealPlan !== 'all' ||
           filterGuestCount !== 'all' ||
           dateFilterType !== 'all' ||
           startDate !== '' ||
           endDate !== '';
  };

  const handleSubmit = async (formData, roomDetails) => {
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
          message: `Successfully updated ${editingGroup.length} reservations!`
        });
      } else {
        const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / formData.number_of_rooms;
        for (let i = 0; i < roomDetails.length; i++) {
          const roomDetail = roomDetails[i];
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          const days = calculateDays(formData.check_in_date, formData.check_out_date);
          const roomAmount = roomType ? roomType.base_price * days : 0;
          const roomData = roomDetail.room_id ? rooms.find(r => r.id === roomDetail.room_id) : null;
          const roomNumber = roomData?.room_number || '';
          const roomTypeName = roomType?.name || '';
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
          await addReservation(reservationData, { roomNumber, roomTypeName });
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error creating/updating reservations:', error);
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to save booking: ' + error.message
      });
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReservation(null);
    setEditingGroup(null);
    setInitialFormData(null);
    setInitialRoomDetails(null);
  };

  const handleEdit = (reservation) => {
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
    setInitialFormData(formData);
    setInitialRoomDetails(roomDetails);
    setIsModalOpen(true);
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
    const details = group.map(reservation => {
      const room = rooms.find(r => r.id === reservation.room_id);
      return {
        room_type_id: room ? room.room_type_id : '',
        room_id: reservation.room_id,
        number_of_adults: reservation.number_of_adults || 1,
        number_of_children: reservation.number_of_children || 0,
        number_of_infants: reservation.number_of_infants || 0
      };
    });
    setInitialFormData(formData);
    setInitialRoomDetails(details);
    setIsModalOpen(true);
  };

  const handleCheckIn = async (reservation) => {
    if (!reservation.room_id) {
      setRoomAssignmentReservation(reservation);
      setIsRoomAssignmentModalOpen(true);
      return;
    }

    const confirmed = await confirm({
      variant: 'info',
      title: 'Check In',
      message: `Check in ${reservation.guests?.name}?`,
      confirmText: 'Check In',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      checkIn(reservation.id);
    }
  };

  const handleRoomAssignmentAndCheckIn = async (roomId, roomNumber) => {
    if (!roomAssignmentReservation) return;

    const result = await assignRoom(roomAssignmentReservation.id, roomId, false, roomNumber);
    if (result.data) {
      await checkIn(roomAssignmentReservation.id);
      setIsRoomAssignmentModalOpen(false);
      setRoomAssignmentReservation(null);
    } else {
      await showAlert({
        variant: 'danger',
        title: 'Assignment Failed',
        message: result.error || 'Failed to assign room'
      });
    }
  };

  const handleCheckOut = async (reservation) => {
    const confirmed = await confirm({
      variant: 'info',
      title: 'Check Out',
      message: `Check out ${reservation.guests?.name}?`,
      confirmText: 'Check Out',
      cancelText: 'Cancel'
    });
    if (confirmed) {
      checkOut(reservation.id);
    }
  };

  const handleCancel = async (reservation) => {
    const confirmed = await confirm({
      variant: 'warning',
      title: 'Cancel Reservation',
      message: 'Are you sure you want to cancel this reservation?',
      confirmText: 'Cancel Reservation',
      cancelText: 'Keep Reservation'
    });
    if (confirmed) {
      cancelReservation(reservation.id);
    }
  };

  const handleDelete = async (reservation) => {
    const guestName = reservation.guests?.name || 'Unknown';
    const confirmMessage = `⚠️ WARNING: Permanent Deletion\n\nAre you absolutely sure you want to PERMANENTLY DELETE this reservation?\n\nGuest: ${guestName}\nRoom: ${getRoomInfo(reservation.rooms)}\nCheck-in: ${reservation.check_in_date}\n\nThis action CANNOT be undone!`;
    const firstConfirm = await confirm({
      variant: 'danger',
      title: '⚠️ Permanent Deletion Warning',
      message: confirmMessage,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    if (firstConfirm) {
      const finalConfirm = await confirm({
        variant: 'danger',
        title: 'Final Confirmation',
        message: 'Final confirmation: Delete this reservation permanently?',
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel'
      });
      if (finalConfirm) {
        deleteReservation(reservation.id);
      }
    }
  };

  const handleDeleteGroup = async (group) => {
    const guestName = group[0].guests?.name || 'Unknown';
    const confirmMessage = `⚠️ WARNING: Permanent Deletion\n\nAre you absolutely sure you want to PERMANENTLY DELETE all ${group.length} reservations?\n\nGuest: ${guestName}\nRooms: ${group.length}\n\nThis action CANNOT be undone!`;
    const firstConfirm = await confirm({
      variant: 'danger',
      title: '⚠️ Permanent Deletion Warning',
      message: confirmMessage,
      confirmText: 'Yes, Delete All',
      cancelText: 'Cancel'
    });
    if (firstConfirm) {
      const finalConfirm = await confirm({
        variant: 'danger',
        title: 'Final Confirmation',
        message: `Final confirmation: Delete ALL ${group.length} reservations permanently?`,
        confirmText: 'Delete Permanently',
        cancelText: 'Cancel'
      });
      if (finalConfirm) {
        group.forEach(r => deleteReservation(r.id));
      }
    }
  };

  const handleViewDetails = (group) => {
    const firstReservation = Array.isArray(group) ? group[0] : group;
    let reservationIds;
    if (firstReservation.booking_id) {
      const relatedReservations = reservations.filter(r => r.booking_id === firstReservation.booking_id);
      reservationIds = relatedReservations.map(r => r.id);
    } else {
      reservationIds = Array.isArray(group) ? group.map(r => r.id) : [group.id];
    }
    sessionStorage.setItem('reservationDetailsIds', JSON.stringify(reservationIds));
    onNavigate('reservation-details');
  };


  const getRoomInfo = (room) => {
    if (!room) return 'Unknown';
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
    return `${room.room_number} - ${roomType?.name || 'Unknown'}`;
  };

  const groupReservations = (reservations) => {
    const groups = [];
    const processed = new Set();
    reservations.forEach(reservation => {
      if (processed.has(reservation.id)) return;
      const group = reservations.filter(r => {
        if (processed.has(r.id)) return false;
        if (reservation.booking_id && r.booking_id === reservation.booking_id) {
          return true;
        }
        if (reservation.booking_reference && r.booking_reference === reservation.booking_reference) {
          return true;
        }
        const sameGuest = r.guest_id === reservation.guest_id;
        const sameDates = r.check_in_date === reservation.check_in_date && r.check_out_date === reservation.check_out_date;
        const sameSource = r.booking_source === reservation.booking_source && r.agent_id === reservation.agent_id;
        const sameMealPlan = r.meal_plan === reservation.meal_plan;
        const timeDiff = Math.abs(new Date(r.created_at) - new Date(reservation.created_at));
        const createdTogether = timeDiff < 30000;
        return sameGuest && sameDates && sameSource && sameMealPlan && createdTogether;
      });
      group.forEach(r => processed.add(r.id));
      groups.push(group);
    });
    return groups;
  };

  const [expandedGroups, setExpandedGroups] = useState(new Set());

  const toggleGroupExpansion = (groupId) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const filteredReservations = reservations
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r =>
      r.guests?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.guests?.phone?.includes(searchTerm)
    )
    .filter(r => {
      if (filterMealPlan === 'all') return true;
      return r.meal_plan === filterMealPlan;
    })
    .filter(r => {
      if (filterGuestCount === 'all') return true;
      const totalGuests = (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0);
      switch(filterGuestCount) {
        case '1-2': return totalGuests >= 1 && totalGuests <= 2;
        case '3-4': return totalGuests >= 3 && totalGuests <= 4;
        case '5+': return totalGuests >= 5;
        default: return true;
      }
    })
    .filter(r => {
      if (dateFilterType === 'all' || (!startDate && !endDate)) return true;
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      const filterStart = startDate ? new Date(startDate) : null;
      const filterEnd = endDate ? new Date(endDate) : null;
      if (filterStart && filterEnd) {
        return (checkIn <= filterEnd && checkOut >= filterStart);
      } else if (filterStart) {
        return checkOut >= filterStart;
      } else if (filterEnd) {
        return checkIn <= filterEnd;
      }
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.check_in_date);
      const dateB = new Date(b.check_in_date);
      return dateA - dateB;
    });

  // Filter Button Component
  const FilterButton = ({ onClick, isActive, children, ...props }) => (
    <Button
      onClick={onClick}
      variant={isActive ? "default" : "outline"}
      size="sm"
      className={cn(
        isActive && "text-white",
        props.variant === 'purple' && isActive && "bg-purple-600 hover:bg-purple-700",
        props.variant === 'warning' && isActive && "bg-yellow-600 hover:bg-yellow-700",
        props.variant === 'orange' && isActive && "bg-orange-600 hover:bg-orange-700",
        props.variant === 'info' && isActive && "bg-blue-600 hover:bg-blue-700",
        props.variant === 'success' && isActive && "bg-green-700 hover:bg-green-800",
        props.variant === 'destructive' && isActive && "bg-red-600 hover:bg-red-700",
      )}
    >
      {children}
    </Button>
  );

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Calculate nights
  const calculateNights = (checkIn, checkOut) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get status background color for card
  const getStatusBgColor = (status) => {
    switch(status) {
      case 'Inquiry': return 'bg-purple-500';
      case 'Tentative': return 'bg-yellow-500';
      case 'Hold': return 'bg-orange-500';
      case 'Confirmed': return 'bg-blue-500';
      case 'Checked-in': return 'bg-green-600';
      case 'Checked-out': return 'bg-gray-500';
      case 'Cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  // Reservation Card Component - Professional Compact Design
  const ReservationCard = ({ group, groupIndex }) => {
    const isMultiRoom = group.length > 1;
    const primaryReservation = group[0];
    const groupId = `${primaryReservation.guest_id}-${primaryReservation.check_in_date}-${groupIndex}`;
    const isExpanded = expandedGroups.has(groupId);

    const isSplitReservation = primaryReservation.booking_reference &&
                              primaryReservation.booking_reference.startsWith('SPLIT-');

    const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);

    const earliestCheckIn = isMultiRoom
      ? group.reduce((earliest, r) => (!earliest || r.check_in_date < earliest ? r.check_in_date : earliest), null)
      : primaryReservation.check_in_date;
    const latestCheckOut = isMultiRoom
      ? group.reduce((latest, r) => (!latest || r.check_out_date > latest ? r.check_out_date : latest), null)
      : primaryReservation.check_out_date;

    const nights = calculateNights(earliestCheckIn, latestCheckOut);
    const unassignedCount = group.filter(r => !r.room_id).length;

    // Get room display
    const getRoomDisplay = () => {
      if (isMultiRoom) {
        return group.map(r => r.rooms?.room_number || 'TBA').join(', ');
      }
      return primaryReservation.room_id ? primaryReservation.rooms?.room_number : null;
    };

    // Get source label
    const getSourceLabel = () => {
      if (primaryReservation.booking_source === 'agent') {
        return primaryReservation.agents?.name || 'Agent';
      }
      if (primaryReservation.booking_source === 'direct' && primaryReservation.direct_source) {
        return primaryReservation.direct_source;
      }
      return primaryReservation.booking_source?.charAt(0).toUpperCase() + primaryReservation.booking_source?.slice(1) || 'Direct';
    };

    const roomDisplay = getRoomDisplay();

    return (
      <Card className="rounded-none hover:shadow-md transition-all duration-200">
        <CardContent className="p-3">
            {/* Header: Name + Room + Actions */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">
                    {primaryReservation.guests?.name || 'Unknown'}
                  </h3>
                  {isMultiRoom && (
                    <span className={cn(
                      "text-[10px] font-medium px-1.5 py-0.5 rounded",
                      unassignedCount > 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                    )}>
                      {unassignedCount === 0
                        ? `${group.length} rooms`
                        : unassignedCount === group.length
                          ? `${group.length} unassigned rooms`
                          : `${unassignedCount} of ${group.length} unassigned`
                      }
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  {primaryReservation.guests?.phone || '—'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {(primaryReservation.status === 'Confirmed' || primaryReservation.status === 'Hold') && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={async () => {
                      if (isMultiRoom) {
                        const unassignedInGroup = group.filter(r => !r.room_id);
                        if (unassignedInGroup.length > 0) {
                          await showAlert({ variant: 'warning', title: 'Room Assignment Required', message: `${unassignedInGroup.length} room(s) need assignment.` });
                          return;
                        }
                        const confirmed = await confirm({ variant: 'info', title: 'Check In', message: `Check in all ${group.length} rooms?`, confirmText: 'Check In All'});
                        if (confirmed) group.forEach(r => checkIn(r.id));
                      } else handleCheckIn(primaryReservation);
                    }}
                    className="h-6 w-6"
                  >
                    <CheckCircle size={14} className="text-green-600" />
                  </Button>
                )}
                {primaryReservation.status === 'Checked-in' && (
                  <Button
                    variant="ghost" size="icon"
                    onClick={async () => {
                      if (isMultiRoom) {
                        const confirmed = await confirm({ variant: 'info', title: 'Check Out', message: `Check out all ${group.length} rooms?`, confirmText: 'Check Out All'});
                        if (confirmed) group.forEach(r => checkOut(r.id));
                      } else handleCheckOut(primaryReservation);
                    }}
                    className="h-6 w-6"
                  >
                    <LogOut size={14} className="text-blue-600" />
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => handleViewDetails(group)} className="text-xs">
                      <Eye size={12} className="mr-2" />View Details
                    </DropdownMenuItem>
                    {primaryReservation.status !== 'Cancelled' && primaryReservation.status !== 'Checked-out' && (
                      <>
                        <DropdownMenuItem onClick={() => isMultiRoom ? handleEditGroup(group) : handleEdit(primaryReservation)} className="text-xs">
                          <Edit2 size={12} className="mr-2 text-blue-600" />Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          if (isMultiRoom) {
                            const confirmed = await confirm({ variant: 'warning', title: 'Cancel Reservations', message: `Cancel all ${group.length} rooms?`, confirmText: 'Cancel All'});
                            if (confirmed) group.forEach(r => handleCancel(r));
                          } else handleCancel(primaryReservation);
                        }} className="text-xs">
                          <XOctagon size={12} className="mr-2 text-orange-600" />Cancel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => isMultiRoom ? handleDeleteGroup(group) : handleDelete(primaryReservation)} className="text-xs text-red-600">
                      <Trash2 size={12} className="mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Info Grid - 2x2 compact layout */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] mb-2">
              {/* Room */}
              <div className="flex items-center gap-1.5">
                <BedDouble size={12} className="text-muted-foreground flex-shrink-0" />
                {roomDisplay ? (
                  <span className="font-medium truncate" title={roomDisplay}>{roomDisplay}</span>
                ) : (
                  <span className="text-amber-600 font-medium">Unassigned</span>
                )}
              </div>

              {/* Dates */}
              <div className="flex items-center gap-1.5">
                <CalendarDays size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="truncate">{formatDate(earliestCheckIn)} → {formatDate(latestCheckOut)}</span>
              </div>

              {/* Guests */}
              <div className="flex items-center gap-1.5">
                <Users size={12} className="text-muted-foreground flex-shrink-0" />
                <span>
                  {isMultiRoom ? (
                    <>{group.reduce((sum, r) => sum + (r.number_of_adults || 0), 0)}A {group.reduce((sum, r) => sum + (r.number_of_children || 0), 0)}C {group.reduce((sum, r) => sum + (r.number_of_infants || 0), 0)}I</>
                  ) : (
                    <>{primaryReservation.number_of_adults || 0}A {primaryReservation.number_of_children || 0}C {primaryReservation.number_of_infants || 0}I</>
                  )}
                </span>
              </div>

              {/* Nights */}
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-muted-foreground flex-shrink-0" />
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Footer: Amount + Status + Payment + Source */}
            <div className="flex items-center justify-between pt-2 border-t border-dashed">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">₹{totalAmount.toLocaleString()}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded",
                  primaryReservation.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                  primaryReservation.payment_status === 'Partial' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {primaryReservation.payment_status}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {primaryReservation.meal_plan && primaryReservation.meal_plan !== 'NM' && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                    {primaryReservation.meal_plan}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{getSourceLabel()}</span>
                <span className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded text-white",
                  getStatusBgColor(primaryReservation.status)
                )}>
                  {primaryReservation.status}
                </span>
              </div>
            </div>

            {/* Alerts */}
            {isSplitReservation && (
              <div className="flex gap-1.5 mt-2 pt-2 border-t">
                <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                  Extended Stay
                </span>
              </div>
            )}

        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Filters - Date Range and Quick Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters} className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer rounded-t-lg">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <span className="font-semibold">Filters</span>
              {hasActiveFilters() && <Badge variant="info">Active</Badge>}
            </div>
            <div className="flex items-center gap-3">
              {hasActiveFilters() && (
                <Button
                  onClick={(e) => { e.stopPropagation(); clearAllFilters(); }}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Clear All
                </Button>
              )}
              <ChevronDown
                size={16}
                className={cn("transition-transform", showFilters && "rotate-180")}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-4 space-y-6">
            <div className="flex gap-2 flex-wrap">
              <FilterButton onClick={() => setDatePreset('all')} isActive={dateFilterType === 'all'}>All Dates</FilterButton>
              <FilterButton onClick={() => { setDatePreset('all'); setStartDate(today); setEndDate(today); setDateFilterType('today'); }} isActive={dateFilterType === 'today'}>Today</FilterButton>
              <FilterButton onClick={() => setDatePreset('weekly')} isActive={dateFilterType === 'weekly'}>Next 7 Days</FilterButton>
              <FilterButton onClick={() => setDatePreset('fortnightly')} isActive={dateFilterType === 'fortnightly'}>Next 14 Days</FilterButton>
              <FilterButton onClick={() => setDatePreset('monthly')} isActive={dateFilterType === 'monthly'}>Next 30 Days</FilterButton>
              <FilterButton onClick={() => setDateFilterType('custom')} isActive={dateFilterType === 'custom'}>Custom</FilterButton>
            </div>

            {dateFilterType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
              <div className="space-y-3">
                <Label className="font-semibold">Status</Label>
                <div className="flex gap-2 flex-wrap">
                  <FilterButton onClick={() => setFilterStatus('all')} isActive={filterStatus === 'all'}>All</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Inquiry')} isActive={filterStatus === 'Inquiry'} variant="purple">Inquiry</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Tentative')} isActive={filterStatus === 'Tentative'} variant="warning">Tentative</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Hold')} isActive={filterStatus === 'Hold'} variant="orange">Hold</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Confirmed')} isActive={filterStatus === 'Confirmed'} variant="info">Confirmed</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Checked-in')} isActive={filterStatus === 'Checked-in'}>Checked-in</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Checked-out')} isActive={filterStatus === 'Checked-out'} variant="success">Checked-out</FilterButton>
                  <FilterButton onClick={() => setFilterStatus('Cancelled')} isActive={filterStatus === 'Cancelled'} variant="destructive">Cancelled</FilterButton>
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-semibold">Meal Plan</Label>
                <div className="flex gap-2 flex-wrap">
                  <FilterButton onClick={() => setFilterMealPlan('all')} isActive={filterMealPlan === 'all'}>All</FilterButton>
                  {getActivePlans().map((plan) => (
                    <FilterButton
                      key={plan.code}
                      onClick={() => setFilterMealPlan(plan.code)}
                      isActive={filterMealPlan === plan.code}
                    >
                      {plan.name}
                    </FilterButton>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <Label className="font-semibold">Guests</Label>
                <div className="flex gap-2 flex-wrap">
                  <FilterButton onClick={() => setFilterGuestCount('all')} isActive={filterGuestCount === 'all'}>All</FilterButton>
                  <FilterButton onClick={() => setFilterGuestCount('1-2')} isActive={filterGuestCount === '1-2'}>1-2</FilterButton>
                  <FilterButton onClick={() => setFilterGuestCount('3-4')} isActive={filterGuestCount === '3-4'}>3-4</FilterButton>
                  <FilterButton onClick={() => setFilterGuestCount('5+')} isActive={filterGuestCount === '5+'}>5+</FilterButton>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Reservation Cards Grid */}
      {groupReservations(filteredReservations).length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar size={48} className="mx-auto text-muted-foreground opacity-50" />
            <p className="mt-4 text-lg font-semibold">No reservations found</p>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {(() => {
            const groups = groupReservations(filteredReservations);
            // Group by month based on earliest check-in date
            const byMonth = {};
            groups.forEach((group, groupIndex) => {
              const earliestCheckIn = group.reduce((earliest, r) =>
                (!earliest || r.check_in_date < earliest ? r.check_in_date : earliest), null);
              const date = new Date(earliestCheckIn);
              const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
              if (!byMonth[monthKey]) {
                byMonth[monthKey] = [];
              }
              byMonth[monthKey].push({ group, groupIndex });
            });

            // Sort months chronologically
            const sortedMonths = Object.keys(byMonth).sort();

            return sortedMonths.map(monthKey => {
              const [year, month] = monthKey.split('-');
              const monthName = new Date(year, parseInt(month) - 1).toLocaleDateString('en-IN', {
                month: 'long',
                year: 'numeric'
              });

              return (
                <div key={monthKey}>
                  <h2 className="text-lg font-semibold text-muted-foreground mb-3 pb-2 border-b">
                    {monthName}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {byMonth[monthKey].map(({ group, groupIndex }) => (
                      <ReservationCard key={groupIndex} group={group} groupIndex={groupIndex} />
                    ))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* Reusable EditBookingModal */}
      <EditBookingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingReservation={editingReservation}
        editingGroup={editingGroup}
        initialFormData={initialFormData}
        initialRoomDetails={initialRoomDetails}
      />

      {/* Room Assignment Modal for unassigned reservations during check-in */}
      <RoomAssignmentModal
        open={isRoomAssignmentModalOpen}
        onOpenChange={(open) => {
          setIsRoomAssignmentModalOpen(open);
          if (!open) setRoomAssignmentReservation(null);
        }}
        reservation={roomAssignmentReservation}
        onAssign={handleRoomAssignmentAndCheckIn}
      />
    </div>
  );
};

export default Reservations;
