// src/pages/dashboard/Dashboard.jsx
import { LogIn, LogOut, Calendar, Clock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import ReservationSummary from '../../components/reservations/ReservationSummary';
import { useRooms } from '../../context/RoomContext';
import { useReservations } from '../../context/ReservationContext';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const { rooms } = useRooms();
  const { reservations } = useReservations();
  
  const todayReservations = reservations.filter(r => {
    const today = new Date().toISOString().split('T')[0];
    return r.check_in_date === today || r.check_out_date === today;
  });

  

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      

      {/* Reservation Summary */}
      <ReservationSummary
        reservations={reservations}
        filteredReservations={reservations}
        showToggle={false}
        defaultExpanded={true}
      />

      <div className={styles.dashboardGrid}>
        {/* Today's Check-ins/Check-outs Card */}
        <div className={`${styles.dashboardCard} ${styles.checkInsCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Today's Check-ins/Check-outs</h3>
          </div>
          <div className={styles.cardBody}>
            {todayReservations.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>No check-ins or check-outs today</p>
              </div>
            ) : (
              <div className={styles.reservationList}>
                {todayReservations.map(r => {
                  const isCheckIn = r.check_in_date === new Date().toISOString().split('T')[0];
                  return (
                    <div key={r.id} className={styles.reservationItem}>
                      <div className={styles.reservationInfo}>
                        <span className={styles.guestName}>{r.guests?.name || 'Unknown'}</span>
                        <div className={styles.reservationDetails}>
                          <span className={`${styles.typeBadge} ${isCheckIn ? styles.typeCheckIn : styles.typeCheckOut}`}>
                            {isCheckIn ? (
                              <>
                                <LogIn className={styles.icon} />
                                Check-in
                              </>
                            ) : (
                              <>
                                <LogOut className={styles.icon} />
                                Check-out
                              </>
                            )}
                          </span>
                          <span className={styles.divider}></span>
                          <Clock size={14} />
                          <span>{isCheckIn ? r.check_in_date : r.check_out_date}</span>
                        </div>
                      </div>
                      <div className={styles.statusBadgeContainer}>
                        <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Bookings Card */}
        <div className={`${styles.dashboardCard} ${styles.recentBookingsCard}`}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Recent Bookings</h3>
          </div>
          <div className={styles.cardBody}>
            {reservations.length === 0 ? (
              <div className={styles.emptyState}>
                <Calendar className={styles.emptyStateIcon} />
                <p className={styles.emptyStateText}>No bookings yet</p>
              </div>
            ) : (
              <div className={styles.reservationList}>
                {reservations.slice(0, 5).map(r => (
                  <div key={r.id} className={styles.reservationItem}>
                    <div className={styles.reservationInfo}>
                      <span className={styles.guestName}>{r.guests?.name || 'Unknown'}</span>
                      <div className={styles.reservationDetails}>
                        <Calendar size={14} />
                        <span>{r.check_in_date}</span>
                        <span className={styles.divider}></span>
                        <span>{r.check_out_date}</span>
                      </div>
                    </div>
                    <div className={styles.statusBadgeContainer}>
                      <span className={`status-badge status-${r.status.toLowerCase()}`}>{r.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;