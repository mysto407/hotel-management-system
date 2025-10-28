// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarDays, Users, Home, RefreshCw, X, Save, UserPlus, Lock, Calendar as CalendarIcon } from 'lucide-react';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { Modal } from '../../components/common/Modal';
import { updateRoomStatus } from '../../lib/supabase';

const ReservationCalendar = () => {
  const { reservations, fetchReservations, addReservation } = useReservations();
  const { rooms, roomTypes, fetchRooms } = useRooms();
  const { guests, addGuest } = useGuests();
  
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Action menu state
  const [actionMenu, setActionMenu] = useState({
    visible: false,
    roomId: null,
    date: null,
    position: { x: 0, y: 0 }
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
      // Fetch both reservations and rooms data
      if (fetchReservations) await fetchReservations();
      if (fetchRooms) await fetchRooms();
      
      // Optional: Show success message or toast notification here
      console.log('Calendar data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing calendar data:', error);
      // Optional: Show error message or toast notification here
    } finally {
      // Add a small delay to show the animation
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Handle cell click to show action menu
  const handleCellClick = (e, roomId, date) => {
    // Only show menu for available cells
    const roomStatus = getRoomStatus(roomId, date);
    if (roomStatus.status !== 'available') {
      return;
    }

    // Prevent drag-to-scroll interference
    if (isDragging) return;

    // --- START: UPDATED LOGIC ---
    if (!containerRef.current) return; // Guard clause

    const cellRect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const scrollLeft = containerRef.current.scrollLeft;
    const scrollTop = containerRef.current.scrollTop;

    // Calculate position relative to the container, including scroll
    const x = cellRect.right - containerRect.left + scrollLeft + 10; // 10px to the right
    const y = cellRect.top - containerRect.top + scrollTop;
    // --- END: UPDATED LOGIC ---
    
    setActionMenu({
      visible: true,
      roomId,
      date,
      position: { x, y } // Use new relative x and y
    });
  };

  // Close action menu
  const closeActionMenu = () => {
    setActionMenu({
      visible: false,
      roomId: null,
      date: null,
      position: { x: 0, y: 0 }
    });
  };

  // Handle Block action
  const handleBlockRoom = async () => {
    if (!actionMenu.roomId) return;
    
    try {
      await updateRoomStatus(actionMenu.roomId, 'Blocked');
      await fetchRooms(); // Refresh rooms data
      alert('Room blocked successfully');
    } catch (error) {
      console.error('Error blocking room:', error);
      alert('Failed to block room: ' + error.message);
    }
    
    closeActionMenu();
  };

  // Handle Hold action - Create a hold reservation
  const handleHoldRoom = async () => {
    if (!actionMenu.roomId || !actionMenu.date) return;
    
    // For hold, we'll create a minimal reservation without guest
    // Set check-out to next day by default
    const checkIn = new Date(actionMenu.date);
    const checkOut = new Date(actionMenu.date);
    checkOut.setDate(checkOut.getDate() + 1);
    
    try {
      // Create a placeholder guest for the hold if needed
      // Or you can modify this to require guest selection
      const room = rooms.find(r => r.id === actionMenu.roomId);
      
      // For now, require guest selection
      alert('Please use the Book option to create a reservation. Hold requires guest information.');
      closeActionMenu();
      return;
      
    } catch (error) {
      console.error('Error creating hold:', error);
      alert('Failed to create hold: ' + error.message);
    }
  };

  // Handle Book action - Open quick booking modal
  const handleBookRoom = () => {
    if (!actionMenu.roomId || !actionMenu.date) return;
    
    // Set default check-out to next day
    const checkIn = new Date(actionMenu.date);
    const checkOut = new Date(actionMenu.date);
    checkOut.setDate(checkOut.getDate() + 1);
    
    setBookingData({
      room_id: actionMenu.roomId,
      check_in_date: actionMenu.date,
      check_out_date: checkOut.toISOString().split('T')[0],
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
      
      // Calculate nights and total
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
      await fetchReservations();
      
      // Reset and close
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
      
      alert('Booking created successfully!');
    } catch (error) {
      console.error('Error creating booking:', error);
      alert('Failed to create booking: ' + error.message);
    }
  };

  // Guest modal handlers
  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setBookingData({ ...bookingData, guest_id: newGuest.id });
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
    }
  };

  // Close action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target)) {
        closeActionMenu();
      }
    };

    // --- REMOVED SCROLL HANDLER ---
    
    if (actionMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [actionMenu.visible]); // --- REMOVED containerRef from dependency array ---

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
        return 'calendar-cell-available';
      case 'occupied':
        return 'calendar-cell-occupied';
      case 'maintenance':
        return 'calendar-cell-maintenance';
      case 'blocked':
        return 'calendar-cell-blocked';
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
    <div className="calendar-page">
      {/* Enhanced Page Header */}
      <div className="calendar-page-header">
        <div className="calendar-header-top">
          <div>
            <h1 className="calendar-main-title">
              <CalendarDays size={32} />
              Booking Calendar
            </h1>
            <p className="calendar-subtitle">Manage room availability and reservations</p>
          </div>
          
          {/* Quick Stats and Refresh */}
          <div className="calendar-header-actions">
            <div className="calendar-quick-stats">
              <div className="quick-stat-item stat-available">
                <Home size={20} />
                <div>
                  <div className="quick-stat-value">{totalAvailable}</div>
                  <div className="quick-stat-label">Available</div>
                </div>
              </div>
              <div className="quick-stat-item stat-occupied">
                <Users size={20} />
                <div>
                  <div className="quick-stat-value">{totalOccupied}</div>
                  <div className="quick-stat-label">Occupied</div>
                </div>
              </div>
            </div>
            
            {/* Refresh Button */}
            <button 
              onClick={handleRefresh} 
              className={`calendar-refresh-btn ${isRefreshing ? 'refreshing' : ''}`}
              disabled={isRefreshing}
              title="Refresh calendar data"
            >
              <RefreshCw size={20} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="calendar-nav-controls">
          <div className="calendar-nav-buttons">
            <button onClick={goToPreviousWeek} className="calendar-nav-btn">
              <ChevronLeft size={18} />
              <span>Previous</span>
            </button>
            <button onClick={goToToday} className="calendar-nav-btn today-btn">
              <Calendar size={18} />
              <span>Today</span>
            </button>
            <button onClick={goToNextWeek} className="calendar-nav-btn">
              <span>Next</span>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="calendar-view-controls">
            <input
              type="date"
              value={startDate.toISOString().split('T')[0]}
              onChange={handleDatePickerChange}
              className="calendar-date-input"
            />
            <select
              value={daysToShow}
              onChange={(e) => setDaysToShow(parseInt(e.target.value))}
              className="calendar-days-select"
            >
              <option value="7">7 Days</option>
              <option value="14">14 Days</option>
              <option value="30">30 Days</option>
            </select>
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
        style={{
          overflowX: 'auto',
          overflowY: 'visible',
          width: '100%',
          height: 'auto',
          maxHeight: 'none',
          minHeight: 'auto',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          position: 'relative' // <-- ADDED
        }}
      >
        <table className="calendar-table" style={{ 
          width: '100%',
          display: 'table'
        }}>
            <thead>
              {/* Date Headers */}
              <tr>
                <th className="calendar-fixed-column">
                  <div className="fixed-column-header">
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
                      className={`calendar-date-header ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                    >
                      <div className="date-header-content">
                        <div className="date-day">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="date-num">{dateObj.getDate()}</div>
                        <div className="date-month">{dateObj.toLocaleDateString('en-US', { month: 'short' })}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Total Availability Row */}
              <tr className="availability-row">
                <th className="calendar-fixed-column availability-label">
                  <div className="availability-label-content">
                    <CalendarDays size={16} />
                    <span>Total Availability</span>
                  </div>
                </th>
                {generateDates.map(date => {
                  const availability = getTotalAvailability(date);
                  const percentage = (availability.available / availability.total) * 100;
                  
                  return (
                    <td key={date} className="availability-cell">
                      <div className="availability-content">
                        <div className="availability-progress">
                          <div 
                            className="availability-progress-bar"
                            style={{ 
                              width: `${percentage}%`,
                              background: percentage > 60 ? 'linear-gradient(135deg, #10b981, #059669)' : 
                                         percentage > 30 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                         'linear-gradient(135deg, #ef4444, #dc2626)'
                            }}
                          />
                        </div>
                        <span className="availability-numbers">
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
                    <tr key={roomType.id} className="room-type-row">
                      <td className="calendar-fixed-column room-type-cell">
                        <button
                          onClick={() => toggleRoomType(roomType.id)}
                          className="room-type-toggle"
                        >
                          <div className="room-type-icon">
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={1B} />}
                          </div>
                          <div className="room-type-info">
                            <strong>{roomType.name}</strong>
                            <span className="room-count">{typeRooms.length} rooms</span>
                          </div>
                        </button>
                      </td>
                      {generateDates.map(date => {
                        const availability = getAvailabilityForType(roomType.id, date);
                        const percentage = (availability.available / availability.total) * 100;
                        
                        return (
                          <td key={date} className="room-type-availability-cell">
                            <div className="availability-bar-container">
                              <div 
                                className="availability-bar" 
                                style={{ 
                                  width: `${percentage}%`,
                                  background: percentage > 60 ? 'linear-gradient(135deg, #10b981, #059669)' : 
                                             percentage > 30 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 
                                             'linear-gradient(135deg, #ef4444, #dc2626)'
                                }}
                              />
                              <span className="availability-text">
                                {availability.available}/{availability.total}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Individual Room Rows (when expanded) */}
                    {isExpanded && typeRooms.map(room => (
                      <tr key={room.id} className="room-row">
                        <td className="calendar-fixed-column room-cell">
                          <div className="room-info">
                            <span className="room-number">Room {room.room_number}</span>
                            <span className="room-floor">Floor {room.floor}</span>
                          </div>
                        </td>
                        {generateDates.map(date => {
                          const roomStatus = getRoomStatus(room.id, date);
                          
                          return (
                            <td 
                              key={date} 
                              className={`calendar-cell ${getCellStyle(roomStatus.status)}`}
                              title={roomStatus.guestName || roomStatus.status}
                              onClick={(e) => handleCellClick(e, room.id, date)}
                              style={{ 
                                cursor: roomStatus.status === 'available' ? 'pointer' : 'default',
                                position: 'relative'
                              }}
                            >
                              {roomStatus.status === 'occupied' && (
                                <div className="cell-content occupied-content">
                                  <div className="guest-name">{roomStatus.guestName}</div>
                                  <div className="reservation-status">{roomStatus.statusType}</div>
                                </div>
                              )}
                              {roomStatus.status === 'maintenance' && (
                                <div className="cell-content maintenance-content">
                                  <div className="status-label">Maintenance</div>
                                </div>
                              )}
                              {roomStatus.status === 'blocked' && (
                                <div className="cell-content blocked-content">
                                  <div className="status-label">Blocked</div>
                                </div>
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

        {/* Action Menu Popup (MOVED HERE) */}
        {actionMenu.visible && (
          <div
            ref={actionMenuRef}
            style={{
              position: 'absolute', // <-- CHANGED
              left: `${actionMenu.position.x}px`,
              top: `${actionMenu.position.y}px`,
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              padding: '8px',
              zIndex: 1000,
              minWidth: '160px'
            }}
          >
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280', 
              padding: '4px 8px',
              borderBottom: '1px solid #e5e7eb',
              marginBottom: '4px'
            }}>
              {(() => {
                const room = rooms.find(r => r.id === actionMenu.roomId);
                return room ? `Room ${room.room_number}` : 'Room';
              })()} - {new Date(actionMenu.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </div>
            
            <button
              onClick={handleBookRoom}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#059669',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <CalendarIcon size={16} />
              Book
            </button>
            
            <button
              onClick={handleHoldRoom}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#f59e0b',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fffbeb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Lock size={16} />
              Hold
            </button>
            
            <button
              onClick={handleBlockRoom}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: '4px',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#dc2626',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fef2f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <X size={16} />
              Block
            </button>
          </div>
        )}
      </div> {/* <-- End of containerRef div */}


      {/* Quick Booking Modal */}
      <Modal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        title="Quick Booking"
        size="medium"
      >
        <div className="form-grid">
          {/* Room and Date Info */}
          <div className="form-group full-width">
            <div style={{ 
              padding: '12px', 
              background: '#f0f9ff', 
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              marginBottom: '8px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0369a1' }}>
                {(() => {
                  const room = rooms.find(r => r.id === bookingData.room_id);
                  const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
                  return `Room ${room?.room_number || ''} - ${roomType?.name || ''}`;
                })()}
              </div>
              <div style={{ fontSize: '13px', color: '#0369a1', marginTop: '4px' }}>
                Check-in: {bookingData.check_in_date}
              </div>
            </div>
          </div>

          {/* Guest Selection */}
          <div className="form-group full-width">
            <label>Select Guest *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={bookingData.guest_id}
                onChange={(e) => setBookingData({ ...bookingData, guest_id: e.target.value })}
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
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          {/* Check-out Date */}
          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={bookingData.check_out_date}
              onChange={(e) => setBookingData({ ...bookingData, check_out_date: e.target.value })}
              min={bookingData.check_in_date}
            />
          </div>

          {/* Status */}
          <div className="form-group">
            <label>Status</label>
            <select
              value={bookingData.status}
              onChange={(e) => setBookingData({ ...bookingData, status: e.target.value })}
            >
              <option value="Confirmed">Confirmed</option>
              <option value="Hold">Hold</option>
              <option value="Tentative">Tentative</option>
            </select>
          </div>

          {/* Number of Guests */}
          <div className="form-group">
            <label>Adults *</label>
            <input
              type="number"
              min="1"
              value={bookingData.number_of_adults}
              onChange={(e) => setBookingData({ ...bookingData, number_of_adults: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Children</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_children}
              onChange={(e) => setBookingData({ ...bookingData, number_of_children: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Infants</label>
            <input
              type="number"
              min="0"
              value={bookingData.number_of_infants}
              onChange={(e) => setBookingData({ ...bookingData, number_of_infants: e.target.value })}
            />
          </div>

          {/* Meal Plan */}
          <div className="form-group">
            <label>Meal Plan</label>
            <select
              value={bookingData.meal_plan}
              onChange={(e) => setBookingData({ ...bookingData, meal_plan: e.target.value })}
            >
              <option value="NM">No Meal</option>
              <option value="BO">Breakfast Only</option>
              <option value="HB">Half Board</option>
              <option value"FB">Full Board</option>
            </select>
          </div>

          {/* Special Requests */}
          <div className="form-group full-width">
            <label>Special Requests</label>
            <textarea
              value={bookingData.special_requests}
              onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={() => setIsBookingModalOpen(false)} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button onClick={handleQuickBooking} className="btn-primary">
            <Save size={18} /> Create Booking
          </button>
        </div>
      </Modal>

      {/* Quick Add Guest Modal */}
      <Modal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        title="Add New Guest"
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={guestFormData.name}
              onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={guestFormData.phone}
              onChange={(e) => setGuestFormData({ ...guestFormData, phone: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={guestFormData.email}
              onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof Type</label>
            <select
              value={guestFormData.id_proof_type}
              onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_type: e.target.value })}
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
              onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_number: e.target.value })}
              placeholder="AADHAR-1234"
            />
          </div>
          <div className="form-group">
            <label>Guest Type</label>
            <select
              value={guestFormData.guest_type}
              onChange={(e) => setGuestFormData({ ...guestFormData, guest_type: e.target.value })}
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
              onChange={(e) => setGuestFormData({ ...guestFormData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={guestFormData.city}
              onChange={(e) => setGuestFormData({ ...guestFormData, city: e.target.value })}
              placeholder="Mumbai"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={guestFormData.state}
              onChange={(e) => setGuestFormData({ ...guestFormData, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={guestFormData.country}
              onChange={(e) => setGuestFormData({ ...guestFormData, country: e.target.value })}
              placeholder="India"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={() => setIsGuestModalOpen(false)} className="btn-secondary">
            <X size={18} /> Cancel
          </button>
          <button onClick={handleCreateGuest} className="btn-primary">
            <Save size={18} /> Add Guest
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ReservationCalendar;