// src/components/reservations/ReservationSummary.jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './ReservationSummary.module.css';

const ReservationSummary = ({ 
  reservations, 
  filteredReservations, 
  dateFilterType = 'all',
  startDate = '',
  endDate = '',
  showToggle = true,
  defaultExpanded = true
}) => {
  const [showSummary, setShowSummary] = useState(defaultExpanded);

  // Helper function to group reservations
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

  const totalBookings = groupReservations(reservations).length;
  const filteredBookings = groupReservations(filteredReservations).length;
  const filteredRooms = filteredReservations.length;

  return (
    <div className={styles.summaryContainer}>
      {/* Summary Header - Collapsible */}
      <div 
        className={`${styles.summaryHeader} ${!showSummary ? styles.summaryHeaderClosed : ''}`}
        onClick={showToggle ? () => setShowSummary(!showSummary) : undefined}
        style={showToggle ? { cursor: 'pointer' } : { cursor: 'default' }}
      >
        <div className={styles.summaryHeaderContent}>
          <h3 className={styles.summaryTitle}>
            Summary
          </h3>
          <div className={styles.summarySubtitle}>
            Showing <strong className={styles.summaryCount}>{filteredBookings}</strong> {filteredBookings === 1 ? 'booking' : 'bookings'} ({filteredRooms} {filteredRooms === 1 ? 'room' : 'rooms'}) of{' '}
            <strong className={styles.summaryCount}>{totalBookings}</strong> total bookings
            {(dateFilterType !== 'all' && (startDate || endDate)) && (
              <>
                {' • '}
                <span className={styles.dateRange}>
                  {dateFilterType === 'today' && 'Today'}
                  {dateFilterType === 'weekly' && 'Next 7 Days'}
                  {dateFilterType === 'fortnightly' && 'Next 14 Days'}
                  {dateFilterType === 'monthly' && 'Next 30 Days'}
                  {dateFilterType === 'custom' && startDate && endDate && `${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  {dateFilterType === 'custom' && startDate && !endDate && `From ${new Date(startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                  {dateFilterType === 'custom' && !startDate && endDate && `Until ${new Date(endDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                </span>
              </>
            )}
          </div>
        </div>
        {showToggle && (
          <ChevronDown 
            size={16}
            className={`${styles.filterChevron} ${showSummary ? styles.filterChevronOpen : ''}`}
          />
        )}
      </div>

      {/* Summary Content */}
      {showSummary && (
        <div className={styles.summaryBody}>
          <div className={styles.summaryGrid}>
            {/* Guests & Meals Summary */}
            <div className={`${styles.summaryCard} ${styles.guestsAndMeals}`}>
              <div className={styles.summaryCardTitle}>Guest Overview</div>
              
              {/* Active Guests - Prominent Display */}
              <div className={styles.activeGuestsSection}>
                <div className={styles.activeGuestsHeader}>
                  <span className={styles.activeGuestsLabel}>Active Guests</span>
                  <span className={styles.activeGuestsCount}>
                    {filteredReservations
                      .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      )}
                  </span>
                </div>
                
                {/* Guest Type Breakdown */}
                <div className={styles.guestTypeGrid}>
                  <div className={styles.guestTypeCard}>
                    <div className={styles.guestTypeValue}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_adults || 0), 0)}
                    </div>
                    <div className={styles.guestTypeLabel}>Adults</div>
                  </div>
                  <div className={styles.guestTypeCard}>
                    <div className={styles.guestTypeValue}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_children || 0), 0)}
                    </div>
                    <div className={styles.guestTypeLabel}>Children</div>
                  </div>
                  <div className={styles.guestTypeCard}>
                    <div className={styles.guestTypeValue}>
                      {filteredReservations
                        .filter(r => r.status === 'Confirmed' || r.status === 'Checked-in')
                        .reduce((sum, r) => sum + (r.number_of_infants || 0), 0)}
                    </div>
                    <div className={styles.guestTypeLabel}>Infants</div>
                  </div>
                </div>
              </div>

              {/* Meal Plans Section */}
              <div className={styles.mealPlansSection}>
                <div className={styles.mealPlansSectionTitle}>Meal Plans</div>
                <div className={styles.mealPlansGrid}>
                  {[
                    { code: 'NM', label: 'No Meal', color: '#64748b' },
                    { code: 'BO', label: 'Breakfast', color: '#f59e0b' },
                    { code: 'HB', label: 'Half Board', color: '#8b5cf6' },
                    { code: 'FB', label: 'Full Board', color: '#ec4899' }
                  ].map(({ code, label, color }) => {
                    const guestCount = filteredReservations
                      .filter(r => r.meal_plan === code && r.status !== 'Checked-out')
                      .reduce((sum, r) => 
                        sum + ((r.number_of_adults || 0) + (r.number_of_children || 0) + (r.number_of_infants || 0)), 0
                      );
                    if (guestCount === 0) return null;
                    return (
                      <div key={code} className={styles.mealPlanCard}>
                        <div className={styles.mealPlanCount} style={{ color }}>
                          {guestCount}
                        </div>
                        <div className={styles.mealPlanLabel}>{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Booking Status */}
            <div className={`${styles.summaryCard} ${styles.bookingStatus}`}>
              <div className={styles.summaryCardTitle}>Booking Status</div>
              <div className={styles.statusGrid}>
                {[
                  { status: 'Inquiry', color: '#a855f7' },
                  { status: 'Tentative', color: '#f59e0b' },
                  { status: 'Hold', color: '#fb923c' },
                  { status: 'Confirmed', color: '#10b981' },
                  { status: 'Checked-in', color: '#3b82f6' },
                  { status: 'Checked-out', color: '#059669' },
                  { status: 'Cancelled', color: '#ef4444' }
                ].map(({ status, color }) => {
                  const count = filteredReservations.filter(r => r.status === status).length;
                  return (
                    <div key={status} className={`${styles.statusItem} ${count === 0 ? styles.statusItemZero : ''}`}>
                      <span className={styles.statusItemValue} style={{ color }}>
                        {count}
                      </span>
                      <span className={styles.statusItemLabel}>
                        {count === 1 ? 'Room' : 'Rooms'} {status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment Status */}
            <div className={`${styles.summaryCard} ${styles.paymentStatus}`}>
              <div className={styles.summaryCardTitle}>Payment Status</div>
              <div className={styles.paymentStatusGrid}>
                {['Paid', 'Partial', 'Pending'].map(paymentStatus => {
                  const count = filteredReservations.filter(r => r.payment_status === paymentStatus).length;
                  return (
                    <div key={paymentStatus} className={`${styles.paymentStatusItem} ${count === 0 ? styles.paymentStatusItemZero : ''}`}>
                      <span className={`status-badge ${
                        paymentStatus === 'Paid' ? 'status-available' :
                        paymentStatus === 'Partial' ? 'status-maintenance' :
                        'status-blocked'
                      }`}>{paymentStatus}</span>
                      <span className={styles.paymentStatusValue}>
                        {count} {count === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Summary */}
            <div className={`${styles.summaryCard} ${styles.financial}`}>
              <div className={styles.summaryCardTitle}>Financial Overview</div>
              
              {/* Total Revenue Header */}
              <div className={styles.financialHeader}>
                <span className={styles.financialHeaderLabel}>Total Revenue</span>
                <span className={styles.financialHeaderValue}>
                  ₹{filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0).toLocaleString()}
                </span>
              </div>
              
              {/* Payment Breakdown Grid */}
              <div className={styles.financialGrid}>
                <div className={styles.financialCard}>
                  <div className={styles.financialCardLabel}>Advance Collected</div>
                  <div className={`${styles.financialCardValue} ${styles.advance}`}>
                    ₹{filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0).toLocaleString()}
                  </div>
                </div>
                
                <div className={styles.financialCard}>
                  <div className={styles.financialCardLabel}>Balance Due</div>
                  <div className={`${styles.financialCardValue} ${styles.balance}`}>
                    ₹{(filteredReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0) - filteredReservations.reduce((sum, r) => sum + (r.advance_payment || 0), 0)).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Payment Progress Section */}
              <div className={styles.financialProgressSection}>
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
                    : 0}% Payment Collected
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationSummary;