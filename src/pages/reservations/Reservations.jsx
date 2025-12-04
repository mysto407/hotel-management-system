// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Edit2, XOctagon, CheckCircle, LogOut, Filter, User, Building, ChevronDown, Calendar, Trash2, MoreVertical, Eye, Phone, Mail, Clock, Users, CreditCard, BedDouble, CalendarDays } from 'lucide-react';
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Reservations = ({ onNavigate, searchTerm = '' }) => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation, deleteReservation, assignRoom } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { getMealPlanName, getActivePlans } = useMealPlans();
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

  const getMealPlanLabel = (mealPlan) => {
    return getMealPlanName(mealPlan);
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

  // Get status color classes for card border
  const getStatusBorderColor = (status) => {
    switch(status) {
      case 'Inquiry': return 'border-l-purple-500';
      case 'Tentative': return 'border-l-yellow-500';
      case 'Hold': return 'border-l-orange-500';
      case 'Confirmed': return 'border-l-blue-500';
      case 'Checked-in': return 'border-l-green-600';
      case 'Checked-out': return 'border-l-gray-500';
      case 'Cancelled': return 'border-l-red-500';
      default: return 'border-l-gray-300';
    }
  };

  // Get booking source badge
  const getSourceBadge = (reservation) => {
    if (reservation.booking_source === 'agent') {
      return (
        <Badge variant="info" className="text-xs">
          <User size={10} className="mr-1" />
          Agent{reservation.agents?.name ? `: ${reservation.agents.name}` : ''}
        </Badge>
      );
    } else if (reservation.booking_source === 'walk-in') {
      return (
        <Badge variant="success" className="text-xs">
          <Building size={10} className="mr-1" />Walk-in
        </Badge>
      );
    } else if (reservation.booking_source === 'phone') {
      return (
        <Badge variant="info" className="text-xs">
          <Phone size={10} className="mr-1" />Phone
        </Badge>
      );
    } else if (reservation.booking_source === 'email') {
      return (
        <Badge variant="warning" className="text-xs">
          <Mail size={10} className="mr-1" />Email
        </Badge>
      );
    } else if (reservation.booking_source === 'website') {
      return (
        <Badge variant="purple" className="text-xs">
          <Building size={10} className="mr-1" />Website
        </Badge>
      );
    } else if (reservation.booking_source === 'direct' && reservation.direct_source) {
      return (
        <Badge variant="success" className="text-xs">
          <Building size={10} className="mr-1" />{reservation.direct_source}
        </Badge>
      );
    }
    return (
      <Badge variant="success" className="text-xs">
        <Building size={10} className="mr-1" />Direct
      </Badge>
    );
  };

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

  // Reservation Card Component
  const ReservationCard = ({ group, groupIndex }) => {
    const isMultiRoom = group.length > 1;
    const primaryReservation = group[0];
    const groupId = `${primaryReservation.guest_id}-${primaryReservation.check_in_date}-${groupIndex}`;
    const isExpanded = expandedGroups.has(groupId);

    const isSplitReservation = primaryReservation.booking_reference &&
                              primaryReservation.booking_reference.startsWith('SPLIT-');

    const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const totalGuests = group.reduce((sum, r) =>
      sum + (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0), 0
    );

    // Calculate dates for multi-room groups
    const earliestCheckIn = isMultiRoom
      ? group.reduce((earliest, r) => (!earliest || r.check_in_date < earliest ? r.check_in_date : earliest), null)
      : primaryReservation.check_in_date;
    const latestCheckOut = isMultiRoom
      ? group.reduce((latest, r) => (!latest || r.check_out_date > latest ? r.check_out_date : latest), null)
      : primaryReservation.check_out_date;

    const nights = calculateNights(earliestCheckIn, latestCheckOut);
    const unassignedCount = group.filter(r => !r.room_id).length;

    return (
      <Card className={cn(
        "border-l-4 hover:shadow-md transition-shadow",
        getStatusBorderColor(primaryReservation.status)
      )}>
        <CardContent className="p-4">
          {/* Header Row: Guest Info + Status + Actions */}
          <div className="flex items-start justify-between gap-4 mb-3">
            {/* Guest Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {getSourceBadge(primaryReservation)}
                {isMultiRoom && (
                  <Badge variant="outline" className="text-xs">
                    <BedDouble size={10} className="mr-1" />
                    {group.length} Rooms
                  </Badge>
                )}
                {isSplitReservation && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Extended
                  </Badge>
                )}
                {unassignedCount > 0 && (
                  <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                    <Clock size={10} className="mr-0.5" />
                    {unassignedCount} Unassigned
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg truncate">
                {primaryReservation.guests?.name || 'Unknown Guest'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {primaryReservation.guests?.phone || 'No phone'}
              </p>
            </div>

            {/* Status + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant={
                primaryReservation.status === 'Inquiry' ? 'purple' :
                primaryReservation.status === 'Tentative' ? 'warning' :
                primaryReservation.status === 'Hold' ? 'orange' :
                primaryReservation.status === 'Confirmed' ? 'info' :
                primaryReservation.status === 'Checked-in' ? 'default' :
                primaryReservation.status === 'Checked-out' ? 'success' :
                'destructive'
              }>
                {primaryReservation.status}
              </Badge>

              {/* Quick Actions */}
              {(primaryReservation.status === 'Confirmed' || primaryReservation.status === 'Hold') && (
                <Button
                  variant="ghost" size="icon"
                  onClick={async () => {
                    if (isMultiRoom) {
                      const unassignedInGroup = group.filter(r => !r.room_id);
                      if (unassignedInGroup.length > 0) {
                        await showAlert({
                          variant: 'warning',
                          title: 'Room Assignment Required',
                          message: `${unassignedInGroup.length} room(s) in this group don't have rooms assigned. Please assign rooms before checking in.`
                        });
                        return;
                      }
                      const confirmed = await confirm({ variant: 'info', title: 'Check In Multiple Rooms', message: `Check in all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Check In All'});
                      if (confirmed) group.forEach(r => checkIn(r.id));
                    } else handleCheckIn(primaryReservation);
                  }}
                  title="Check In"
                  className="h-8 w-8"
                >
                  <CheckCircle size={18} className="text-green-600" />
                </Button>
              )}
              {primaryReservation.status === 'Checked-in' && (
                <Button
                  variant="ghost" size="icon"
                  onClick={async () => {
                    if (isMultiRoom) {
                      const confirmed = await confirm({ variant: 'info', title: 'Check Out Multiple Rooms', message: `Check out all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Check Out All'});
                      if (confirmed) group.forEach(r => checkOut(r.id));
                    } else handleCheckOut(primaryReservation);
                  }}
                  title="Check Out"
                  className="h-8 w-8"
                >
                  <LogOut size={18} className="text-blue-600" />
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More actions" className="h-8 w-8">
                    <MoreVertical size={18} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleViewDetails(group)}>
                    <Eye size={16} className="mr-2" />
                    View Details
                  </DropdownMenuItem>
                  {primaryReservation.status !== 'Cancelled' && primaryReservation.status !== 'Checked-out' && (
                    <>
                      <DropdownMenuItem onClick={() => isMultiRoom ? handleEditGroup(group) : handleEdit(primaryReservation)}>
                        <Edit2 size={16} className="mr-2 text-blue-600" />
                        {isMultiRoom ? 'Edit All Rooms' : 'Edit'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          if (isMultiRoom) {
                            const confirmed = await confirm({ variant: 'warning', title: 'Cancel Multiple Reservations', message: `Cancel all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Cancel All'});
                            if (confirmed) group.forEach(r => handleCancel(r));
                          } else handleCancel(primaryReservation);
                        }}
                      >
                        <XOctagon size={16} className="mr-2 text-orange-600" />
                        Cancel Reservation
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => isMultiRoom ? handleDeleteGroup(group) : handleDelete(primaryReservation)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete Permanently
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {/* Room Info */}
            <div className="flex items-start gap-2">
              <BedDouble size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Room</p>
                {isMultiRoom ? (
                  <p className="font-medium truncate" title={group.map(r => r.rooms?.room_number || 'TBA').join(', ')}>
                    {group.map(r => r.rooms?.room_number || 'TBA').join(', ')}
                  </p>
                ) : primaryReservation.room_id ? (
                  <p className="font-medium">{primaryReservation.rooms?.room_number}</p>
                ) : (
                  <p className="font-medium text-amber-700">Unassigned</p>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="flex items-start gap-2">
              <CalendarDays size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Stay</p>
                <p className="font-medium">
                  {formatDate(earliestCheckIn)} - {formatDate(latestCheckOut)}
                </p>
                <p className="text-xs text-muted-foreground">{nights} night{nights !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-start gap-2">
              <Users size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Guests</p>
                <p className="font-medium">{totalGuests} Total</p>
                <p className="text-xs text-muted-foreground">
                  {isMultiRoom ? (
                    <>
                      {group.reduce((sum, r) => sum + (r.number_of_adults || 0), 0)}A,
                      {group.reduce((sum, r) => sum + (r.number_of_children || 0), 0)}C,
                      {group.reduce((sum, r) => sum + (r.number_of_infants || 0), 0)}I
                    </>
                  ) : (
                    <>
                      {primaryReservation.number_of_adults || 0}A,
                      {primaryReservation.number_of_children || 0}C,
                      {primaryReservation.number_of_infants || 0}I
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Amount & Payment */}
            <div className="flex items-start gap-2">
              <CreditCard size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Amount</p>
                <p className="font-medium">₹{totalAmount.toLocaleString()}</p>
                <Badge variant={
                  primaryReservation.payment_status === 'Paid' ? 'success' :
                  primaryReservation.payment_status === 'Partial' ? 'warning' :
                  'destructive'
                } className="text-xs mt-0.5">
                  {primaryReservation.payment_status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Meal Plan */}
          {primaryReservation.meal_plan && primaryReservation.meal_plan !== 'NM' && (
            <div className="mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">Meal Plan: </span>
              <span className="text-sm font-medium">{getMealPlanLabel(primaryReservation.meal_plan)}</span>
            </div>
          )}

          {/* Multi-Room Expansion */}
          {isMultiRoom && (
            <div className="mt-3 pt-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleGroupExpansion(groupId)}
                className="w-full justify-between text-muted-foreground hover:text-foreground"
              >
                <span>View {group.length} room details</span>
                <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />
              </Button>

              {isExpanded && (
                <div className="mt-2 space-y-2">
                  {group.map((reservation, roomIndex) => (
                    <div
                      key={reservation.id}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground font-medium">Room {roomIndex + 1}</span>
                        <span className="font-medium">
                          {reservation.rooms?.room_number || 'Unassigned'}
                        </span>
                        <span className="text-muted-foreground">
                          {reservation.check_in_date} → {reservation.check_out_date}
                        </span>
                        <span className="text-muted-foreground">
                          {reservation.number_of_adults || 0}A, {reservation.number_of_children || 0}C
                        </span>
                        <span className="font-medium">₹{(reservation.total_amount || 0).toLocaleString()}</span>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(reservation)}>
                            <Edit2 size={14} className="mr-2 text-blue-600" />
                            Edit This Room
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {groupReservations(filteredReservations).map((group, groupIndex) => (
            <ReservationCard key={groupIndex} group={group} groupIndex={groupIndex} />
          ))}
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
