// ==========================================
// FILE: src/pages/dashboard/Dashboard.jsx
// ==========================================
import { Card } from '../../components/common/Card';
import { useRooms } from '../../context/RoomContext';
import { useReservations } from '../../context/ReservationContext';

const Dashboard = () => {
  const { rooms } = useRooms();
  const { reservations } = useReservations();
  
  const todayReservations = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.checkInDate === today || r.checkOutDate === today;
  });

  const stats = [
    { label: 'Total Rooms', value: rooms.length, color: '#3b82f6' },
    { label: 'Occupied', value: rooms.filter(r => r.status === 'Occupied').length, color: '#ef4444' },
    { label: 'Available', value: rooms.filter(r => r.status === 'Available').length, color: '#10b981' },
    { label: "Today's Activity", value: todayReservations.length, color: '#f59e0b' }
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <Card key={index}>
            <div className="stat-card">
              <div>
                <p className="stat-label">{stat.label}</p>
                <p className="stat-value">{stat.value}</p>
              </div>
              <div className="stat-icon" style={{ backgroundColor: stat.color }}></div>
            </div>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card title="Today's Check-ins/Check-outs">
          {todayReservations.length === 0 ? (
            <p className="placeholder-text">No check-ins or check-outs today</p>
          ) : (
            <div className="reservation-list">
              {todayReservations.map(r => (
                <div key={r.id} className="reservation-item">
                  <div>
                    <strong>{r.guestName}</strong>
                    <p style={{fontSize: '13px', color: '#6b7280'}}>
                      {r.checkInDate === new Date().toISOString().split('T')[0] ? 'Check-in' : 'Check-out'}
                    </p>
                  </div>
                  <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Bookings">
          {reservations.length === 0 ? (
            <p className="placeholder-text">No bookings yet</p>
          ) : (
            <div className="reservation-list">
              {reservations.slice(0, 5).map(r => (
                <div key={r.id} className="reservation-item">
                  <div>
                    <strong>{r.guestName}</strong>
                    <p style={{fontSize: '13px', color: '#6b7280'}}>{r.checkInDate} - {r.checkOutDate}</p>
                  </div>
                  <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;