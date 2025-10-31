// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Plus, Edit2, XOctagon, CheckCircle, LogOut, Search, Filter, User, Building, ChevronDown, Calendar } from 'lucide-react';
// Import the shared modal
import { EditBookingModal } from '../../components/reservations/EditBookingModal';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { calculateDays } from '../../utils/helpers';
import styles from './Reservations.module.css';

const Reservations = () => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation } = useReservations();
  const { rooms, roomTypes } = useRooms();
  // Contexts are still needed for the main page, and EditBookingModal will also use them.
  const { guests } = useGuests();
  const { agents } = useAgents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null); // Array of reservations for group editing
  
  // State to hold the initial data for the modal when editing
  const [initialFormData, setInitialFormData] = useState(null);
  const [initialRoomDetails, setInitialRoomDetails] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('all'); // all, weekly, fortnightly, monthly, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Additional filter states
  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [filterGuestCount, setFilterGuestCount] = useState('all'); // all, 1-2, 3-4, 5+
  const [showFilters, setShowFilters] = useState(false);

  // All modal-specific state and logic (formData, roomDetails, guestFormData, 
  // handleNumberOfRoomsChange, updateRoomDetail, getAvailableRoomsByType, 
  // autoAssignRooms, calculateTotal, guest/agent handlers)
  // have been REMOVED from here. They are all handled inside EditBookingModal.

  // Function to set date ranges based on preset
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

  /**
   * This function is passed to EditBookingModal as the onSubmit prop.
   * The modal will call this with the finalized formData and roomDetails.
   */
  const handleSubmit = async (formData, roomDetails) => {
    // Validation is already handled by EditBookingModal
    
    try {
      if (editingReservation) {
        // For editing single reservation
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
        // For editing group of reservations
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
      } else {
        // For new booking, create multiple reservations (one per room)
        const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / formData.number_of_rooms;

        for (let i = 0; i < roomDetails.length; i++) {
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
          await addReservation(reservationData);
        }
      }
      closeModal(); // Close modal on success
    } catch (error) {
      console.error('Error creating/updating reservations:', error);
      alert('Failed to save booking: ' + error.message);
    }
  };

  /**
   * This is the new onClose handler for the modal.
   * It resets all editing state.
   */
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingReservation(null);
    setEditingGroup(null);
    setInitialFormData(null);
    setInitialRoomDetails(null);
  };

  /**
   * Prepares the initial data for the EditBookingModal when editing
   * a single reservation.
   */
  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setEditingGroup(null);
    
    // Get the room type from the reservation's room
    const room = rooms.find(r => r.id === reservation.room_id);
    const roomTypeId = room ? room.room_type_id : '';
    
    // Prepare the props for EditBookingModal
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

    // Set the initial state and open the modal
    setInitialFormData(formData);
    setInitialRoomDetails(roomDetails);
    setIsModalOpen(true);
  };

  /**
   * Prepares the initial data for the EditBookingModal when editing
   * a group of reservations.
   */
  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setEditingReservation(null);
    
    const primaryReservation = group[0];
    
    // Calculate total amount and advance for the group
    const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const totalAdvance = group.reduce((sum, r) => sum + (r.advance_payment || 0), 0);
    
    // Prepare the props for EditBookingModal
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
    
    // Set the initial state and open the modal
    setInitialFormData(formData);
    setInitialRoomDetails(details);
    setIsModalOpen(true);
  };

  const handleCheckIn = (reservation) => {
    if (window.confirm(`Check in ${reservation.guests?.name}?`)) {
      checkIn(reservation.id);
    }
  };

  const handleCheckOut = (reservation) => {
    if (window.confirm(`Check out ${reservation.guests?.name}?`)) {
      checkOut(reservation.id);
    }
  };

  const handleCancel = (reservation) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      cancelReservation(reservation.id);
    }
  };

  const getMealPlanLabel = (mealPlan) => {
    const mealPlans = {
      'NM': 'No Meal',
      'BO': 'Breakfast Only',
      'HB': 'Half Board',
      'FB': 'Full Board'
    };
    return mealPlans[mealPlan] || mealPlan;
  };

  const getRoomInfo = (room) => {
    if (!room) return 'Unknown';
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
    return `${room.room_number} - ${roomType?.name || 'Unknown'}`;
  };

  // Group reservations that belong to the same booking
  const groupReservations = (reservations) => {
    const groups = [];
    const processed = new Set();

    reservations.forEach(reservation => {
      if (processed.has(reservation.id)) return;

      // Find all reservations that match this one (same booking)
      const group = reservations.filter(r => {
        if (processed.has(r.id)) return false;
        
        // Match by guest, dates, and booking source
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

      group.forEach(r => processed.add(r.id));
      groups.push(group);
    });

    return groups;
  };

  // State for expanded groups
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

  // Enhanced filtering with all filters
  const filteredReservations = reservations
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r =>
      r.guests?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.guests?.phone?.includes(searchTerm)
    )
    .filter(r => {
      // Meal plan filter
      if (filterMealPlan === 'all') return true;
      return r.meal_plan === filterMealPlan;
    })
    .filter(r => {
      // Guest count filter
      if (filterGuestCount === 'all') return true;
      const totalGuests = (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0);
      
      switch(filterGuestCount) {
        case '1-2':
          return totalGuests >= 1 && totalGuests <= 2;
        case '3-4':
          return totalGuests >= 3 && totalGuests <= 4;
        case '5+':
          return totalGuests >= 5;
        default:
          return true;
      }
    })
    .filter(r => {
      // Date range filter
      if (dateFilterType === 'all' || (!startDate && !endDate)) return true;
      
      const checkIn = new Date(r.check_in_date);
      const checkOut = new Date(r.check_out_date);
      const filterStart = startDate ? new Date(startDate) : null;
      const filterEnd = endDate ? new Date(endDate) : null;

      // Check if reservation overlaps with date range
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
      // Sort by check-in date in ascending order (earliest first)
      const dateA = new Date(a.check_in_date);
      const dateB = new Date(b.check_in_date);
      return dateA - dateB;
    });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Search Input */}
          <div className="search-box" style={{ width: '300px' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search guest name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="btn-primary"
          >
            <Plus size={20} /> New Booking
          </button>
        </div>
      </div>

      {/* Main Filters - Date Range and Quick Filters (JSX unchanged) */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Filter Header - Collapsible */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              padding: '12px 20px',
              background: '#f9fafb',
              borderBottom: showFilters ? '1px solid #e5e7eb' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} color="#6b7280" />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Filters
              </span>
              {hasActiveFilters() && (
                <span style={{
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '11px',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontWeight: '600'
                }}>
                  Active
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {hasActiveFilters() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Clear All
                </button>
              )}
              <ChevronDown 
                size={16}
                style={{ 
                  color: '#6b7280',
                  transition: 'transform 0.2s',
                  transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            </div>
          </div>

          {/* Filter Content */}
          {showFilters && (
            <div style={{ padding: '20px' }}>
              {/* Quick Date Presets */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setDatePreset('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'all' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'all' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'all' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  All Dates
                </button>
                <button
                  onClick={() => {
                    const today = new Date();
                    setStartDate(today.toISOString().split('T')[0]);
                    setEndDate(today.toISOString().split('T')[0]);
                    setDateFilterType('today');
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'today' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'today' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'today' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => setDatePreset('weekly')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'weekly' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'weekly' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'weekly' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Next 7 Days
                </button>
                <button
                  onClick={() => setDatePreset('fortnightly')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'fortnightly' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'fortnightly' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'fortnightly' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Next 14 Days
                </button>
                <button
                  onClick={() => setDatePreset('monthly')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'monthly' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'monthly' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'monthly' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Next 30 Days
                </button>
                <button
                  onClick={() => setDateFilterType('custom')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: dateFilterType === 'custom' ? '#3b82f6' : 'white',
                    color: dateFilterType === 'custom' ? 'white' : '#374151',
                    fontWeight: dateFilterType === 'custom' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Custom Range
                </button>
              </div>

          {/* Custom Date Range Inputs */}
          {dateFilterType === 'custom' && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  From Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '12px', 
                  color: '#6b7280',
                  marginBottom: '4px'
                }}>
                  To Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>
          )}

          {/* Active Date Filter Display */}
          {dateFilterType !== 'all' && (startDate || endDate) && (
            <div style={{ 
              marginBottom: '16px', 
              padding: '8px 12px', 
              background: '#f0f9ff', 
              borderRadius: '6px',
              fontSize: '13px',
              color: '#1e40af'
            }}>
              <strong>Active Range:</strong> {startDate || '...'} to {endDate || '...'}
            </div>
          )}

          {/* Filter Shortcuts */}
          <div style={{ 
            borderTop: '1px solid #e5e7eb',
            paddingTop: '16px'
          }}>
            {/* Status Filters */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Status
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterStatus('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'all' ? '#6b7280' : 'white',
                    color: filterStatus === 'all' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'all' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterStatus('Inquiry')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Inquiry' ? '#a855f7' : 'white',
                    color: filterStatus === 'Inquiry' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Inquiry' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Inquiry
                </button>
                <button
                  onClick={() => setFilterStatus('Tentative')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Tentative' ? '#f59e0b' : 'white',
                    color: filterStatus === 'Tentative' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Tentative' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Tentative
                </button>
                <button
                  onClick={() => setFilterStatus('Hold')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Hold' ? '#fb923c' : 'white',
                    color: filterStatus === 'Hold' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Hold' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Hold
                </button>
                <button
                  onClick={() => setFilterStatus('Confirmed')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Confirmed' ? '#10b981' : 'white',
                    color: filterStatus === 'Confirmed' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Confirmed' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Confirmed
                </button>
                <button
                  onClick={() => setFilterStatus('Checked-in')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Checked-in' ? '#3b82f6' : 'white',
                    color: filterStatus === 'Checked-in' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Checked-in' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Checked-in
                </button>
                <button
                  onClick={() => setFilterStatus('Checked-out')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Checked-out' ? '#059669' : 'white',
                    color: filterStatus === 'Checked-out' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Checked-out' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Checked-out
                </button>
                <button
                  onClick={() => setFilterStatus('Cancelled')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterStatus === 'Cancelled' ? '#ef4444' : 'white',
                    color: filterStatus === 'Cancelled' ? 'white' : '#374151',
                    fontWeight: filterStatus === 'Cancelled' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancelled
                </button>
              </div>
            </div>

            {/* Meal Plan Filters */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Meal Plan
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterMealPlan('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterMealPlan === 'all' ? '#6b7280' : 'white',
                    color: filterMealPlan === 'all' ? 'white' : '#374151',
                    fontWeight: filterMealPlan === 'all' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterMealPlan('NM')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterMealPlan === 'NM' ? '#64748b' : 'white',
                    color: filterMealPlan === 'NM' ? 'white' : '#374151',
                    fontWeight: filterMealPlan === 'NM' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  No Meal
                </button>
                <button
                  onClick={() => setFilterMealPlan('BO')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterMealPlan === 'BO' ? '#8b5cf6' : 'white',
                    color: filterMealPlan === 'BO' ? 'white' : '#374151',
                    fontWeight: filterMealPlan === 'BO' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Breakfast Only
                </button>
                <button
                  onClick={() => setFilterMealPlan('HB')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterMealPlan === 'HB' ? '#d946ef' : 'white',
                    color: filterMealPlan === 'HB' ? 'white' : '#374151',
                    fontWeight: filterMealPlan === 'HB' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Half Board
                </button>
                <button
                  onClick={() => setFilterMealPlan('FB')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterMealPlan === 'FB' ? '#ec4899' : 'white',
                    color: filterMealPlan === 'FB' ? 'white' : '#374151',
                    fontWeight: filterMealPlan === 'FB' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  Full Board
                </button>
              </div>
            </div>

            {/* Guest Count Filters */}
            <div>
              <div style={{ 
                fontSize: '13px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Number of Guests
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => setFilterGuestCount('all')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterGuestCount === 'all' ? '#6b7280' : 'white',
                    color: filterGuestCount === 'all' ? 'white' : '#374151',
                    fontWeight: filterGuestCount === 'all' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterGuestCount('1-2')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterGuestCount === '1-2' ? '#06b6d4' : 'white',
                    color: filterGuestCount === '1-2' ? 'white' : '#374151',
                    fontWeight: filterGuestCount === '1-2' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  1-2 Guests
                </button>
                <button
                  onClick={() => setFilterGuestCount('3-4')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterGuestCount === '3-4' ? '#0891b2' : 'white',
                    color: filterGuestCount === '3-4' ? 'white' : '#374151',
                    fontWeight: filterGuestCount === '3-4' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  3-4 Guests
                </button>
                <button
                  onClick={() => setFilterGuestCount('5+')}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: filterGuestCount === '5+' ? '#14b8a6' : 'white',
                    color: filterGuestCount === '5+' ? 'white' : '#374151',
                    fontWeight: filterGuestCount === '5+' ? '600' : '500',
                    transition: 'all 0.2s'
                  }}
                >
                  5+ Guests
                </button>
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Statistics Box (JSX unchanged) */}
      <div style={{ 
        marginBottom: '24px', 
        background: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        {/* Summary Header - Collapsible */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '16px 20px',
            background: '#f9fafb',
            borderBottom: showSummary ? '1px solid #e5e7eb' : 'none',
            cursor: 'pointer'
          }}
          onClick={() => setShowSummary(!showSummary)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Summary
            </h3>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>
              Showing <strong style={{ color: '#1f2937' }}>{groupReservations(filteredReservations).length}</strong> {groupReservations(filteredReservations).length === 1 ? 'booking' : 'bookings'} ({filteredReservations.length} {filteredReservations.length === 1 ? 'room' : 'rooms'}) of{' '}
              <strong style={{ color: '#1f2937' }}>{groupReservations(reservations).length}</strong> total bookings
            </div>
          </div>
          <ChevronDown 
            size={16}
            style={{ 
              color: '#6b7280',
              transition: 'transform 0.2s',
              transform: showSummary ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          />
        </div>

        {/* Summary Content */}
        {showSummary && (
          <div style={{ padding: '20px' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '16px'
            }}>
              {/* Status Breakdown */}
              <div style={{ 
                padding: '16px', 
                background: '#f5f3ff', 
                borderRadius: '8px',
                border: '1px solid #e9d5ff',
                gridColumn: 'span 2'
              }}>
                <div style={{ fontSize: '12px', color: '#6b21a8', fontWeight: '600', marginBottom: '8px' }}>
                  Status Breakdown
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['Inquiry', 'Tentative', 'Hold', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled'].map(status => {
                    const count = filteredReservations.filter(r => r.status === status).length;
                    if (count === 0) return null;
                    return (
                      <div key={status} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '13px',
                        color: '#4c1d95'
                      }}>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                        <span>{status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal Plan Breakdown - Enhanced (Guest-focused, Active Only) */}
              <div style={{ 
                padding: '16px', 
                background: '#fef2f2', 
                borderRadius: '8px',
                border: '1px solid #fecaca',
                gridColumn: 'span 2'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px' 
                }}>
                  <div style={{ fontSize: '12px', color: '#991b1b', fontWeight: '600' }}>
                    Meal Plans
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#7f1d1d' }}>
                    {filteredReservations
                      .filter(r => r.status !== 'Checked-out')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      )} Guests
                  </div>
                </div>
                
                {/* Meal Plan Distribution */}
                <div style={{ 
                  borderTop: '1px solid #fecaca',
                  paddingTop: '8px',
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {[
                    { code: 'NM', label: 'No Meal', color: '#64748b' },
                    { code: 'BO', label: 'Breakfast Only', color: '#8b5cf6' },
                    { code: 'HB', label: 'Half Board', color: '#d946ef' },
                    { code: 'FB', label: 'Full Board', color: '#ec4899' }
                  ].map(({ code, label, color }) => {
                    const guestCount = filteredReservations
                      .filter(r => r.meal_plan === code && r.status !== 'Checked-out')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      );
                    
                    if (guestCount === 0) return null;
                    
                    return (
                      <div key={code} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '12px',
                        color: '#7f1d1d'
                      }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: color 
                        }} />
                        <span style={{ fontWeight: '500' }}>{label}:</span>
                        <span style={{ fontWeight: '600', color: '#991b1b' }}>
                          {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Meal Plan Percentage Bar */}
                <div style={{ 
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #fecaca'
                }}>
                  <div style={{ 
                    height: '8px', 
                    background: '#fee2e2', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    display: 'flex'
                  }}>
                    {[
                      { code: 'NM', color: '#64748b' },
                      { code: 'BO', color: '#8b5cf6' },
                      { code: 'HB', color: '#d946ef' },
                      { code: 'FB', color: '#ec4899' }
                    ].map(({ code, color }) => {
                      const guestCount = filteredReservations
                        .filter(r => r.meal_plan === code && r.status !== 'Checked-out')
                        .reduce((sum, r) => 
                          sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                        );
                      
                      const totalGuests = filteredReservations
                        .filter(r => r.status !== 'Checked-out')
                        .reduce((sum, r) => 
                          sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                        );
                      
                      const percentage = totalGuests > 0 ? (guestCount / totalGuests * 100) : 0;
                      
                      if (percentage === 0) return null;
                      
                      return (
                        <div 
                          key={code}
                          style={{ 
                            width: `${percentage}%`,
                            background: color,
                            transition: 'width 0.3s ease'
                          }}
                          title={`${code}: ${guestCount} guests (${percentage.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Total Guests - Enhanced (Only Confirmed & Checked-in) */}
              <div style={{ 
                padding: '16px', 
                background: '#fce7f3', 
                borderRadius: '8px',
                border: '1px solid #fbcfe8',
                gridColumn: 'span 2'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px' 
                }}>
                  <div style={{ fontSize: '12px', color: '#9f1239', fontWeight: '600' }}>
                    Total Guests (Active)
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#881337' }}>
                    {filteredReservations
                      .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      )}
                  </div>
                </div>
                
                {/* Guest Breakdown by Status */}
                <div style={{ 
                  borderTop: '1px solid #fbcfe8',
                  paddingTop: '8px',
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px' 
                }}>
                  {[
                    { status: 'Checked-in', color: '#3b82f6' },
                    { status: 'Confirmed', color: '#10b981' },
                    { status: 'Checked-out', color: '#6b7280' },
                    { status: 'Tentative', color: '#f59e0b' },
                    { status: 'Hold', color: '#fb923c' }
                  ].map(({ status, color }) => {
                    const guestCount = filteredReservations
                      .filter(r => r.status === status)
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      );
                    
                    if (guestCount === 0) return null;
                    
                    // Dim out checked-out guests visually
                    const isCheckedOut = status === 'Checked-out';
                    
                    return (
                      <div key={status} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '12px',
                        color: isCheckedOut ? '#9ca3af' : '#831843',
                        opacity: isCheckedOut ? 0.6 : 1
                      }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: color,
                          opacity: isCheckedOut ? 0.5 : 1
                        }} />
                        <span style={{ fontWeight: '600' }}>{guestCount}</span>
                        <span>{status}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Guest Type Breakdown (Adults/Children/Infants) - Only Active */}
                <div style={{ 
                  borderTop: '1px solid #fbcfe8',
                  marginTop: '8px',
                  paddingTop: '8px',
                  display: 'flex',
                  gap: '12px',
                  fontSize: '12px',
                  color: '#831843'
                }}>
                  <div>
                    <span style={{ fontWeight: '600' }}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_adults || 0), 0)}
                    </span> Adults
                  </div>
                  <div>
                    <span style={{ fontWeight: '600' }}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_children || 0), 0)}
                    </span> Children
                  </div>
                  <div>
                    <span style={{ fontWeight: '600' }}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_infants || 0), 0)}
                    </span> Infants
                  </div>
                </div>
                
                <div style={{ 
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #fbcfe8',
                  fontSize: '11px',
                  color: '#9ca3af',
                  fontStyle: 'italic'
                }}>
                  * Only includes Confirmed and Checked-in guests
                </div>
              </div>

              {/* Payment Status Breakdown */}
              <div style={{ 
                padding: '16px', 
                background: '#ecfeff', 
                borderRadius: '8px',
                border: '1px solid #a5f3fc',
                gridColumn: 'span 2'
              }}>
                <div style={{ fontSize: '12px', color: '#0e7490', fontWeight: '600', marginBottom: '8px' }}>
                  Payment Status
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {['Paid', 'Partial', 'Pending'].map(paymentStatus => {
                    const count = filteredReservations.filter(r => r.payment_status === paymentStatus).length;
                    if (count === 0) return null;
                    return (
                      <div key={paymentStatus} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontSize: '13px',
                        color: '#164e63'
                      }}>
                        <span style={{ fontWeight: '600' }}>{count}</span>
                        <span>{paymentStatus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Financial Summary */}
              <div style={{ 
                padding: '16px', 
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', 
                borderRadius: '8px',
                border: '1px solid #bbf7d0',
                gridColumn: 'span 2'
              }}>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#15803d', 
                  fontWeight: '600', 
                  marginBottom: '12px' 
                }}>
                  Financial Summary
                </div>
                
                {/* Total Revenue - Primary */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#166534', 
                    fontWeight: '500',
                    marginBottom: '2px' 
                  }}>
                    Total Revenue
                  </div>
                  <div style={{ 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: '#14532d',
                    lineHeight: '1'
                  }}>
                    â‚¹{filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0).toLocaleString()}
                  </div>
                </div>
                
                {/* Advance & Balance - Side by Side */}
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #bbf7d0'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#166534', 
                      fontWeight: '500',
                      marginBottom: '4px' 
                    }}>
                      Advance Collected
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#15803d' 
                    }}>
                      â‚¹{filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0).toLocaleString()}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#166534', 
                      fontWeight: '500',
                      marginBottom: '4px' 
                    }}>
                      Balance Due
                    </div>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#92400e' 
                    }}>
                      â‚¹{filteredReservations.reduce((sum, r) => sum + ((r.total_amount || 0) - (r.advance_payment || 0)), 0).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                {/* Payment Progress Bar */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ 
                    height: '6px', 
                    background: '#e5e7eb', 
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      height: '100%',
                      background: '#15803d',
                      width: `${
                        filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) > 0
                          ? (filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0) / 
                             filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) * 100)
                          : 0
                      }%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6b7280', 
                    marginTop: '4px',
                    textAlign: 'center'
                  }}>
                    {filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) > 0
                      ? Math.round(
                          (filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0) / 
                           filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) * 100)
                        )
                      : 0}% Collected
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reservation Table (JSX unchanged) */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th>Guests</th>
              <th>Meal Plan</th>
              <th>Amount</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupReservations(filteredReservations).map((group, groupIndex) => {
              const isMultiRoom = group.length > 1;
              const primaryReservation = group[0];
              const groupId = `${primaryReservation.guest_id}-${primaryReservation.check_in_date}-${groupIndex}`;
              const isExpanded = expandedGroups.has(groupId);
              
              // Calculate totals for the group
              const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
              const totalGuests = group.reduce((sum, r) => 
                sum + (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0), 0
              );
              
              return (
                <>
                  {/* Main Group Row */}
                  <tr key={groupId} style={{ background: isMultiRoom ? '#f9fafb' : 'white' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isMultiRoom && (
                          <button
                            onClick={() => toggleGroupExpansion(groupId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              color: '#3b82f6'
                            }}
                            title={isExpanded ? 'Collapse rooms' : 'Expand rooms'}
                          >
                            <ChevronDown 
                              size={16} 
                              style={{ 
                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s'
                              }} 
                            />
                          </button>
                        )}
                        <div>
                          <div className={styles.bookingBadges}>
                            {/* Multi-room badge */}
                            {isMultiRoom && (
                              <span className={`${styles.bookingBadge}`} style={{
                                background: '#dbeafe',
                                color: '#1e40af',
                                border: '1px solid #93c5fd',
                                fontWeight: '600'
                              }}>
                                {group.length} Rooms
                              </span>
                            )}
                            
                            {/* Booking Source Badge */}
                            {primaryReservation.booking_source === 'agent' ? (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeAgent}`}>
                                <User size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                Agent{primaryReservation.agents?.name ? `: ${primaryReservation.agents.name}` : ''}
                              </span>
                            ) : (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeDirect}`}>
                                <Building size={14} style={{ display: 'inline', marginRight: '4px' }} />Direct
                              </span>
                            )}
                            
                            {/* Direct Source Badge */}
                            {primaryReservation.booking_source === 'direct' && primaryReservation.direct_source && (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeSource}`}>
                                {primaryReservation.direct_source}
                              </span>
                            )}
                          </div>
                          <strong>{primaryReservation.guests?.name || 'Unknown'}</strong>
                          <br />
                          <small style={{color: '#6b7280'}}>
                            {primaryReservation.guests?.phone || 'N/A'}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      {isMultiRoom ? (
                        <div>
                          <strong>{group.length} Rooms</strong>
                          <br />
                          <small style={{color: '#6b7280'}}>
                            {group.map(r => r.rooms?.room_number).filter(Boolean).join(', ')}
                          </small>
                        </div>
                      ) : (
                        getRoomInfo(primaryReservation.rooms)
                      )}
                    </td>
                    <td>{primaryReservation.check_in_date}</td>
                    <td>{primaryReservation.check_out_date}</td>
                    <td>
                      {totalGuests} Total
                      {isMultiRoom && (
                        <>
                          <br />
                          <small style={{color: '#6b7280'}}>
                            {group.reduce((sum, r) => sum + (r.number_of_adults || 0), 0)} Adults
                            {group.reduce((sum, r) => sum + (r.number_of_children || 0), 0) > 0 && 
                              `, ${group.reduce((sum, r) => sum + (r.number_of_children || 0), 0)} Children`}
                            {group.reduce((sum, r) => sum + (r.number_of_infants || 0), 0) > 0 && 
                              `, ${group.reduce((sum, r) => sum + (r.number_of_infants || 0), 0)} Infants`}
                          </small>
                        </>
                      )}
                      {!isMultiRoom && (
                        <>
                          <br />
                          <small style={{color: '#6b7280'}}>
                            {primaryReservation.number_of_adults || 0} Adults
                            {primaryReservation.number_of_children > 0 && `, ${primaryReservation.number_of_children} Children`}
                            {primaryReservation.number_of_infants > 0 && `, ${primaryReservation.number_of_infants} Infants`}
                          </small>
                        </>
                      )}
                    </td>
                    <td>
                      <span className="bill-type-badge">
                        {getMealPlanLabel(primaryReservation.meal_plan)}
                      </span>
                    </td>
                    <td>â‚¹{totalAmount.toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${
                        primaryReservation.payment_status === 'Paid' ? 'status-available' :
                        primaryReservation.payment_status === 'Partial' ? 'status-maintenance' :
                        'status-blocked'
                      }`}>
                        {primaryReservation.payment_status}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${
                        primaryReservation.status === 'Inquiry' ? styles.statusInquiry :
                        primaryReservation.status === 'Tentative' ? styles.statusTentative :
                        primaryReservation.status === 'Hold' ? styles.statusHold :
                        primaryReservation.status === 'Confirmed' ? 'status-maintenance' :
                        primaryReservation.status === 'Checked-in' ? 'status-occupied' :
                        primaryReservation.status === 'Checked-out' ? 'status-available' :
                        'status-blocked'
                      }`}>
                        {primaryReservation.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {(primaryReservation.status === 'Confirmed' || primaryReservation.status === 'Hold') && (
                          <button
                            onClick={() => {
                              // Check in all rooms in the group
                              if (isMultiRoom) {
                                if (window.confirm(`Check in all ${group.length} rooms for ${primaryReservation.guests?.name}?`)) {
                                  group.forEach(r => checkIn(r.id));
                                }
                              } else {
                                handleCheckIn(primaryReservation);
                              }
                            }}
                            className="btn-icon btn-success"
                            title="Check In"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {primaryReservation.status === 'Checked-in' && (
                          <button
                            onClick={() => {
                              // Check out all rooms in the group
                              if (isMultiRoom) {
                                if (window.confirm(`Check out all ${group.length} rooms for ${primaryReservation.guests?.name}?`)) {
                                  group.forEach(r => checkOut(r.id));
                                }
                              } else {
                                handleCheckOut(primaryReservation);
                              }
                            }}
                            className="btn-icon btn-success"
                            title="Check Out"
                          >
                            <LogOut size={16} />
                          </button>
                        )}
                        {primaryReservation.status !== 'Cancelled' && primaryReservation.status !== 'Checked-out' && (
                          <>
                            {isMultiRoom ? (
                              <button 
                                onClick={() => handleEditGroup(group)} 
                                className="btn-icon btn-edit"
                                title="Edit All Rooms"
                              >
                                <Edit2 size={16} />
                              </button>
                            ) : (
                              <button onClick={() => handleEdit(primaryReservation)} className="btn-icon btn-edit">
                                <Edit2 size={16} />
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                if (isMultiRoom) {
                                  if (window.confirm(`Cancel all ${group.length} rooms for ${primaryReservation.guests?.name}?`)) {
                                    group.forEach(r => handleCancel(r));
                                  }
                                } else {
                                  handleCancel(primaryReservation);
                                }
                              }} 
                              className="btn-icon btn-delete"
                            >
                              <XOctagon size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Room Details */}
                  {isMultiRoom && isExpanded && group.map((reservation, roomIndex) => (
                    <tr 
                      key={reservation.id} 
                      style={{ 
                        background: '#ffffff',
                        borderLeft: '4px solid #3b82f6'
                      }}
                    >
                      <td style={{ paddingLeft: '48px' }}>
                        <small style={{ color: '#6b7280' }}>Room {roomIndex + 1}</small>
                      </td>
                      <td>{getRoomInfo(reservation.rooms)}</td>
                      <td>-</td>
                      <td>-</td>
                      <td>
                        <small>
                          {reservation.number_of_adults || 0} Adults
                          {reservation.number_of_children > 0 && `, ${reservation.number_of_children} Children`}
                          {reservation.number_of_infants > 0 && `, ${reservation.number_of_infants} Infants`}
                        </small>
                      </td>
                      <td>-</td>
                      <td>
                        <small>â‚¹{(reservation.total_amount || 0).toLocaleString()}</small>
                      </td>
                      <td>-</td>
                      <td>-</td>
                      <td>
                        <div className="action-buttons">
                          <button onClick={() => handleEdit(reservation)} className="btn-icon btn-edit">
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              );
            })}
          </tbody>
        </table>

        {groupReservations(filteredReservations).length === 0 && (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', marginBottom: '8px' }}>No reservations found</p>
            <p style={{ fontSize: '14px' }}>Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* REMOVED: All of the old modal JSX (over 400 lines)
      that was here (lines 1443-1825 in the original file).
      
      */}

      {/* REPLACEMENT: The single, reusable EditBookingModal component */}
      <EditBookingModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        editingReservation={editingReservation}
        editingGroup={editingGroup}
        initialFormData={initialFormData}
        initialRoomDetails={initialRoomDetails}
      />
    </div>
  );
};

export default Reservations;