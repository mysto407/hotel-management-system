// ==========================================
// FILE: src/pages/reservations/ReservationCalendar.jsx
// ==========================================
import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const ReservationCalendar = () => {
  const { reservations } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const getRoomInfo = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return { number: 'Unknown', type: 'Unknown' };
    const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
    return { number: room.roomNumber, type: roomType?.name || 'Unknown' };
  };

  const getReservationsForDate = (date) => {
    return reservations.filter(r => {
      const checkIn = new Date(r.checkInDate);
      const checkOut = new Date(r.checkOutDate);
      const current = new Date(date);
      return current >= checkIn && current <= checkOut && (r.status === 'Upcoming' || r.status === 'Checked-in');
    });
  };

  const currentReservations = getReservationsForDate(selectedDate);

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  };

  const dates = generateDates();

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Booking Calendar</h1>
        <div className="filter-group">
          <label>Select Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="filter-select"
          />
        </div>
      </div>

      <Card title={`Reservations for ${selectedDate}`}>
        {currentReservations.length === 0 ? (
          <p className="placeholder-text">No reservations for this date</p>
        ) : (
          <div className="reservation-list">
            {currentReservations.map(r => {
              const roomInfo = getRoomInfo(r.roomId);
              return (
                <div key={r.id} className="reservation-item">
                  <div className="reservation-info">
                    <h4>Room {roomInfo.number}</h4>
                    <p>{roomInfo.type}</p>
                  </div>
                  <div className="reservation-guest">
                    <strong>{r.guestName}</strong>
                    <p>{r.checkInDate} to {r.checkOutDate}</p>
                  </div>
                  <span className={`status-badge ${r.status === 'Checked-in' ? 'status-occupied' : 'status-maintenance'}`}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="14-Day Overview">
        <div className="calendar-grid">
          {dates.map(date => {
            const reservationsCount = getReservationsForDate(date).length;
            const dateObj = new Date(date);
            const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = dateObj.getDate();
            
            return (
              <div
                key={date}
                className={`calendar-day ${date === selectedDate ? 'selected' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="calendar-day-header">
                  <span className="day-name">{dayName}</span>
                  <span className="day-num">{dayNum}</span>
                </div>
                <div className="calendar-day-body">
                  <span className="booking-count">
                    {reservationsCount} booking{reservationsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default ReservationCalendar;