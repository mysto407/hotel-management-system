// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar, CalendarDays, Users, Home } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const ReservationCalendar = () => {
  const { reservations } = useReservations();
  const { rooms, roomTypes } = useRooms();
  
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const containerRef = useRef(null);

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
          
          {/* Quick Stats */}
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

      {/* Legend */}
      <Card className="calendar-legend-card">
        <div className="calendar-legend">
          <span className="legend-title">Legend:</span>
          <div className="legend-items">
            <div className="legend-item">
              <div className="legend-box legend-available"></div>
              <span>Available</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-occupied"></div>
              <span>Occupied</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-maintenance"></div>
              <span>Maintenance</span>
            </div>
            <div className="legend-item">
              <div className="legend-box legend-blocked"></div>
              <span>Blocked</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card className="calendar-grid-card">
        <div 
          className="calendar-table-container"
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <table className="calendar-table">
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
                          
                          return (
                            <td 
                              key={date} 
                              className={`calendar-cell ${getCellStyle(roomStatus.status)}`}
                              title={roomStatus.guestName || roomStatus.status}
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
      </Card>
    </div>
  );
};

export default ReservationCalendar;