// src/pages/reservations/ReservationCalendar.jsx
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const ReservationCalendar = () => {
  const { reservations } = useReservations();
  const { rooms, roomTypes } = useRooms();
  
  const [startDate, setStartDate] = useState(new Date());
  const [daysToShow, setDaysToShow] = useState(14);
  const [expandedRoomTypes, setExpandedRoomTypes] = useState({});

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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Booking Calendar</h1>
        <div className="calendar-controls">
          <button onClick={goToPreviousWeek} className="btn-secondary">
            <ChevronLeft size={18} /> Previous Week
          </button>
          <button onClick={goToToday} className="btn-secondary">
            <Calendar size={18} /> Today
          </button>
          <button onClick={goToNextWeek} className="btn-secondary">
            Next Week <ChevronRight size={18} />
          </button>
          <select
            value={daysToShow}
            onChange={(e) => setDaysToShow(parseInt(e.target.value))}
            className="filter-select"
          >
            <option value="7">7 Days</option>
            <option value="14">14 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
      </div>

      {/* Calendar Grid */}
      <Card>
        <div className="calendar-table-container" style={{ overflowX: 'scroll' }}>
          <table className="calendar-table">
            <thead>
              {/* Date Headers */}
              <tr>
                <th className="calendar-fixed-column">Room Type / Room</th>
                {generateDates.map(date => {
                  const dateObj = new Date(date);
                  const isToday = date === new Date().toISOString().split('T')[0];
                  return (
                    <th key={date} className={`calendar-date-header ${isToday ? 'today' : ''}`}>
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
                <th className="calendar-fixed-column availability-label">Total Availability</th>
                {generateDates.map(date => {
                  const availability = getTotalAvailability(date);
                  return (
                    <td key={date} className="availability-cell">
                      <div className="availability-content">
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
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <strong>{roomType.name}</strong>
                          <span className="room-count">({typeRooms.length} rooms)</span>
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
                                  backgroundColor: percentage > 50 ? '#10b981' : percentage > 20 ? '#f59e0b' : '#ef4444'
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
                          <span className="room-number">Room {room.room_number}</span>
                          <span className="room-floor">Floor {room.floor}</span>
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
                                <div className="cell-content">
                                  <div className="guest-name">{roomStatus.guestName}</div>
                                  <div className="reservation-status">{roomStatus.statusType}</div>
                                </div>
                              )}
                              {roomStatus.status === 'maintenance' && (
                                <div className="cell-content">
                                  <div className="status-label">Maintenance</div>
                                </div>
                              )}
                              {roomStatus.status === 'blocked' && (
                                <div className="cell-content">
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