// src/pages/reservations/Reservations.jsx
import { useState } from 'react';
import { Plus, Edit2, XOctagon, Save, XCircle, CheckCircle, LogOut, Search, Filter, UserPlus } from 'lucide-react';
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
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);

  const [formData, setFormData] = useState({
    guest_id: '',
    room_id: '',
    check_in_date: '',
    check_out_date: '',
    number_of_guests: 1,
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
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

  const handleSubmit = async () => {
    if (!formData.guest_id || !formData.room_id || !formData.check_in_date || !formData.check_out_date) {
      alert('Please fill all required fields');
      return;
    }

    const reservationData = {
      guest_id: formData.guest_id,
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
      room_id: '',
      check_in_date: '',
      check_out_date: '',
      number_of_guests: 1,
      total_amount: 0,
      advance_payment: 0,
      payment_status: 'Pending',
      status: 'Confirmed',
      special_requests: ''
    });
    setSelectedGuest(null);
    setEditingReservation(null);
    setIsModalOpen(false);
  };

  const resetGuestForm = () => {
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
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name || !guestFormData.phone || !guestFormData.id_proof_number) {
      alert('Please fill required guest fields (Name, Phone, ID Proof Number)');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setFormData({ ...formData, guest_id: newGuest.id });
      setSelectedGuest(newGuest);
      resetGuestForm();
    }
  };

  const handleGuestSearch = (phone) => {
    const guest = getGuestByPhone(phone);
    if (guest) {
      setFormData({ ...formData, guest_id: guest.id });
      setSelectedGuest(guest);
    } else {
      setFormData({ ...formData, guest_id: '' });
      setSelectedGuest(null);
    }
  };

  const handleGuestSelect = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setFormData({ ...formData, guest_id: guestId });
    setSelectedGuest(guest);
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setSelectedGuest(reservation.guests);
    setFormData({
      guest_id: reservation.guest_id,
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
    if (window.confirm(`Check in ${reservation.guests?.name}?`)) {
      checkIn(reservation.id);
    }
  };

  const handleCheckOut = (reservation) => {
    if (window.confirm(`Check out ${reservation.guests?.name}?`)) {
      checkOut(reservation.id);
    }
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
          setFormData(prev => ({ ...prev, total_amount: total }));
        }
      }
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
            <option value="Confirmed">Confirmed</option>
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
                    reservation.status === 'Confirmed' ? 'status-maintenance' :
                    reservation.status === 'Checked-in' ? 'status-occupied' :
                    reservation.status === 'Checked-out' ? 'status-available' :
                    'status-blocked'
                  }`}>
                    {reservation.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {reservation.status === 'Confirmed' && (
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

      {/* Reservation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingReservation ? 'Edit Reservation' : 'New Booking'}
        size="large"
      >
        <div className="form-grid">
          {/* Guest Selection */}
          <div className="form-group full-width">
            <label>Select Guest *</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                style={{ flex: 1 }}
                value={formData.guest_id}
                onChange={(e) => handleGuestSelect(e.target.value)}
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
                <UserPlus size={18} /> New Guest
              </button>
            </div>
          </div>

          {/* Guest Quick Search */}
          <div className="form-group full-width">
            <label>Or Search by Phone</label>
            <input
              type="tel"
              placeholder="Enter phone number to search"
              onBlur={(e) => handleGuestSearch(e.target.value)}
            />
          </div>

          {/* Selected Guest Info */}
          {selectedGuest && (
            <div className="form-group full-width">
              <div style={{ 
                padding: '12px', 
                background: '#f0f9ff', 
                border: '1px solid #bae6fd',
                borderRadius: '6px' 
              }}>
                <strong>{selectedGuest.name}</strong>
                <p style={{ fontSize: '13px', color: '#0369a1', margin: '4px 0 0 0' }}>
                  {selectedGuest.phone} • {selectedGuest.email || 'No email'}
                </p>
              </div>
            </div>
          )}

          {/* Room Selection */}
          <div className="form-group">
            <label>Room *</label>
            <select
              value={formData.room_id}
              onChange={(e) => {
                setFormData({...formData, room_id: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
              disabled={editingReservation}
            >
              <option value="">Select Room</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>{getRoomInfo(room)}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Number of Guests *</label>
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
              onChange={(e) => {
                setFormData({...formData, check_in_date: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={formData.check_out_date}
              onChange={(e) => {
                setFormData({...formData, check_out_date: e.target.value});
                setTimeout(calculateTotal, 0);
              }}
            />
          </div>

          <div className="form-group">
            <label>Total Amount *</label>
            <input
              type="number"
              value={formData.total_amount}
              onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label>Advance Payment</label>
            <input
              type="number"
              value={formData.advance_payment}
              onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
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
              <option value="Confirmed">Confirmed</option>
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

      {/* Quick Add Guest Modal */}
      <Modal
        isOpen={isGuestModalOpen}
        onClose={resetGuestForm}
        title="Add New Guest"
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={guestFormData.name}
              onChange={(e) => setGuestFormData({...guestFormData, name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              value={guestFormData.phone}
              onChange={(e) => setGuestFormData({...guestFormData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={guestFormData.email}
              onChange={(e) => setGuestFormData({...guestFormData, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof Type *</label>
            <select
              value={guestFormData.id_proof_type}
              onChange={(e) => setGuestFormData({...guestFormData, id_proof_type: e.target.value})}
            >
              <option value="AADHAR">AADHAR</option>
              <option value="PAN">PAN</option>
              <option value="Passport">Passport</option>
              <option value="Driving License">Driving License</option>
              <option value="Voter ID">Voter ID</option>
            </select>
          </div>
          <div className="form-group">
            <label>ID Proof Number *</label>
            <input
              type="text"
              value={guestFormData.id_proof_number}
              onChange={(e) => setGuestFormData({...guestFormData, id_proof_number: e.target.value})}
              placeholder="AADHAR-1234"
            />
          </div>
          <div className="form-group">
            <label>Guest Type</label>
            <select
              value={guestFormData.guest_type}
              onChange={(e) => setGuestFormData({...guestFormData, guest_type: e.target.value})}
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
              onChange={(e) => setGuestFormData({...guestFormData, address: e.target.value})}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={guestFormData.city}
              onChange={(e) => setGuestFormData({...guestFormData, city: e.target.value})}
              placeholder="Mumbai"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={guestFormData.state}
              onChange={(e) => setGuestFormData({...guestFormData, state: e.target.value})}
              placeholder="Maharashtra"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={guestFormData.country}
              onChange={(e) => setGuestFormData({...guestFormData, country: e.target.value})}
              placeholder="India"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetGuestForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleCreateGuest} className="btn-primary">
            <Save size={18} /> Add Guest
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Reservations;