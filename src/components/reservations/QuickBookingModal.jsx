// src/components/reservations/QuickBookingModal.jsx
import { Modal } from '../common/Modal';
import { Save, X, UserPlus } from 'lucide-react';
// You will need to move the relevant styles from ReservationCalendar.module.css
// to a new file, e.g., QuickBookingModal.module.css
import styles from './QuickBookingModal.module.css';

/*
Create src/components/reservations/QuickBookingModal.module.css
and add these styles from ReservationCalendar.module.css:
.modalInfoBox
.modalInfoBoxTitle
.modalInfoBoxText
.modalInfoBoxWarning
.modalInfoBoxWarningTitle
.modalInfoBoxWarningText
*/

export const QuickBookingModal = ({
  isOpen,
  onClose,
  onSubmit,
  bookingData,
  setBookingData,
  guests,
  rooms,
  roomTypes,
  agents,
  pendingBookings = [],
  onAddGuestClick,
  onAddAgentClick
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={pendingBookings.length > 1 ? `Quick Booking (Creating ${pendingBookings.length} bookings)` : "Quick Booking"}
      size="medium"
    >
      <div className="form-grid">
        {/* Multi-booking indicator */}
        {pendingBookings.length > 1 && (
          <div className="form-group full-width">
            <div className={`${styles.modalInfoBox} ${styles.modalInfoBoxWarning}`}>
              <div className={styles.modalInfoBoxWarningTitle}>
                Multi-Room Booking
              </div>
              <div className={styles.modalInfoBoxWarningText}>
                You're creating <strong>{pendingBookings.length} bookings</strong> at once. Enter guest details once, and all bookings will use the same information.
              </div>
              <div className={`${styles.modalInfoBoxWarningText}`} style={{ marginTop: '8px', fontStyle: 'italic' }}>
                Rooms: {pendingBookings.map((b) => {
                  const room = rooms.find(r => r.id === b.roomId);
                  return room?.room_number || '?';
                }).join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Room and Date Info */}
        <div className="form-group full-width">
          <div className={styles.modalInfoBox}>
            <div className={styles.modalInfoBoxTitle}>
              {(() => {
                const room = rooms.find(r => r.id === bookingData.room_id);
                const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
                return `Room ${room?.room_number || ''} - ${roomType?.name || ''}`;
              })()}
            </div>
            <div className={styles.modalInfoBoxText}>
              Check-in: {bookingData.check_in_date}
            </div>
            <div className={styles.modalInfoBoxText}>
              Check-out: {bookingData.check_out_date}
            </div>
            {bookingData.check_in_date && bookingData.check_out_date && (
              <div className={styles.modalInfoBoxText} style={{ fontWeight: '700', marginTop: '6px' }}>
                {(() => {
                  const nights = Math.ceil((new Date(bookingData.check_out_date) - new Date(bookingData.check_in_date)) / (1000 * 60 * 60 * 24));
                  return `${nights} night${nights !== 1 ? 's' : ''}`;
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Booking Source */}
        <div className="form-group">
          <label>Booking Source *</label>
          <select
            value={bookingData.booking_source || 'direct'}
            onChange={(e) => {
              setBookingData({
                ...bookingData, 
                booking_source: e.target.value, 
                agent_id: '', 
                direct_source: ''
              });
            }}
          >
            <option value="direct">Direct</option>
            <option value="agent">Agent</option>
          </select>
        </div>

        {/* Direct Source */}
        {bookingData.booking_source === 'direct' && (
          <div className="form-group">
            <label>Direct Booking Source</label>
            <input
              type="text"
              value={bookingData.direct_source || ''}
              onChange={(e) => setBookingData({...bookingData, direct_source: e.target.value})}
              placeholder="e.g., Walk-in, Phone Call, Website"
            />
            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block', fontSize: '12px' }}>
              Optional: Specify where this booking came from
            </small>
          </div>
        )}

        {/* Agent Selection */}
        {bookingData.booking_source === 'agent' && (
          <div className="form-group">
            <label>Select Agent *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={bookingData.agent_id || ''}
                onChange={(e) => setBookingData({...bookingData, agent_id: e.target.value})}
              >
                <option value="">Select Agent</option>
                {agents && agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} - {agent.phone}
                  </option>
                ))}
              </select>
              <button 
                onClick={onAddAgentClick} 
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
              onClick={onAddGuestClick}
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
            <option value="FB">Full Board</option>
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
        <button onClick={onClose} className="btn-secondary">
          <X size={18} /> Cancel
        </button>
        <button onClick={onSubmit} className="btn-primary">
          <Save size={18} /> Create Booking
        </button>
      </div>
    </Modal>
  );
};