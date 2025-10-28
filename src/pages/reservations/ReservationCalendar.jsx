// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarDays, Users, Home, RefreshCw, X, Save, UserPlus } from 'lucide-react';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';

const ReservationCalendar = () => {
  const { reservations, fetchReservations } = useReservations();
  const { rooms, roomTypes, fetchRooms } = useRooms();
  
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef(null);
  
  // Selection state for creating reservations
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [prefilledReservationData, setPrefilledReservationData] = useState(null);

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

  // Drag-to-scroll handlers
  // Drag-to-scroll handlers
  const handleMouseDown = (e) => {
    if (!containerRef.current) return;
    
    // Don't start scrolling if clicking on a calendar cell (let cell selection handle it)
    if (e.target.closest('.calendar-cell')) {
      return;
    }
    
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
    
    // Also reset cell selection if mouse leaves during selection
    if (isSelecting) {
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      setSelectedCells(new Set());
    }
  };

  // Set initial cursor style
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  // Add global mouseup handler for selection
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isSelecting) {
        handleCellMouseUp();
      }
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting, selectedCells]);

  // Cell selection handlers for creating reservations
  const handleCellMouseDown = (e, roomId, date) => {
    // Don't start selection if it's not a left click
    if (e.button !== 0) return;
    
    const roomStatus = getRoomStatus(roomId, date);
    if (roomStatus.status !== 'available') return; // Only allow selection on available rooms
    
    // Prevent default drag behavior and stop propagation to prevent scroll
    e.preventDefault();
    e.stopPropagation();
    
    // Clear any previous selection state and start fresh
    setIsSelecting(true);
    setSelectionStart({ roomId, date });
    setSelectionEnd({ roomId, date });
    setSelectedCells(new Set([`${roomId}-${date}`]));
  };

  const handleCellMouseEnter = (e, roomId, date) => {
    // Only continue selection if:
    // 1. A selection has been started (isSelecting is true)
    // 2. We have a starting point
    // 3. The left mouse button is currently being held down (buttons === 1)
    if (!isSelecting || !selectionStart) return;
    
    // Use nativeEvent for more reliable button state detection
    const buttons = e.nativeEvent ? e.nativeEvent.buttons : e.buttons;
    if (buttons !== 1) return; // Left button must be pressed
    
    const roomStatus = getRoomStatus(roomId, date);
    if (roomStatus.status !== 'available') return;
    
    setSelectionEnd({ roomId, date });
    updateSelectedCells(selectionStart, { roomId, date });
  };

  const handleCellMouseUp = () => {
    if (!isSelecting) return;
    
    // Open modal if we have a valid selection
    if (selectedCells.size > 0) {
      openReservationModalWithSelection();
    }
    
    // Always clear selection state after mouseup
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
    // Note: selectedCells is cleared in closeReservationModal or openReservationModalWithSelection
  };

  const updateSelectedCells = (start, end) => {
    if (!start || !end) return;
    
    const newSelectedCells = new Set();
    const dates = generateDates;
    
    // Find the room type of the start room
    const startRoom = rooms.find(r => r.id === start.roomId);
    if (!startRoom) return;
    
    // Get all rooms of the same type
    const sameTypeRooms = rooms.filter(r => r.room_type_id === startRoom.room_type_id);
    
    // Find date range
    const startDateIndex = dates.indexOf(start.date);
    const endDateIndex = dates.indexOf(end.date);
    const minDateIndex = Math.min(startDateIndex, endDateIndex);
    const maxDateIndex = Math.max(startDateIndex, endDateIndex);
    
    // Find room range
    const startRoomIndex = sameTypeRooms.findIndex(r => r.id === start.roomId);
    const endRoomIndex = sameTypeRooms.findIndex(r => r.id === end.roomId);
    const minRoomIndex = Math.min(startRoomIndex, endRoomIndex);
    const maxRoomIndex = Math.max(startRoomIndex, endRoomIndex);
    
    // Select all cells in the rectangle, but only if they're available
    for (let ri = minRoomIndex; ri <= maxRoomIndex; ri++) {
      for (let di = minDateIndex; di <= maxDateIndex; di++) {
        const room = sameTypeRooms[ri];
        const date = dates[di];
        const status = getRoomStatus(room.id, date);
        
        if (status.status === 'available') {
          newSelectedCells.add(`${room.id}-${date}`);
        }
      }
    }
    
    setSelectedCells(newSelectedCells);
  };

  const openReservationModalWithSelection = () => {
    if (selectedCells.size === 0) return;
    
    // Parse selected cells
    const cellsArray = Array.from(selectedCells).map(cell => {
      const [roomId, date] = cell.split('-');
      return { roomId, date };
    });
    
    // Get unique rooms and dates
    const uniqueRoomIds = [...new Set(cellsArray.map(c => c.roomId))];
    const uniqueDates = [...new Set(cellsArray.map(c => c.date))].sort();
    
    // Get room info
    const firstRoom = rooms.find(r => r.id === uniqueRoomIds[0]);
    const roomType = roomTypes.find(rt => rt.id === firstRoom?.room_type_id);
    
    // Calculate check-in and check-out dates
    const checkInDate = uniqueDates[0];
    const checkOutDate = new Date(uniqueDates[uniqueDates.length - 1]);
    checkOutDate.setDate(checkOutDate.getDate() + 1); // Check-out is next day
    const checkOutDateStr = checkOutDate.toISOString().split('T')[0];
    
    // Prepare prefilled data
    const prefilledData = {
      roomTypeId: roomType?.id,
      roomTypeName: roomType?.name,
      numberOfRooms: uniqueRoomIds.length,
      checkInDate: checkInDate,
      checkOutDate: checkOutDateStr,
      selectedRoomIds: uniqueRoomIds
    };
    
    setPrefilledReservationData(prefilledData);
    setShowReservationModal(true);
    setSelectedCells(new Set()); // Clear selection
  };

  const isCellSelected = (roomId, date) => {
    return selectedCells.has(`${roomId}-${date}`);
  };

  const closeReservationModal = () => {
    setShowReservationModal(false);
    setPrefilledReservationData(null);
    setSelectedCells(new Set());
  };

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

        {/* Instructions for calendar interaction */}
        <div style={{
          padding: '12px 16px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#1e40af',
          marginTop: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <CalendarDays size={16} />
          <span>
            <strong>Tip:</strong> Click on available rooms to create a reservation, or click and drag to select multiple rooms/dates for group bookings.
          </span>
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
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
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
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
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
                          const isSelected = isCellSelected(room.id, date);
                          
                          return (
                            <td 
                              key={date} 
                              className={`calendar-cell ${getCellStyle(roomStatus.status)} ${isSelected ? 'calendar-cell-selected' : ''}`}
                              title={roomStatus.guestName || roomStatus.status}
                              onMouseDown={(e) => handleCellMouseDown(e, room.id, date)}
                              onMouseEnter={(e) => handleCellMouseEnter(e, room.id, date)}
                              onMouseUp={handleCellMouseUp}
                              style={{
                                cursor: roomStatus.status === 'available' ? 'pointer' : 'default',
                                userSelect: 'none'
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
        </div>

      {/* Quick Reservation Modal */}
      {showReservationModal && (
        <QuickReservationModal
          prefilledData={prefilledReservationData}
          onClose={closeReservationModal}
          onSuccess={() => {
            closeReservationModal();
            handleRefresh();
          }}
        />
      )}

      {/* CSS for selected cells */}
      <style jsx>{`
        .calendar-cell-selected {
          background: rgba(59, 130, 246, 0.2) !important;
          border: 2px solid #3b82f6 !important;
          box-shadow: inset 0 0 0 1px #3b82f6;
        }
        
        .calendar-cell-selected:hover {
          background: rgba(59, 130, 246, 0.3) !important;
        }
        
        .calendar-cell.calendar-cell-available {
          transition: all 0.15s ease;
        }
        
        .calendar-cell.calendar-cell-available:hover {
          background: rgba(59, 130, 246, 0.1);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

// Quick Reservation Modal Component
const QuickReservationModal = ({ prefilledData, onClose, onSuccess }) => {
  const { addReservation } = useReservations();
  const { rooms } = useRooms();
  const { guests, addGuest, getGuestByPhone } = useGuests();
  const { agents, addAgent } = useAgents();
  
  const [formData, setFormData] = useState({
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    guest_id: '',
    meal_plan: 'NM',
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
    status: 'Confirmed',
    special_requests: ''
  });

  const [roomDetails, setRoomDetails] = useState(
    prefilledData?.selectedRoomIds?.map(roomId => ({
      room_id: roomId,
      number_of_adults: 1,
      number_of_children: 0,
      number_of_infants: 0
    })) || []
  );

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
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

  // Calculate total amount based on room type and dates
  useEffect(() => {
    if (prefilledData) {
      const checkIn = new Date(prefilledData.checkInDate);
      const checkOut = new Date(prefilledData.checkOutDate);
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
      
      // Get room type to get base price
      const firstRoom = rooms.find(r => r.id === prefilledData.selectedRoomIds[0]);
      const basePrice = firstRoom?.room_types?.base_price || 0;
      
      const total = basePrice * nights * prefilledData.numberOfRooms;
      setFormData(prev => ({ ...prev, total_amount: total }));
    }
  }, [prefilledData, rooms]);

  const handleGuestSearch = (phone) => {
    const guest = getGuestByPhone(phone);
    if (guest) {
      setFormData(prev => ({ ...prev, guest_id: guest.id }));
      setSelectedGuest(guest);
    } else {
      setFormData(prev => ({ ...prev, guest_id: '' }));
      setSelectedGuest(null);
    }
  };

  const handleGuestSelect = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setFormData(prev => ({ ...prev, guest_id: guestId }));
    setSelectedGuest(guest);
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setFormData(prev => ({ ...prev, guest_id: newGuest.id }));
      setSelectedGuest(newGuest);
      setShowGuestForm(false);
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
    }
  };

  const handleCreateAgent = async () => {
    if (!agentFormData.name) {
      alert('Please enter agent name');
      return;
    }

    const agentData = {
      name: agentFormData.name,
      email: agentFormData.email || null,
      phone: agentFormData.phone || null,
      commission: agentFormData.commission && agentFormData.commission !== '' 
        ? parseFloat(agentFormData.commission) 
        : null,
      address: agentFormData.address || null
    };

    const newAgent = await addAgent(agentData);
    if (newAgent) {
      setFormData(prev => ({ ...prev, agent_id: newAgent.id }));
      setShowAgentForm(false);
      setAgentFormData({
        name: '',
        email: '',
        phone: '',
        commission: '',
        address: ''
      });
    }
  };

  const updateRoomDetail = (index, field, value) => {
    const updated = [...roomDetails];
    updated[index] = { ...updated[index], [field]: value };
    setRoomDetails(updated);
  };

  const handleSubmit = async () => {
    if (!formData.guest_id) {
      alert('Please select a guest');
      return;
    }

    try {
      const totalAmount = parseFloat(formData.total_amount) || 0;
      const amountPerRoom = totalAmount / prefilledData.numberOfRooms;
      const advancePerRoom = (parseFloat(formData.advance_payment) || 0) / prefilledData.numberOfRooms;

      for (let i = 0; i < roomDetails.length; i++) {
        const roomDetail = roomDetails[i];
        const reservationData = {
          booking_source: formData.booking_source,
          agent_id: formData.booking_source === 'agent' ? formData.agent_id : null,
          direct_source: formData.booking_source === 'direct' ? formData.direct_source : null,
          guest_id: formData.guest_id,
          room_id: roomDetail.room_id,
          check_in_date: prefilledData.checkInDate,
          check_out_date: prefilledData.checkOutDate,
          number_of_adults: parseInt(roomDetail.number_of_adults),
          number_of_children: parseInt(roomDetail.number_of_children),
          number_of_infants: parseInt(roomDetail.number_of_infants),
          number_of_guests: parseInt(roomDetail.number_of_adults) + parseInt(roomDetail.number_of_children) + parseInt(roomDetail.number_of_infants),
          meal_plan: formData.meal_plan,
          total_amount: amountPerRoom,
          advance_payment: advancePerRoom,
          payment_status: formData.payment_status,
          status: formData.status,
          special_requests: formData.special_requests
        };
        await addReservation(reservationData);
      }
      
      alert(`Successfully created ${prefilledData.numberOfRooms} reservation(s)!`);
      onSuccess();
    } catch (error) {
      console.error('Error creating reservations:', error);
      alert('Failed to create reservation: ' + error.message);
    }
  };

  const calculateNights = () => {
    if (!prefilledData) return 0;
    const checkIn = new Date(prefilledData.checkInDate);
    const checkOut = new Date(prefilledData.checkOutDate);
    return Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f9fafb'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
              Quick Reservation
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {prefilledData?.roomTypeName} • {prefilledData?.numberOfRooms} Room(s) • {calculateNights()} Night(s)
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} color="#6b7280" />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '24px' }}>
          {/* Booking Summary */}
          <div style={{
            padding: '16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '13px', color: '#1e40af', marginBottom: '8px' }}>
              <strong>Booking Summary:</strong>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#1e40af' }}>
              <div>Check-in: <strong>{prefilledData?.checkInDate}</strong></div>
              <div>Check-out: <strong>{prefilledData?.checkOutDate}</strong></div>
              <div>Rooms: <strong>{roomDetails.map((rd, i) => {
                const room = rooms.find(r => r.id === rd.room_id);
                return room?.room_number;
              }).join(', ')}</strong></div>
              <div>Nights: <strong>{calculateNights()}</strong></div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Booking Source */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Booking Source *
              </label>
              <select
                value={formData.booking_source}
                onChange={(e) => setFormData(prev => ({ ...prev, booking_source: e.target.value, agent_id: '', direct_source: '' }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="direct">Direct</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            {/* Direct Source or Agent */}
            {formData.booking_source === 'direct' ? (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Direct Source
                </label>
                <input
                  type="text"
                  value={formData.direct_source}
                  onChange={(e) => setFormData(prev => ({ ...prev, direct_source: e.target.value }))}
                  placeholder="e.g., Walk-in, Phone"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            ) : (
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                  Select Agent *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={formData.agent_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, agent_id: e.target.value }))}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select Agent</option>
                    {agents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAgentForm(true)}
                    style={{
                      padding: '8px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <UserPlus size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Guest Selection */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Select Guest *
              </label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <select
                  value={formData.guest_id}
                  onChange={(e) => handleGuestSelect(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Guest</option>
                  {guests.map(guest => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name} - {guest.phone}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setShowGuestForm(true)}
                  style={{
                    padding: '8px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <UserPlus size={16} />
                </button>
              </div>
              
              {/* Quick phone search */}
              <input
                type="tel"
                placeholder="Or search by phone number"
                onBlur={(e) => handleGuestSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}
              />

              {selectedGuest && (
                <div style={{
                  marginTop: '8px',
                  padding: '12px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  fontSize: '13px'
                }}>
                  <strong>{selectedGuest.name}</strong> • {selectedGuest.phone}
                </div>
              )}
            </div>

            {/* Room Details */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '12px' }}>
                Guest Count per Room
              </label>
              {roomDetails.map((rd, index) => {
                const room = rooms.find(r => r.id === rd.room_id);
                return (
                  <div key={index} style={{
                    padding: '12px',
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    marginBottom: '8px'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      Room {room?.room_number}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          Adults *
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={rd.number_of_adults}
                          onChange={(e) => updateRoomDetail(index, 'number_of_adults', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          Children
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rd.number_of_children}
                          onChange={(e) => updateRoomDetail(index, 'number_of_children', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                          Infants
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={rd.number_of_infants}
                          onChange={(e) => updateRoomDetail(index, 'number_of_infants', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Meal Plan */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Meal Plan *
              </label>
              <select
                value={formData.meal_plan}
                onChange={(e) => setFormData(prev => ({ ...prev, meal_plan: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="NM">No Meal</option>
                <option value="BO">Breakfast Only</option>
                <option value="HB">Half Board</option>
                <option value="FB">Full Board</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="Inquiry">Inquiry</option>
                <option value="Tentative">Tentative</option>
                <option value="Hold">Hold</option>
                <option value="Confirmed">Confirmed</option>
              </select>
            </div>

            {/* Total Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Total Amount *
              </label>
              <input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Advance Payment */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Advance Payment
              </label>
              <input
                type="number"
                value={formData.advance_payment}
                onChange={(e) => setFormData(prev => ({ ...prev, advance_payment: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Payment Status */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Payment Status
              </label>
              <select
                value={formData.payment_status}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_status: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {/* Special Requests */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Special Requests
              </label>
              <textarea
                value={formData.special_requests}
                onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
                rows="2"
                placeholder="Any special requirements..."
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>
          </div>

          {/* Guest Form Modal */}
          {showGuestForm && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 10000,
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Add New Guest</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={guestFormData.name}
                  onChange={(e) => setGuestFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={guestFormData.phone}
                  onChange={(e) => setGuestFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={guestFormData.email}
                  onChange={(e) => setGuestFormData(prev => ({ ...prev, email: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setShowGuestForm(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGuest}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Add Guest
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Agent Form Modal */}
          {showAgentForm && (
            <div style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              zIndex: 10000,
              maxWidth: '500px',
              width: '90%'
            }}>
              <h3 style={{ margin: '0 0 16px 0' }}>Add New Agent</h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Agent Name *"
                  value={agentFormData.name}
                  onChange={(e) => setAgentFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={agentFormData.phone}
                  onChange={(e) => setAgentFormData(prev => ({ ...prev, phone: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="number"
                  placeholder="Commission %"
                  value={agentFormData.commission}
                  onChange={(e) => setAgentFormData(prev => ({ ...prev, commission: e.target.value }))}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    onClick={() => setShowAgentForm(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#f3f4f6',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAgent}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Add Agent
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          background: '#f9fafb'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <Save size={16} />
            Create Reservation
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationCalendar;