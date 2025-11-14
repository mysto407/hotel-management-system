// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Plus, Edit2, XOctagon, CheckCircle, LogOut, Search, Filter, User, Building, ChevronDown, Calendar, Trash2 } from 'lucide-react';
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import ReservationSummary from '../../components/reservations/ReservationSummary';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useMealPlans } from '../../context/MealPlanContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { calculateDays } from '../../utils/helpers';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Card, CardContent } from "@/components/ui/card";

const Reservations = ({ onNavigate }) => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation, deleteReservation } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { getMealPlanName, getActivePlans } = useMealPlans();
  const { guests } = useGuests();
  const { agents } = useAgents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [initialFormData, setInitialFormData] = useState(null);
  const [initialRoomDetails, setInitialRoomDetails] = useState(null);

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

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [dateFilterType, setDateFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [filterGuestCount, setFilterGuestCount] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const setDatePreset = (preset) => {
    const today = new Date();
    let start, end;
    switch(preset) {
      case 'weekly':
        start = new Date(today);
        end = new Date(today);
        end.setDate(end.getDate() + 7);
        break;
      case 'fortnightly':
        start = new Date(today);
        end = new Date(today);
        end.setDate(end.getDate() + 14);
        break;
      case 'monthly':
        start = new Date(today);
        end = new Date(today);
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
    setSearchTerm('');
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

  const handleSubmit = async (formData, roomDetails) => {
    try {
      if (editingReservation) {
        // ... (logic from original file remains the same)
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
        // ... (logic from original file remains the same)
        const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / editingGroup.length;
        for (let i = 0; i < editingGroup.length; i++) {
          const reservation = editingGroup[i];
          const roomDetail = roomDetails[i];
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          const days = calculateDays(formData.check_in_date, formData.check_out_date);
          const roomAmount = roomType ? roomType.base_price * days : 0;
          const reservationData = {
            // ... (copy properties from logic)
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
      } else {
        // ... (logic from original file remains the same)
         const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / formData.number_of_rooms;
        for (let i = 0; i < roomDetails.length; i++) {
          const roomDetail = roomDetails[i];
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          const days = calculateDays(formData.check_in_date, formData.check_out_date);
          const roomAmount = roomType ? roomType.base_price * days : 0;
          const reservationData = {
             // ... (copy properties from logic)
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
          await addReservation(reservationData);
        }
      }
      closeModal();
    } catch (error) {
      console.error('Error creating/updating reservations:', error);
      await showAlert({
        variant: 'danger',
        title: 'Error',
        message: 'Failed to save booking: ' + error.message,
        confirmText: 'OK'
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
    // ... (logic from original file remains the same)
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
    // ... (logic from original file remains the same)
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
    // ... (logic from original file remains the same)
    const confirmed = await showConfirm({
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

  const handleCheckOut = async (reservation) => {
    // ... (logic from original file remains the same)
    const confirmed = await showConfirm({
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
    // ... (logic from original file remains the same)
     const confirmed = await showConfirm({
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
    // ... (logic from original file remains the same)
    const guestName = reservation.guests?.name || 'Unknown';
    const confirmMessage = `⚠️ WARNING: Permanent Deletion\n\nAre you absolutely sure you want to PERMANENTLY DELETE this reservation?\n\nGuest: ${guestName}\nRoom: ${getRoomInfo(reservation.rooms)}\nCheck-in: ${reservation.check_in_date}\n\nThis action CANNOT be undone!`;
    const firstConfirm = await showConfirm({
      variant: 'danger',
      title: '⚠️ Permanent Deletion Warning',
      message: confirmMessage,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel'
    });
    if (firstConfirm) {
      const finalConfirm = await showConfirm({
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
    // ... (logic from original file remains the same)
    const guestName = group[0].guests?.name || 'Unknown';
    const confirmMessage = `⚠️ WARNING: Permanent Deletion\n\nAre you absolutely sure you want to PERMANENTLY DELETE all ${group.length} reservations?\n\nGuest: ${guestName}\nRooms: ${group.length}\n\nThis action CANNOT be undone!`;
    const firstConfirm = await showConfirm({
      variant: 'danger',
      title: '⚠️ Permanent Deletion Warning',
      message: confirmMessage,
      confirmText: 'Yes, Delete All',
      cancelText: 'Cancel'
    });
    if (firstConfirm) {
      const finalConfirm = await showConfirm({
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

  const getMealPlanLabel = (mealPlan) => {
    // Use the MealPlanContext to get the meal plan name
    return getMealPlanName(mealPlan);
  };

  const getRoomInfo = (room) => {
    // ... (logic from original file remains the same)
    if (!room) return 'Unknown';
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
    return `${room.room_number} - ${roomType?.name || 'Unknown'}`;
  };

  const groupReservations = (reservations) => {
    // ... (logic from original file remains the same)
    const groups = [];
    const processed = new Set();
    reservations.forEach(reservation => {
      if (processed.has(reservation.id)) return;
      const group = reservations.filter(r => {
        if (processed.has(r.id)) return false;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search guest name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => onNavigate('new-reservation')} className="w-full sm:w-auto">
          <Plus size={20} className="mr-2" /> New Booking
        </Button>
      </div>

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

      {/* Summary Statistics Box */}
      <ReservationSummary
        reservations={reservations}
        filteredReservations={filteredReservations}
        dateFilterType={dateFilterType}
        startDate={startDate}
        endDate={endDate}
        showToggle={true}
        defaultExpanded={true}
      />

      {/* Reservation Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Check-in</TableHead>
                <TableHead>Check-out</TableHead>
                <TableHead>Guests</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupReservations(filteredReservations).length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center">
                    <Calendar size={48} className="mx-auto text-muted-foreground opacity-50" />
                    <p className="mt-4 text-lg font-semibold">No reservations found</p>
                    <p className="text-muted-foreground">Try adjusting your filters</p>
                  </TableCell>
                </TableRow>
              )}
              {groupReservations(filteredReservations).map((group, groupIndex) => {
                const isMultiRoom = group.length > 1;
                const primaryReservation = group[0];
                const groupId = `${primaryReservation.guest_id}-${primaryReservation.check_in_date}-${groupIndex}`;
                const isExpanded = expandedGroups.has(groupId);
                
                const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
                const totalGuests = group.reduce((sum, r) => 
                  sum + (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0), 0
                );
                
                return (
                  <>
                    <TableRow 
                      key={groupId} 
                      className={cn(isMultiRoom && "bg-gray-50 hover:bg-gray-100", isMultiRoom && "cursor-pointer")}
                      onClick={isMultiRoom ? () => toggleGroupExpansion(groupId) : undefined}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {isMultiRoom && <ChevronDown size={16} className={cn("transition-transform", isExpanded && "rotate-180")} />}
                          <div>
                            <div className="flex gap-1 flex-wrap">
                              {primaryReservation.booking_source === 'agent' ? (
                                <Badge variant="info">
                                  <User size={12} className="mr-1" />
                                  Agent{primaryReservation.agents?.name ? `: ${primaryReservation.agents.name}` : ''}
                                </Badge>
                              ) : (
                                <Badge variant="success">
                                  <Building size={12} className="mr-1" />Direct
                                </Badge>
                              )}
                              {primaryReservation.booking_source === 'direct' && primaryReservation.direct_source && (
                                <Badge variant="warning">{primaryReservation.direct_source}</Badge>
                              )}
                            </div>
                            <div className="font-bold mt-1">{primaryReservation.guests?.name || 'Unknown'}</div>
                            <div className="text-xs text-muted-foreground">{primaryReservation.guests?.phone || 'N/A'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isMultiRoom ? (
                          <div>
                            <strong>{group.length} Rooms</strong>
                            <div className="text-xs text-muted-foreground max-w-xs truncate">
                              {group.map(r => r.rooms?.room_number).filter(Boolean).join(', ')}
                            </div>
                          </div>
                        ) : (
                          getRoomInfo(primaryReservation.rooms)
                        )}
                      </TableCell>
                      <TableCell>{primaryReservation.check_in_date}</TableCell>
                      <TableCell>{primaryReservation.check_out_date}</TableCell>
                      <TableCell>
                        {totalGuests} Total
                        <div className="text-xs text-muted-foreground">
                          {isMultiRoom ? (
                            <>
                              {group.reduce((sum, r) => sum + (r.number_of_adults || 0), 0)} A
                              , {group.reduce((sum, r) => sum + (r.number_of_children || 0), 0)} C
                              , {group.reduce((sum, r) => sum + (r.number_of_infants || 0), 0)} I
                            </>
                          ) : (
                            <>
                              {primaryReservation.number_of_adults || 0} A
                              , {primaryReservation.number_of_children || 0} C
                              , {primaryReservation.number_of_infants || 0} I
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>₹{totalAmount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={
                          primaryReservation.payment_status === 'Paid' ? 'success' :
                          primaryReservation.payment_status === 'Partial' ? 'warning' :
                          'destructive'
                        }>
                          {primaryReservation.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {(primaryReservation.status === 'Confirmed' || primaryReservation.status === 'Hold') && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={async () => {
                                if (isMultiRoom) {
                                  const confirmed = await showConfirm({ variant: 'info', title: 'Check In Multiple Rooms', message: `Check in all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Check In All'});
                                  if (confirmed) group.forEach(r => checkIn(r.id));
                                } else handleCheckIn(primaryReservation);
                              }}
                              title="Check In"
                            >
                              <CheckCircle size={16} className="text-green-600" />
                            </Button>
                          )}
                          {primaryReservation.status === 'Checked-in' && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={async () => {
                                if (isMultiRoom) {
                                  const confirmed = await showConfirm({ variant: 'info', title: 'Check Out Multiple Rooms', message: `Check out all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Check Out All'});
                                  if (confirmed) group.forEach(r => checkOut(r.id));
                                } else handleCheckOut(primaryReservation);
                              }}
                              title="Check Out"
                            >
                              <LogOut size={16} className="text-blue-600" />
                            </Button>
                          )}
                          {primaryReservation.status !== 'Cancelled' && primaryReservation.status !== 'Checked-out' && (
                            <>
                              <Button 
                                variant="ghost" size="icon"
                                onClick={() => isMultiRoom ? handleEditGroup(group) : handleEdit(primaryReservation)} 
                                title={isMultiRoom ? "Edit All Rooms" : "Edit"}
                              >
                                <Edit2 size={16} className="text-blue-600" />
                              </Button>
                              <Button 
                                variant="ghost" size="icon"
                                onClick={async () => {
                                  if (isMultiRoom) {
                                    const confirmed = await showConfirm({ variant: 'warning', title: 'Cancel Multiple Reservations', message: `Cancel all ${group.length} rooms for ${primaryReservation.guests?.name}?`, confirmText: 'Cancel All'});
                                    if (confirmed) group.forEach(r => handleCancel(r));
                                  } else handleCancel(primaryReservation);
                                }} 
                                title="Cancel Reservation"
                              >
                                <XOctagon size={16} className="text-red-600" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => isMultiRoom ? handleDeleteGroup(group) : handleDelete(primaryReservation)}
                            title="Delete Permanently"
                          >
                            <Trash2 size={16} className="text-red-800" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    
                    {/* Expanded Room Details */}
                    {isMultiRoom && isExpanded && group.map((reservation, roomIndex) => (
                      <TableRow 
                        key={reservation.id} 
                        className="bg-white hover:bg-white"
                      >
                        <TableCell className="pl-12">
                          <span className="text-xs text-muted-foreground">Room {roomIndex + 1}</span>
                        </TableCell>
                        <TableCell>{getRoomInfo(reservation.rooms)}</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <small>
                            {reservation.number_of_adults || 0} A
                            , {reservation.number_of_children || 0} C
                            , {reservation.number_of_infants || 0} I
                          </small>
                        </TableCell>
                        <TableCell>
                          <small>₹{(reservation.total_amount || 0).toLocaleString()}</small>
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>-</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(reservation)} title="Edit This Room">
                            <Edit2 size={16} className="text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

export default Reservations;