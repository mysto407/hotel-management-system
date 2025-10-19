// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Plus, Edit2, XOctagon, Save, XCircle, CheckCircle, LogOut, Search, Filter } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { calculateDays } from '../../utils/helpers';

const Reservations = () => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation } = useReservations();
  const { rooms, roomTypes } = useRooms();
  const { guests, getGuestByPhone, addGuest } = useGuests();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    guest_id: '',
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    guest_id_proof: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 1,
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
    status: 'Upcoming',
    special_requests: ''
  });

  const handleSubmit = async () => {
    // Check if guest exists or create new one
    let guestId = formData.guest_id;
    
    if (!guestId && formData.guest_phone) {
      // Try to find existing guest by phone
      let guest = getGuestByPhone(formData.guest_phone);
      
      if (!guest) {
        // Create new guest
        const newGuest = await addGuest({
          name: formData.guest_name,
          email: formData.guest_email,
          phone: formData.guest_phone,
          id_proof_type: 'AADHAR',
          id_proof_number: formData.guest_id_proof || 'N/A',
          guest_type: 'Regular'
        });
        
        if (newGuest) {
          guestId = newGuest.id;
        }
      } else {
        guestId = guest.id;
      }
    }

    const reservationData = {
      guest_id: guestId,
      room_id: formData.room_id,
      check_in_date: formData.check_in_date,
      check_out_date: formData.check_out_date,
      number_of_guests: parseInt(formData.number_of_guests),
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
      guest_id: '',
      guest_name: '',
      guest_email: '',
      guest_phone: '',
      guest_id_proof: '',
      room_id: '',
      check_in_date: '',
      check_out_date: '',
      number_of_guests: 1,
      total_amount: 0,
      advance_payment: 0,
      payment_status: 'Pending',
      status: 'Upcoming',
      special_requests: ''
    });
    setEditingReservation(null);
    setIsModalOpen(false);
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setFormData({
      guest_id: reservation.guest_id,
      guest_name: reservation.guests?.name || '',
      guest_email: reservation.guests?.email || '',
      guest_phone: reservation.guests?.phone || '',
      guest_id_proof: '',
      room_id: reservation.room_id,
      check_in_date: reservation.check_in_date,
      check_out_date: reservation.check_out_date,
      number_of_guests: reservation.number_of_guests,
      total_amount: reservation.total_amount,
      advance_payment: reservation.advance_payment,
      payment_status: reservation.payment_status,
      status: reservation.status,
      special_requests: reservation.special_requests || ''
    });
    setIsModalOpen(true);
  };

  const handleCheckIn = (reservation) => {
    checkIn(reservation.id);
  };

  const handleCheckOut = (reservation) => {
    checkOut(reservation.id);
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
          setFormData({...formData, total_amount: total});
        }
      }
    }
  };

  const handleGuestPhoneChange = (phone) => {
    setFormData({...formData, guest_phone: phone});
    
    // Auto-fill if guest exists
    const guest = getGuestByPhone(phone);
    if (guest) {
      setFormData({
        ...formData,
        guest_id: guest.id,
        guest_phone: phone,
        guest_name: guest.name,
        guest_email: guest.email || ''
      });
    }
  };

  const getRoomInfo = (room) => {
    if (!room) return 'Unknown';
    const roomType = roomTypes.find(rt => rt.id === room.room_type_id);
    return `${room.room_number} - ${roomType?.name || 'Unknown'}`;
  };

  const availableRooms = rooms.filter(r => r.status === 'Available');

  const filteredReservations = reservations
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r =>
      r.guests?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.guests?.phone?.includes(searchTerm)
    );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Reservations</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> New Booking
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by guest name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Reservations</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Checked-in">Checked-in</option>
            <option value="Checked-out">Checked-out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
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
                  <small style={{color: '#6b7280'}}>{reservation.guests?.phone || 'N/A'}</small>
                </td>
                <td>{getRoomInfo(reservation.rooms)}</td>
                <td>{reservation.check_in_date}</td>
                <td>{reservation.check_out_date}</td>
                <td>{reservation.number_of_guests}</td>
                <td>₹{reservation.total_amount}</td>
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
                    reservation.status === 'Upcoming' ? 'status-maintenance' :
                    reservation.status === 'Checked-in' ? 'status-occupied' :
                    reservation.status === 'Checked-out' ? 'status-available' :
                    'status-blocked'
                  }`}>
                    {reservation.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {reservation.status === 'Upcoming' && (
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
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingReservation ? 'Edit Reservation' : 'New Booking'}
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Guest Phone *</label>
            <input
              type="tel"
              value={formData.guest_phone}
              onChange={(e) => handleGuestPhoneChange(e.target.value)}
              placeholder="9876543210"
            />
            <small style={{color: '#6b7280'}}>Auto-fills if guest exists</small>
          </div>
          <div className="form-group">
            <label>Guest Name *</label>
            <input
              type="text"
              value={formData.guest_name}
              onChange={(e) => setFormData({...formData, guest_name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.guest_email}
              onChange={(e) => setFormData({...formData, guest_email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof</label>
            <input
              type="text"
              value={formData.guest_id_proof}
              onChange={(e) => setFormData({...formData, guest_id_proof: e.target.value})}
              placeholder="AADHAR/PAN"
            />
          </div>
          <div className="form-group">
            <label>Room *</label>
            <select
              value={formData.room_id}
              onChange={(e) => setFormData({...formData, room_id: e.target.value})}
              onBlur={calculateTotal}
            >
              <option value="">Select Room</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>{getRoomInfo(room)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Number of Guests</label>
            <input
              type="number"
              min="1"
              value={formData.number_of_guests}
              onChange={(e) => setFormData({...formData, number_of_guests: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Check-in Date *</label>
            <input
              type="date"
              value={formData.check_in_date}
              onChange={(e) => setFormData({...formData, check_in_date: e.target.value})}
              onBlur={calculateTotal}
            />
          </div>
          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={formData.check_out_date}
              onChange={(e) => setFormData({...formData, check_out_date: e.target.value})}
              onBlur={calculateTotal}
            />
          </div>
          <div className="form-group">
            <label>Total Amount</label>
            <input
              type="number"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
              placeholder="Auto-calculated"
            />
          </div>
          <div className="form-group">
            <label>Advance Payment</label>
            <input
              type="number"
              value={formData.advance_payment}
              onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
              placeholder="0"
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
              <option value="Upcoming">Upcoming</option>
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
    </div>
  );
};

export default Reservations;