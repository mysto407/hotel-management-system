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
import styles from './Reservations.module.css'; // Import the new CSS module

const Reservations = () => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { guests } = useGuests();
  const { agents } = useAgents();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [initialFormData, setInitialFormData] = useState(null);
  const [initialRoomDetails, setInitialRoomDetails] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSummary, setShowSummary] = useState(true);
  
  const [dateFilterType, setDateFilterType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [filterGuestCount, setFilterGuestCount] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

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
   */
  const handleSubmit = async (formData, roomDetails) => {
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

  /**
   * Prepares the initial data for the EditBookingModal when editing
   * a group of reservations.
   */
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

      const group = reservations.filter(r => {
        if (processed.has(r.id)) return false;
        
        const sameGuest = r.guest_id === reservation.guest_id;
        const sameDates = r.check_in_date === reservation.check_in_date && 
                         r.check_out_date === reservation.check_out_date;
        const sameSource = r.booking_source === reservation.booking_source && 
                          r.agent_id === reservation.agent_id;
        const sameMealPlan = r.meal_plan === reservation.meal_plan;
        
        const timeDiff = Math.abs(new Date(r.created_at) - new Date(reservation.created_at));
        const createdTogether = timeDiff < 30000; // 30 seconds
        
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

  // Enhanced filtering with all filters
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <div className={styles.headerActions}>
          {/* Search Input */}
          <div className={styles.searchBox}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search guest name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

      {/* Main Filters - Date Range and Quick Filters */}
      <div className={styles.filterContainer}>
        <div className={styles.filterBox}>
          {/* Filter Header - Collapsible */}
          <div 
            className={`${styles.filterHeader} ${!showFilters ? styles.filterHeaderClosed : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div className={styles.filterHeaderContent}>
              <Filter size={16} color="#6b7280" />
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                Filters
              </span>
              {hasActiveFilters() && (
                <span className={styles.filterActiveBadge}>
                  Active
                </span>
              )}
            </div>
            <div className={styles.filterHeaderActions}>
              {hasActiveFilters() && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearAllFilters();
                  }}
                  className={styles.clearFiltersButton}
                >
                  Clear All
                </button>
              )}
              <ChevronDown 
                size={16}
                className={`${styles.filterChevron} ${showFilters ? styles.filterChevronOpen : ''}`}
              />
            </div>
          </div>

          {/* Filter Content */}
          {showFilters && (
            <div className={styles.filterBody}>
              {/* Quick Date Presets */}
              <div className={styles.datePresetButtons}>
                <button
                  onClick={() => setDatePreset('all')}
                  className={`${styles.presetButton} ${dateFilterType === 'all' ? styles.active : ''}`}
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
                  className={`${styles.presetButton} ${dateFilterType === 'today' ? styles.active : ''}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setDatePreset('weekly')}
                  className={`${styles.presetButton} ${dateFilterType === 'weekly' ? styles.active : ''}`}
                >
                  Next 7 Days
                </button>
                <button
                  onClick={() => setDatePreset('fortnightly')}
                  className={`${styles.presetButton} ${dateFilterType === 'fortnightly' ? styles.active : ''}`}
                >
                  Next 14 Days
                </button>
                <button
                  onClick={() => setDatePreset('monthly')}
                  className={`${styles.presetButton} ${dateFilterType === 'monthly' ? styles.active : ''}`}
                >
                  Next 30 Days
                </button>
                <button
                  onClick={() => setDateFilterType('custom')}
                  className={`${styles.presetButton} ${dateFilterType === 'custom' ? styles.active : ''}`}
                >
                  Custom Range
                </button>
              </div>

              {/* Custom Date Range Inputs */}
              {dateFilterType === 'custom' && (
                <div className={styles.customDateInputs}>
                  <div className={styles.dateInputGroup}>
                    <label className={styles.dateInputLabel}>
                      From Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                  <div className={styles.dateInputGroup}>
                    <label className={styles.dateInputLabel}>
                      To Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className={styles.dateInput}
                    />
                  </div>
                </div>
              )}

              {/* Active Date Filter Display */}
              {dateFilterType !== 'all' && (startDate || endDate) && (
                <div className={styles.activeDateRange}>
                  <strong>Active Range:</strong> {startDate || '...'} to {endDate || '...'}
                </div>
              )}

              {/* Filter Shortcuts */}
              <div className={styles.filterShortcuts}>
                {/* Status Filters */}
                <div className={styles.filterGroup}>
                  <div className={styles.filterGroupTitle}>
                    Status
                  </div>
                  <div className={styles.filterButtonGroup}>
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`${styles.filterButton} ${styles.all} ${filterStatus === 'all' ? styles.active : ''}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus('Inquiry')}
                      className={`${styles.filterButton} ${styles.inquiry} ${filterStatus === 'Inquiry' ? styles.active : ''}`}
                    >
                      Inquiry
                    </button>
                    <button
                      onClick={() => setFilterStatus('Tentative')}
                      className={`${styles.filterButton} ${styles.tentative} ${filterStatus === 'Tentative' ? styles.active : ''}`}
                    >
                      Tentative
                    </button>
                    <button
                      onClick={() => setFilterStatus('Hold')}
                      className={`${styles.filterButton} ${styles.hold} ${filterStatus === 'Hold' ? styles.active : ''}`}
                    >
                      Hold
                    </button>
                    <button
                      onClick={() => setFilterStatus('Confirmed')}
                      className={`${styles.filterButton} ${styles.confirmed} ${filterStatus === 'Confirmed' ? styles.active : ''}`}
                    >
                      Confirmed
                    </button>
                    <button
                      onClick={() => setFilterStatus('Checked-in')}
                      className={`${styles.filterButton} ${styles.checkedIn} ${filterStatus === 'Checked-in' ? styles.active : ''}`}
                    >
                      Checked-in
                    </button>
                    <button
                      onClick={() => setFilterStatus('Checked-out')}
                      className={`${styles.filterButton} ${styles.checkedOut} ${filterStatus === 'Checked-out' ? styles.active : ''}`}
                    >
                      Checked-out
                    </button>
                    <button
                      onClick={() => setFilterStatus('Cancelled')}
                      className={`${styles.filterButton} ${styles.cancelled} ${filterStatus === 'Cancelled' ? styles.active : ''}`}
                    >
                      Cancelled
                    </button>
                  </div>
                </div>

                {/* Meal Plan Filters */}
                <div className={styles.filterGroup}>
                  <div className={styles.filterGroupTitle}>
                    Meal Plan
                  </div>
                  <div className={styles.filterButtonGroup}>
                    <button
                      onClick={() => setFilterMealPlan('all')}
                      className={`${styles.filterButton} ${styles.all} ${filterMealPlan === 'all' ? styles.active : ''}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterMealPlan('NM')}
                      className={`${styles.filterButton} ${styles.nm} ${filterMealPlan === 'NM' ? styles.active : ''}`}
                    >
                      No Meal
                    </button>
                    <button
                      onClick={() => setFilterMealPlan('BO')}
                      className={`${styles.filterButton} ${styles.bo} ${filterMealPlan === 'BO' ? styles.active : ''}`}
                    >
                      Breakfast Only
                    </button>
                    <button
                      onClick={() => setFilterMealPlan('HB')}
                      className={`${styles.filterButton} ${styles.hb} ${filterMealPlan === 'HB' ? styles.active : ''}`}
                    >
                      Half Board
                    </button>
                    <button
                      onClick={() => setFilterMealPlan('FB')}
                      className={`${styles.filterButton} ${styles.fb} ${filterMealPlan === 'FB' ? styles.active : ''}`}
                    >
                      Full Board
                    </button>
                  </div>
                </div>

                {/* Guest Count Filters */}
                <div className={styles.filterGroup}>
                  <div className={styles.filterGroupTitle}>
                    Number of Guests
                  </div>
                  <div className={styles.filterButtonGroup}>
                    <button
                      onClick={() => setFilterGuestCount('all')}
                      className={`${styles.filterButton} ${styles.guestAll} ${filterGuestCount === 'all' ? styles.active : ''}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterGuestCount('1-2')}
                      className={`${styles.filterButton} ${styles.guest12} ${filterGuestCount === '1-2' ? styles.active : ''}`}
                    >
                      1-2 Guests
                    </button>
                    <button
                      onClick={() => setFilterGuestCount('3-4')}
                      className={`${styles.filterButton} ${styles.guest34} ${filterGuestCount === '3-4' ? styles.active : ''}`}
                    >
                      3-4 Guests
                    </button>
                    <button
                      onClick={() => setFilterGuestCount('5+')}
                      className={`${styles.filterButton} ${styles.guest5plus} ${filterGuestCount === '5+' ? styles.active : ''}`}
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

      {/* Summary Statistics Box */}
      <div className={styles.summaryContainer}>
        {/* Summary Header - Collapsible */}
        <div 
          className={`${styles.summaryHeader} ${!showSummary ? styles.summaryHeaderClosed : ''}`}
          onClick={() => setShowSummary(!showSummary)}
        >
          <div className={styles.summaryHeaderContent}>
            <h3 className={styles.summaryTitle}>
              Summary
            </h3>
            <div className={styles.summarySubtitle}>
              Showing <strong className={styles.summaryCount}>{groupReservations(filteredReservations).length}</strong> {groupReservations(filteredReservations).length === 1 ? 'booking' : 'bookings'} ({filteredReservations.length} {filteredReservations.length === 1 ? 'room' : 'rooms'}) of{' '}
              <strong className={styles.summaryCount}>{groupReservations(reservations).length}</strong> total bookings
            </div>
          </div>
          <ChevronDown 
            size={16}
            className={`${styles.filterChevron} ${showSummary ? styles.filterChevronOpen : ''}`}
          />
        </div>

        {/* Summary Content */}
        {showSummary && (
          <div className={styles.summaryBody}>
            <div className={styles.summaryGrid}>
              
              {/* Status Breakdown */}
              <div className={`${styles.summaryCard} ${styles.status}`}>
                <div className={styles.summaryCardTitle}>
                  Status Breakdown
                </div>
                <div className={styles.summaryCardRow}>
                  {['Inquiry', 'Tentative', 'Hold', 'Confirmed', 'Checked-in', 'Checked-out', 'Cancelled'].map(status => {
                    const count = filteredReservations.filter(r => r.status === status).length;
                    if (count === 0) return null;
                    return (
                      <div key={status} className={styles.summaryCardItem}>
                        <span className={styles.summaryCardItemValue}>{count}</span>
                        <span>{status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Meal Plan Breakdown */}
              <div className={`${styles.summaryCard} ${styles.mealPlan}`}>
                <div className={styles.summaryCardHeader}>
                  <div className={styles.summaryCardTitle}>
                    Meal Plans
                  </div>
                  <div className={styles.summaryCardLargeValue}>
                    {filteredReservations
                      .filter(r => r.status !== 'Checked-out')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      )} Guests
                  </div>
                </div>
                
                {/* Meal Plan Distribution */}
                <div className={`${styles.summaryCardRow} ${styles.bordered}`}>
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
                      <div key={code} className={`${styles.summaryCardItem} ${styles.mealPlan}`}>
                        <span 
                          className={styles.mealPlanDot} 
                          style={{ background: color }} 
                        />
                        <span className={styles.mealPlanLabel}>{label}:</span>
                        <span className={styles.mealPlanValue}>
                          {guestCount} {guestCount === 1 ? 'guest' : 'guests'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Meal Plan Percentage Bar */}
                <div className={styles.progressBarContainer}>
                  <div className={styles.progressBar}>
                    {[
                      { code: 'nm', color: '#64748b' },
                      { code: 'bo', color: '#8b5cf6' },
                      { code: 'hb', color: '#d946ef' },
                      { code: 'fb', color: '#ec4899' }
                    ].map(({ code, color }) => {
                      const guestCount = filteredReservations
                        .filter(r => r.meal_plan === code.toUpperCase() && r.status !== 'Checked-out')
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
                          style={{ width: `${percentage}%` }}
                          className={`${styles.progressBarSegment} ${styles[code]}`}
                          title={`${code.toUpperCase()}: ${guestCount} guests (${percentage.toFixed(1)}%)`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Total Guests */}
              <div className={`${styles.summaryCard} ${styles.guests}`}>
                <div className={styles.summaryCardHeader}>
                  <div className={styles.summaryCardTitle}>
                    Total Guests (Active)
                  </div>
                  <div className={styles.summaryCardLargeValue}>
                    {filteredReservations
                      .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      )}
                  </div>
                </div>
                
                {/* Guest Breakdown by Status */}
                <div className={`${styles.summaryCardRow} ${styles.bordered}`}>
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
                    const isCheckedOut = status === 'Checked-out';
                    
                    return (
                      <div key={status} className={`${styles.summaryCardItem} ${styles.guestStatus} ${isCheckedOut ? styles.checkedOut : ''}`}>
                        <span 
                          className={`${styles.guestStatusDot} ${isCheckedOut ? styles.checkedOut : ''}`}
                          style={{ background: color }} 
                        />
                        <span className={styles.summaryCardItemValue}>{guestCount}</span>
                        <span>{status}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Guest Type Breakdown (Adults/Children/Infants) - Only Active */}
                <div className={styles.guestTypeRow}>
                  <div>
                    <span>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_adults || 0), 0)}
                    </span> Adults
                  </div>
                  <div>
                    <span>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_children || 0), 0)}
                    </span> Children
                  </div>
                  <div>
                    <span>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_infants || 0), 0)}
                    </span> Infants
                  </div>
                </div>
                
                <div className={styles.summaryCardFooter}>
                  * Only includes Confirmed and Checked-in guests
                </div>
              </div>

              {/* Payment Status Breakdown */}
              <div className={`${styles.summaryCard} ${styles.paymentStatus}`}>
                <div className={styles.summaryCardTitle}>
                  Payment Status
                </div>
                <div className={styles.summaryCardRow}>
                  {['Paid', 'Partial', 'Pending'].map(paymentStatus => {
                    const count = filteredReservations.filter(r => r.payment_status === paymentStatus).length;
                    if (count === 0) return null;
                    return (
                      <div key={paymentStatus} className={styles.summaryCardItem}>
                        <span className={styles.summaryCardItemValue}>{count}</span>
                        <span>{paymentStatus}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Combined Financial Summary */}
              <div className={`${styles.summaryCard} ${styles.financial}`}>
                <div className={styles.summaryCardTitle}>
                  Financial Summary
                </div>
                
                {/* Total Revenue - Primary */}
                <div className={styles.financialRevenueBlock}>
                  <div className={styles.financialRevenueLabel}>
                    Total Revenue
                  </div>
                  <div className={styles.financialRevenueValue}>
                    â‚¹{filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0).toLocaleString()}
                  </div>
                </div>
                
                {/* Advance & Balance - Side by Side */}
                <div className={styles.financialSplitRow}>
                  <div className={styles.financialSplitItem}>
                    <div className={styles.financialSplitLabel}>
                      Advance Collected
                    </div>
                    <div className={`${styles.financialSplitValue} ${styles.advance}`}>
                    + ₹{filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0).toLocaleString()}                    </div>
                  </div>
                  
                  <div className={styles.financialSplitItem}>
                    <div className={styles.financialSplitLabel}>
                      Balance Due
                    </div>
                    <div className={`${styles.financialSplitValue} ${styles.balance}`}>
                    - â‚¹{filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0).toLocaleString()}
+ ₹{filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0).toLocaleString()}                    </div>
                  </div>
                </div>
                
                {/* Payment Progress Bar */}
                <div className={styles.progressContainer}>
                  <div className={styles.progressBarBackground}>
                    <div 
                      className={styles.paymentProgressBar}
                      style={{ 
                        width: `${
                          filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) > 0
                            ? (filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0) / 
                              filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) * 100)
                            : 0
                        }%`
                      }} 
                    />
                  </div>
                  <div className={styles.progressLabel}>
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

      {/* Reservation Table */}
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
              
              const totalAmount = group.reduce((sum, r) => sum + (r.total_amount || 0), 0);
              const totalGuests = group.reduce((sum, r) => 
                sum + (r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0), 0
              );
              
              return (
                <>
                  {/* Main Group Row */}
                  <tr key={groupId} className={isMultiRoom ? styles.groupRow : ''}>
                    <td>
                      <div className={styles.guestCell}>
                        {isMultiRoom && (
                          <button
                            onClick={() => toggleGroupExpansion(groupId)}
                            className={styles.expandButton}
                            title={isExpanded ? 'Collapse rooms' : 'Expand rooms'}
                          >
                            <ChevronDown 
                              size={16} 
                              className={`${styles.expandChevron} ${isExpanded ? styles.expandChevronOpen : ''}`} 
                            />
                          </button>
                        )}
                        <div>
                          <div className={styles.bookingBadges}>
                            {isMultiRoom && (
                              <span className={`${styles.bookingBadge} ${styles.multiRoom}`}>
                                {group.length} Rooms
                              </span>
                            )}
                            
                            {primaryReservation.booking_source === 'agent' ? (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeAgent}`}>
                                <User size={14} />
                                Agent{primaryReservation.agents?.name ? `: ${primaryReservation.agents.name}` : ''}
                              </span>
                            ) : (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeDirect}`}>
                                <Building size={14} />Direct
                              </span>
                            )}
                            
                            {primaryReservation.booking_source === 'direct' && primaryReservation.direct_source && (
                              <span className={`${styles.bookingBadge} ${styles.bookingBadgeSource}`}>
                                {primaryReservation.direct_source}
                              </span>
                            )}
                          </div>
                          <strong>{primaryReservation.guests?.name || 'Unknown'}</strong>
                          <br />
                          <small className={styles.guestPhone}>
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
                          <small className={styles.roomList}>
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
                          <small className={styles.guestCountBreakdown}>
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
                          <small className={styles.guestCountBreakdown}>
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
                      className={styles.subRoomRow}
                    >
                      <td className={styles.subRoomCell}>
                        <small className={styles.subRoomLabel}>Room {roomIndex + 1}</small>
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
          <div className={styles.noResults}>
            <Calendar size={48} className={styles.noResultsIcon} />
            <p className={styles.noResultsText}>No reservations found</p>
            <p className={styles.noResultsSubtext}>Try adjusting your filters</p>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default Reservations;