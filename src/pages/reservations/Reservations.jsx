// ==========================================
// FILE: src/pages/reservations/Reservations.jsx
// ==========================================
import { useState } from 'react';
import { Plus, Edit2, XOctagon, Save, XCircle, CheckCircle, LogOut, Search, Filter } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { calculateDays } from '../../utils/helpers';

const Reservations = () => {
  const { reservations, addReservation, updateReservation, checkIn, checkOut, cancelReservation } = useReservations();
  const { rooms, roomTypes, updateRoomStatus } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestIdProof: '',
    roomId: '',
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    totalAmount: 0,
    advancePayment: 0,
    paymentStatus: 'Pending',
    status: 'Upcoming',
    specialRequests: ''
  });

  const handleSubmit = () => {
    if (editingReservation) {
      updateReservation(editingReservation.id, formData);
    } else {
      addReservation(formData);
      const room = rooms.find(r => r.id === parseInt(formData.roomId));
      if (room && formData.status === 'Checked-in') {
        updateRoomStatus(room.id, 'Occupied');
      }
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      guestIdProof: '',
      roomId: '',
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      totalAmount: 0,
      advancePayment: 0,
      paymentStatus: 'Pending',
      status: 'Upcoming',
      specialRequests: ''
    });
    setEditingReservation(null);
    setIsModalOpen(false);
  };

  const handleEdit = (reservation) => {
    setEditingReservation(reservation);
    setFormData(reservation);
    setIsModalOpen(true);
  };

  const handleCheckIn = (reservation) => {
    checkIn(reservation.id);
    updateRoomStatus(reservation.roomId, 'Occupied');
  };

  const handleCheckOut = (reservation) => {
    checkOut(reservation.id);
    updateRoomStatus(reservation.roomId, 'Available');
  };

  const handleCancel = (reservation) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      cancelReservation(reservation.id);
      if (reservation.status === 'Checked-in') {
        updateRoomStatus(reservation.roomId, 'Available');
      }
    }
  };

  const calculateTotal = () => {
    if (formData.roomId && formData.checkInDate && formData.checkOutDate) {
      const room = rooms.find(r => r.id === parseInt(formData.roomId));
      if (room) {
        const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
        if (roomType) {
          const days = calculateDays(formData.checkInDate, formData.checkOutDate);
          const total = roomType.basePrice * days;
          setFormData({...formData, totalAmount: total});
        }
      }
    }
  };

  const getRoomInfo = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    if (!room) return 'Unknown';
    const roomType = roomTypes.find(rt => rt.id === room.roomTypeId);
    return `${room.roomNumber} - ${roomType?.name || 'Unknown'}`;
  };

  const availableRooms = rooms.filter(r => r.status === 'Available');

  const filteredReservations = reservations
    .filter(r => filterStatus === 'all' || r.status === filterStatus)
    .filter(r =>
      r.guestName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.guestPhone.includes(searchTerm)
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
                  <strong>{reservation.guestName}</strong>
                  <br />
                  <small style={{color: '#6b7280'}}>{reservation.guestPhone}</small>
                </td>
                <td>{getRoomInfo(reservation.roomId)}</td>
                <td>{reservation.checkInDate}</td>
                <td>{reservation.checkOutDate}</td>
                <td>{reservation.numberOfGuests}</td>
                <td>₹{reservation.totalAmount}</td>
                <td>
                  <span className={`status-badge ${
                    reservation.paymentStatus === 'Paid' ? 'status-available' :
                    reservation.paymentStatus === 'Partial' ? 'status-maintenance' :
                    'status-blocked'
                  }`}>
                    {reservation.paymentStatus}
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
            <label>Guest Name *</label>
            <input
              type="text"
              value={formData.guestName}
              onChange={(e) => setFormData({...formData, guestName: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              value={formData.guestPhone}
              onChange={(e) => setFormData({...formData, guestPhone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.guestEmail}
              onChange={(e) => setFormData({...formData, guestEmail: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>ID Proof</label>
            <input
              type="text"
              value={formData.guestIdProof}
              onChange={(e) => setFormData({...formData, guestIdProof: e.target.value})}
              placeholder="AADHAR/PAN"
            />
          </div>
          <div className="form-group">
            <label>Room *</label>
            <select
              value={formData.roomId}
              onChange={(e) => setFormData({...formData, roomId: e.target.value})}
              onBlur={calculateTotal}
            >
              <option value="">Select Room</option>
              {availableRooms.map(room => (
                <option key={room.id} value={room.id}>{getRoomInfo(room.id)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Number of Guests</label>
            <input
              type="number"
              min="1"
              value={formData.numberOfGuests}
              onChange={(e) => setFormData({...formData, numberOfGuests: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>Check-in Date *</label>
            <input
              type="date"
              value={formData.checkInDate}
              onChange={(e) => setFormData({...formData, checkInDate: e.target.value})}
              onBlur={calculateTotal}
            />
          </div>
          <div className="form-group">
            <label>Check-out Date *</label>
            <input
              type="date"
              value={formData.checkOutDate}
              onChange={(e) => setFormData({...formData, checkOutDate: e.target.value})}
              onBlur={calculateTotal}
            />
          </div>
          <div className="form-group">
            <label>Total Amount</label>
            <input
              type="number"
              value={formData.totalAmount}
              onChange={(e) => setFormData({...formData, totalAmount: e.target.value})}
              placeholder="Auto-calculated"
            />
          </div>
          <div className="form-group">
            <label>Advance Payment</label>
            <input
              type="number"
              value={formData.advancePayment}
              onChange={(e) => setFormData({...formData, advancePayment: e.target.value})}
              placeholder="0"
            />
          </div>
          <div className="form-group">
            <label>Payment Status</label>
            <select
              value={formData.paymentStatus}
              onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
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
              value={formData.specialRequests}
              onChange={(e) => setFormData({...formData, specialRequests: e.target.value})}
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