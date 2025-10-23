// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Plus, Edit2, XOctagon, Save, XCircle, CheckCircle, LogOut, Search, Filter, UserPlus, Calendar } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { calculateDays } from '../../utils/helpers';

const Reservations = () => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { guests, getGuestByPhone, addGuest } = useGuests();
  const { agents, addAgent } = useAgents();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  
  // Date filter states
  const [dateFilterType, setDateFilterType] = useState('all'); // all, weekly, fortnightly, monthly, custom
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Additional filter states
  const [filterMealPlan, setFilterMealPlan] = useState('all');
  const [filterGuestCount, setFilterGuestCount] = useState('all'); // all, 1-2, 3-4, 5+
  const [showFilters, setShowFilters] = useState(false);

  const [formData, setFormData] = useState({
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    guest_id: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0,
    meal_plan: 'NM',
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
    status: 'Confirmed',
    special_requests: ''
  });

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

  const [agentFormData, setAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission: '',
    address: ''
  });

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

  const handleSubmit = async () => {
    if (!formData.guest_id || !formData.room_id || !formData.check_in_date || !formData.check_out_date) {
      alert('Please fill all required fields');
      return;
    }

    const reservationData = {
      booking_source: formData.booking_source,
      agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
      direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
      guest_id: formData.guest_id,
      room_id: formData.room_id,
      check_in_date: formData.check_in_date,
      check_out_date: formData.check_out_date,
      number_of_adults: parseInt(formData.number_of_adults),
      number_of_children: parseInt(formData.number_of_children),
      number_of_infants: parseInt(formData.number_of_infants),
      number_of_guests: parseInt(formData.number_of_adults) + parseInt(formData.number_of_children) + parseInt(formData.number_of_infants),
      meal_plan: formData.meal_plan,
      total_amount: parseFloat(formData.total_amount),
      advance_payment: parseFloat(formData.advance_payment),
      payment_status: formData.payment_status,
      status: formData.status,
      special_requests: formData.special_requests
    };

    if (editingReservation) {
      await updateReservation(editingReservation.id, reservationData);
    } else {
      await addReservation(reservationData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      booking_source: 'direct',
      agent_id: '',
      direct_source: '',
      guest_id: '',
      room_id: '',
      check_in_date: '',
      check_out_date: '',
      number_of_adults: 1,
      number_of_children: 0,
      number_of_infants: 0,
      meal_plan: 'NM',
      total_amount: 0,
      advance_payment: 0,
      payment_status: 'Pending',
      status: 'Confirmed',
      special_requests: ''
    });
    setSelectedGuest(null);
    setEditingReservation(null);
    setIsModalOpen(false);
  };

  const resetAgentForm = () => {
    setAgentFormData({
      name: '',
      email: '',
      phone: '',
      commission: '',
      address: ''
    });
    setIsAgentModalOpen(false);
  };

  const handleCreateAgent = async () => {
    if (!agentFormData.name) {
      alert('Please enter agent name');
      return;
    }

    const newAgent = await addAgent(agentFormData);
    if (newAgent) {
      setFormData({ ...formData, agent_id: newAgent.id });
      resetAgentForm();
    }
  };

  const resetGuestForm = () => {
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
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setFormData({ ...formData, guest_id: newGuest.id });
      setSelectedGuest(newGuest);
      resetGuestForm();
    }
  };

  const handleGuestSearch = (phone) => {
    const guest = getGuestByPhone(phone);
    if (guest) {
      setFormData({ ...formData, guest_id: guest.id });
      setSelectedGuest(guest);
    } else {
      setFormData({ ...formData, guest_id: '' });
      setSelectedGuest(null);
    }
  };

  const handleGuestSelect = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setFormData({ ...formData, guest_id: guestId });
    setSelectedGuest(guest);
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setSelectedGuest(reservation.guests);
    setFormData({
      booking_source: reservation.booking_source || 'direct',
      agent_id: reservation.agent_id || '',
      direct_source: reservation.direct_source || '',
      guest_id: reservation.guest_id,
      room_id: reservation.room_id,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      number_of_adults: reservation.number_of_adults || 1,
      number_of_children: reservation.number_of_children || 0,
      number_of_infants: reservation.number_of_infants || 0,
      meal_plan: reservation.meal_plan || 'NM',
      total_amount: reservation.total_amount,
      advance_payment: reservation.advance_payment,
      payment_status: reservation.payment_status,
      status: reservation.status,
      special_requests: reservation.special_requests || ''
    });
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

  const calculateTotal = () => {
    if (formData.room_id && formData.check_in_date && formData.check_out_date) {
      const room = rooms.find(r => r.id === formData.room_id);
      if (room) {
        const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
        if (roomType) {
          const days = calculateDays(formData.check_in_date, formData.check_out_date);
          const total = roomType.base_price * days;
          setFormData(prev => ({ ...prev, total_amount: total }));
        }
      }
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

  const availableRooms = rooms.filter(r => r.status === 'Available');

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
    });

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> New Booking
        </button>
      </div>

      {/* Consolidated Filters Panel */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ 
          background: 'white', 
          borderRadius: '8px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          {/* Filter Header */}
          <div 
            style={{ 
              padding: '16px 20px',
              background: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setShowFilters(!showFilters)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Filter size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                Filters & Search
              </h3>
              {hasActiveFilters() && (
                <span style={{
                  background: '#3b82f6',
                  color: 'white',
                  fontSize: '12px',
                  padding: '2px 8px',
                  borderRadius: '12px',
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
                    padding: '6px 12px',
                    fontSize: '13px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  Clear All
                </button>
              )}
              <span style={{ 
                color: '#6b7280', 
                fontSize: '14px',
                transition: 'transform 0.2s',
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                ▼
              </span>
            </div>
          </div>

          {/* Filter Content */}
          {showFilters && (
            <div style={{ padding: '20px' }}>
              {/* Search Bar */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Search Guest
                </label>
                <div className="search-box" style={{ width: '100%' }}>
                  <Search size={18} />
                  <input
                    type="text"
                    placeholder="Search by guest name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Filter Grid */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                gap: '16px',
                marginBottom: '20px'
              }}>
                {/* Status Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="Inquiry">Inquiry</option>
                    <option value="Tentative">Tentative</option>
                    <option value="Hold">Hold</option>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Checked-in">Checked-in</option>
                    <option value="Checked-out">Checked-out</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                </div>

                {/* Meal Plan Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Meal Plan
                  </label>
                  <select
                    value={filterMealPlan}
                    onChange={(e) => setFilterMealPlan(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Meal Plans</option>
                    <option value="NM">No Meal</option>
                    <option value="BO">Breakfast Only</option>
                    <option value="HB">Half Board</option>
                    <option value="FB">Full Board</option>
                  </select>
                </div>

                {/* Guest Count Filter */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Number of Guests
                  </label>
                  <select
                    value={filterGuestCount}
                    onChange={(e) => setFilterGuestCount(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="all">All Guest Counts</option>
                    <option value="1-2">1-2 Guests</option>
                    <option value="3-4">3-4 Guests</option>
                    <option value="5+">5+ Guests</option>
                  </select>
                </div>
              </div>

              {/* Date Range Filter */}
              <div style={{ 
                borderTop: '1px solid #e5e7eb',
                paddingTop: '20px'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '12px'
                }}>
                  <Calendar size={18} color="#3b82f6" />
                  <label style={{ 
                    fontSize: '13px', 
                    fontWeight: '600', 
                    color: '#374151',
                    margin: 0
                  }}>
                    Date Range
                  </label>
                </div>

                {/* Quick Date Presets */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
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
                      fontWeight: dateFilterType === 'all' ? '600' : '500'
                    }}
                  >
                    All Dates
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
                      fontWeight: dateFilterType === 'weekly' ? '600' : '500'
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
                      fontWeight: dateFilterType === 'fortnightly' ? '600' : '500'
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
                      fontWeight: dateFilterType === 'monthly' ? '600' : '500'
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
                      fontWeight: dateFilterType === 'custom' ? '600' : '500'
                    }}
                  >
                    Custom Range
                  </button>
                </div>

                {/* Custom Date Range Inputs */}
                {dateFilterType === 'custom' && (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                    marginTop: '12px', 
                    padding: '8px 12px', 
                    background: '#f0f9ff', 
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#1e40af'
                  }}>
                    <strong>Date Filter:</strong> {startDate || '...'} to {endDate || '...'}
                  </div>
                )}
              </div>

              {/* Active Filters Summary */}
              {hasActiveFilters() && (
                <div style={{ 
                  marginTop: '20px',
                  padding: '12px',
                  background: '#fef3c7',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#92400e'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px' }}>Active Filters:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {searchTerm && (
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Search: "{searchTerm}"
                      </span>
                    )}
                    {filterStatus !== 'all' && (
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Status: {filterStatus}
                      </span>
                    )}
                    {filterMealPlan !== 'all' && (
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Meal: {getMealPlanLabel(filterMealPlan)}
                      </span>
                    )}
                    {filterGuestCount !== 'all' && (
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Guests: {filterGuestCount}
                      </span>
                    )}
                    {dateFilterType !== 'all' && (
                      <span style={{ 
                        padding: '2px 8px', 
                        background: 'white', 
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}>
                        Date Range Active
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
        Showing <strong style={{ color: '#1f2937' }}>{filteredReservations.length}</strong> of{' '}
        <strong style={{ color: '#1f2937' }}>{reservations.length}</strong> reservations
      </div>

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
            {filteredReservations.map(reservation => (
              <tr key={reservation.id}>
                <td>
                  <strong>{reservation.guests?.name || 'Unknown'}</strong>
                  <br />
                  <small style={{color: '#6b7280'}}>
                    {reservation.guests?.phone || 'N/A'}
                  </small>
                </td>
                <td>{getRoomInfo(reservation.rooms)}</td>
                <td>{reservation.check_in_date}</td>
                <td>{reservation.check_out_date}</td>
                <td>
                  {reservation.number_of_adults || reservation.number_of_guests || 0} Adults
                  {reservation.number_of_children > 0 && <><br /><small style={{color: '#6b7280'}}>{reservation.number_of_children} Children</small></>}
                  {reservation.number_of_infants > 0 && <><br /><small style={{color: '#6b7280'}}>{reservation.number_of_infants} Infants</small></>}
                </td>
                <td>
                  <span className="bill-type-badge">
                    {getMealPlanLabel(reservation.meal_plan)}
                  </span>
                </td>
                <td>â‚¹{reservation.total_amount}</td>
                <td>
                  <span className={`status-badge ${
                    reservation.payment_status === 'Paid' ? 'status-available' :
                    reservation.payment_status === 'Partial' ? 'status-maintenance' :
                    'status-blocked'
                  }`}>
                    {reservation.payment_status}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${
                    reservation.status === 'Inquiry' ? 'status-inquiry' :
                    reservation.status === 'Tentative' ? 'status-tentative' :
                    reservation.status === 'Hold' ? 'status-hold' :
                    reservation.status === 'Confirmed' ? 'status-maintenance' :
                    reservation.status === 'Checked-in' ? 'status-occupied' :
                    reservation.status === 'Checked-out' ? 'status-available' :
                    'status-blocked'
                  }`}>
                    {reservation.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {(reservation.status === 'Confirmed' || reservation.status === 'Hold') && (
                      <button
                        onClick={() => handleCheckIn(reservation)}
                        className="btn-icon btn-success"
                        title="Check In"
                      >
                        <CheckCircle size={16} />
                      </button>
                    )}
                    {reservation.status === 'Checked-in' && (
                      <button
                        onClick={() => handleCheckOut(reservation)}
                        className="btn-icon btn-success"
                        title="Check Out"
                      >
                        <LogOut size={16} />
                      </button>
                    )}
                    {reservation.status !== 'Cancelled' && reservation.status !== 'Checked-out' && (
                      <>
                        <button onClick={() => handleEdit(reservation)} className="btn-icon btn-edit">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleCancel(reservation)} className="btn-icon btn-delete">
                          <XOctagon size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredReservations.length === 0 && (
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

      {/* Reservation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingReservation ? 'Edit Reservation' : 'New Booking'}
        size="large"
      >
        <div className="form-grid">
          {/* Booking Source */}
          <div className="form-group">
            <label>Booking Source *</label>
            <select
              value={formData.booking_source}
              onChange={(e) => {
                setFormData({...formData, booking_source: e.target.value, agent_id: '', direct_source: ''});
              }}
            >
              <option value="direct">Direct</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          {/* Direct Source - Show if booking source is direct */}
          {formData.booking_source === 'direct' && (
            <div className="form-group">
              <label>Direct Booking Source</label>
              <input
                type="text"
                value={formData.direct_source}
                onChange={(e) => setFormData({...formData, direct_source: e.target.value})}
                placeholder="e.g., Walk-in, Phone Call, Website"
              />
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block', fontSize: '12px' }}>
                Optional: Specify where this booking came from
              </small>
            </div>
          )}

          {/* Agent Selection - Only show if booking source is agent */}
          {formData.booking_source === 'agent' && (
            <div className="form-group">
              <label>Select Agent *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  style={{ flex: 1 }}
                  value={formData.agent_id}
                  onChange={(e) => setFormData({...formData, agent_id: e.target.value})}
                >
                  <option value="">Select Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.phone}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsAgentModalOpen(true)} 
                  className="btn-secondary"
                  type="button"
                >
                  <UserPlus size={18} /> New Agent
                </button>
              </div>
            </div>
          )}

          {/* Guest Selection */}
          <div className="form-group full-width">
            <label>Select Guest *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={formData.guest_id}
                onChange={(e) => handleGuestSelect(e.target.value)}
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
                <UserPlus size={18} /> New Guest
              </button>
            </div>
          </div>

          {/* Guest Quick Search */}
          <div className="form-group full-width">
            <label>Or Search by Phone</label>
            <input
              type="tel"
              placeholder="Enter phone number to search"
              onBlur={(e) => handleGuestSearch(e.target.value)}
            />
          </div>

          {/* Selected Guest Info */}
          {selectedGuest && (
            <div className="form-group full-width">
              <div style={{ 
                padding: '12px', 
                background: '#f0f9ff', 
                border: '1px solid #bae6fd',
                borderRadius: '6px' 
              }}>
                <strong>{selectedGuest.name}</strong>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: '4px 0 0 0' }}>
                  {selectedGuest.phone} â€¢ {selectedGuest.email || 'No email'}
                </p>
              </div>
            </div>
          )}

          {/* Room Selection */}
          <div className="form-group">
            <label>Room *</label>
            <select
              value={formData.room_id}
              onChange={(e) => {
                setFormData({...formData, room_id: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
              disabled={editingReservation}
            >
              <option value="">Select Room</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>{getRoomInfo(room)}</option>
              ))}
            </select>
          </div>

          <div className="form-group full-width">
            <label>Number of Guests *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Adults</label>
                <input
                  type="number"
                  min="1"
                  value={formData.number_of_adults}
                  onChange={(e) => setFormData({...formData, number_of_adults: e.target.value})}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Children</label>
                <input
                  type="number"
                  min="0"
                  value={formData.number_of_children}
                  onChange={(e) => setFormData({...formData, number_of_children: e.target.value})}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Infants</label>
                <input
                  type="number"
                  min="0"
                  value={formData.number_of_infants}
                  onChange={(e) => setFormData({...formData, number_of_infants: e.target.value})}
                />
              </div>
            </div>
            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Total: {parseInt(formData.number_of_adults || 0) + parseInt(formData.number_of_children || 0) + parseInt(formData.number_of_infants || 0)} guests
            </small>
          </div>

          <div className="form-group">
            <label>Meal Plan *</label>
            <select
              value={formData.meal_plan}
              onChange={(e) => setFormData({...formData, meal_plan: e.target.value})}
            >
              <option value="NM">NM - No Meal</option>
              <option value="BO">BO - Breakfast Only</option>
              <option value="HB">HB - Half Board</option>
              <option value="FB">FB - Full Board</option>
            </select>
          </div>

          <div className="form-group">
            <label>Check-in Date *</label>
            <input
              type="date"
              value={formData.check_in_date}
              onChange={(e) => {
                setFormData({...formData, check_in_date: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={formData.check_out_date}
              onChange={(e) => {
                setFormData({...formData, check_out_date: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Total Amount *</label>
            <input
              type="number"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Advance Payment</label>
            <input
              type="number"
              value={formData.advance_payment}
              onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Payment Status</label>
            <select
              value={formData.payment_status}
              onChange={(e) => setFormData({...formData, payment_status: e.target.value})}
            >
              <option value="Pending">Pending</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="Inquiry">Inquiry</option>
              <option value="Tentative">Tentative</option>
              <option value="Hold">Hold</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-in">Checked-in</option>
            </select>
          </div>

          <div className="form-group full-width">
            <label>Special Requests</label>
            <textarea
              value={formData.special_requests}
              onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={resetForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={18} /> Save Booking
          </button>
        </div>
      </Modal>

      {/* Quick Add Guest Modal */}
      <Modal
        isOpen={isGuestModalOpen}
        onClose={resetGuestForm}
        title="Add New Guest"
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={guestFormData.name}
              onChange={(e) => setGuestFormData({...guestFormData, name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={guestFormData.phone}
              onChange={(e) => setGuestFormData({...guestFormData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={guestFormData.email}
              onChange={(e) => setGuestFormData({...guestFormData, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof Type</label>
            <select
              value={guestFormData.id_proof_type}
              onChange={(e) => setGuestFormData({...guestFormData, id_proof_type: e.target.value})}
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
              onChange={(e) => setGuestFormData({...guestFormData, id_proof_number: e.target.value})}
              placeholder="AADHAR-1234"
            />
          </div>
          <div className="form-group">
            <label>Guest Type</label>
            <select
              value={guestFormData.guest_type}
              onChange={(e) => setGuestFormData({...guestFormData, guest_type: e.target.value})}
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
              onChange={(e) => setGuestFormData({...guestFormData, address: e.target.value})}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={guestFormData.city}
              onChange={(e) => setGuestFormData({...guestFormData, city: e.target.value})}
              placeholder="Mumbai"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={guestFormData.state}
              onChange={(e) => setGuestFormData({...guestFormData, state: e.target.value})}
              placeholder="Maharashtra"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={guestFormData.country}
              onChange={(e) => setGuestFormData({...guestFormData, country: e.target.value})}
              placeholder="India"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetGuestForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleCreateGuest} className="btn-primary">
            <Save size={18} /> Add Guest
          </button>
        </div>
      </Modal>

      {/* Add Agent Modal */}
      <Modal
        isOpen={isAgentModalOpen}
        onClose={resetAgentForm}
        title="Add New Agent"
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Agent/Agency Name *</label>
            <input
              type="text"
              value={agentFormData.name}
              onChange={(e) => setAgentFormData({...agentFormData, name: e.target.value})}
              placeholder="Travel Agency Name"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={agentFormData.phone}
              onChange={(e) => setAgentFormData({...agentFormData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={agentFormData.email}
              onChange={(e) => setAgentFormData({...agentFormData, email: e.target.value})}
              placeholder="agent@example.com"
            />
          </div>
          <div className="form-group">
            <label>Commission (%)</label>
            <input
              type="number"
              value={agentFormData.commission}
              onChange={(e) => setAgentFormData({...agentFormData, commission: e.target.value})}
              placeholder="10"
            />
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <input
              type="text"
              value={agentFormData.address}
              onChange={(e) => setAgentFormData({...agentFormData, address: e.target.value})}
              placeholder="123 Main Street"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetAgentForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleCreateAgent} className="btn-primary">
            <Save size={18} /> Add Agent
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Reservations;