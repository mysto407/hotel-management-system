// ==========================================
// FILE: src/pages/guests/Guests.jsx
// ==========================================
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, Eye, Star, Award, Briefcase, TrendingUp, Users } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { useGuests } from '../../context/GuestContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const Guests = () => {
  const { 
    guests, 
    idProofTypes, 
    guestTypes,
    addGuest, 
    updateGuest, 
    deleteGuest,
    getGuestsByType,
    getReturningGuests,
    getTopGuests
  } = useGuests();

  const { reservations } = useReservations();
  const { rooms } = useRooms();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    idProofType: 'AADHAR',
    idProofNumber: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    dateOfBirth: '',
    guestType: 'Regular',
    preferences: '',
    notes: ''
  });

  // Filter guests
  const filteredGuests = guests
    .filter(guest => filterType === 'all' || guest.guestType === filterType)
    .filter(guest =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone.includes(searchTerm)
    );

  const returningGuests = getReturningGuests();
  const topGuests = getTopGuests(5);

  const handleSubmit = () => {
    if (editingGuest) {
      updateGuest(editingGuest.id, formData);
    } else {
      addGuest(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      idProofType: 'AADHAR',
      idProofNumber: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      dateOfBirth: '',
      guestType: 'Regular',
      preferences: '',
      notes: ''
    });
    setEditingGuest(null);
    setIsModalOpen(false);
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormData(guest);
    setIsModalOpen(true);
  };

  const handleDelete = (guestId) => {
    if (window.confirm('Are you sure you want to delete this guest? This action cannot be undone.')) {
      deleteGuest(guestId);
    }
  };

  const viewDetails = (guest) => {
    setSelectedGuest(guest);
    setIsDetailsModalOpen(true);
  };

  const getGuestBookings = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    return reservations.filter(r => 
      r.guestPhone === guest?.phone || r.guestEmail === guest?.email
    );
  };

  const getGuestTypeIcon = (type) => {
    switch(type) {
      case 'VIP': return <Star size={16} color="#f59e0b" />;
      case 'Corporate': return <Briefcase size={16} color="#3b82f6" />;
      default: return null;
    }
  };

  const getGuestTypeBadgeClass = (type) => {
    switch(type) {
      case 'VIP': return 'guest-type-vip';
      case 'Corporate': return 'guest-type-corporate';
      default: return 'guest-type-regular';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Guest Management</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> Add Guest
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Guests</p>
              <p className="stat-value">{guests.length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
              <Users size={24} color="white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">VIP Guests</p>
              <p className="stat-value">{getGuestsByType('VIP').length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
              <Star size={24} color="white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Corporate Guests</p>
              <p className="stat-value">{getGuestsByType('Corporate').length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
              <Briefcase size={24} color="white" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Returning Guests</p>
              <p className="stat-value">{returningGuests.length}</p>
              <small style={{ color: '#6b7280' }}>
                {((returningGuests.length / guests.length) * 100).toFixed(0)}% retention
              </small>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
              <TrendingUp size={24} color="white" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Guests</option>
            <option value="Regular">Regular</option>
            <option value="VIP">VIP</option>
            <option value="Corporate">Corporate</option>
          </select>
        </div>
      </div>

      {/* Guests Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Guest Name</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Total Bookings</th>
              <th>Total Spent</th>
              <th>Loyalty Points</th>
              <th>Last Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuests.map(guest => (
              <tr key={guest.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{guest.name}</strong>
                    {guest.guestType !== 'Regular' && getGuestTypeIcon(guest.guestType)}
                  </div>
                  <small style={{ color: '#6b7280' }}>{guest.city}, {guest.state}</small>
                </td>
                <td>
                  {guest.phone}
                  <br />
                  <small style={{ color: '#6b7280' }}>{guest.email}</small>
                </td>
                <td>
                  <span className={`guest-type-badge ${getGuestTypeBadgeClass(guest.guestType)}`}>
                    {guest.guestType}
                  </span>
                </td>
                <td><strong>{guest.totalBookings}</strong></td>
                <td>₹{guest.totalSpent.toLocaleString()}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={16} color="#f59e0b" />
                    <strong>{guest.loyaltyPoints}</strong>
                  </div>
                </td>
                <td>{guest.lastVisit || 'Never'}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      onClick={() => viewDetails(guest)}
                      className="btn-icon"
                      title="View Details"
                      style={{ color: '#3b82f6' }}
                    >
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEdit(guest)} className="btn-icon btn-edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(guest.id)} className="btn-icon btn-delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Top Guests */}
      <Card title="Top 5 Guests by Spending">
        <div className="top-guests-list">
          {topGuests.map((guest, index) => (
            <div key={guest.id} className="top-guest-item">
              <div className="top-guest-rank">#{index + 1}</div>
              <div className="top-guest-info">
                <strong>{guest.name}</strong>
                <p>{guest.totalBookings} bookings</p>
              </div>
              <div className="top-guest-amount">
                ₹{guest.totalSpent.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Add/Edit Guest Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingGuest ? 'Edit Guest' : 'Add New Guest'}
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="john@example.com"
            />
          </div>
          <div className="form-group">
            <label>Date of Birth</label>
            <input
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label>ID Proof Type *</label>
            <select
              value={formData.idProofType}
              onChange={(e) => setFormData({...formData, idProofType: e.target.value})}
            >
              {idProofTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>ID Proof Number *</label>
            <input
              type="text"
              value={formData.idProofNumber}
              onChange={(e) => setFormData({...formData, idProofNumber: e.target.value})}
              placeholder="AADHAR-1234"
            />
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-group">
            <label>City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              placeholder="Mumbai"
            />
          </div>
          <div className="form-group">
            <label>State</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({...formData, state: e.target.value})}
              placeholder="Maharashtra"
            />
          </div>
          <div className="form-group">
            <label>Country</label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              placeholder="India"
            />
          </div>
          <div className="form-group">
            <label>Guest Type</label>
            <select
              value={formData.guestType}
              onChange={(e) => setFormData({...formData, guestType: e.target.value})}
            >
              {guestTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="form-group full-width">
            <label>Preferences</label>
            <textarea
              value={formData.preferences}
              onChange={(e) => setFormData({...formData, preferences: e.target.value})}
              rows="2"
              placeholder="e.g., Non-smoking rooms, Early check-in"
            />
          </div>
          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows="2"
              placeholder="Additional notes about the guest"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={18} /> Save Guest
          </button>
        </div>
      </Modal>

      {/* Guest Details Modal */}
      <Modal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        title="Guest Details"
        size="large"
      >
        {selectedGuest && (
          <div className="guest-details">
            <div className="guest-details-header">
              <div>
                <h2>{selectedGuest.name}</h2>
                <span className={`guest-type-badge ${getGuestTypeBadgeClass(selectedGuest.guestType)}`}>
                  {selectedGuest.guestType}
                </span>
              </div>
              <div className="guest-stats-mini">
                <div>
                  <strong>{selectedGuest.totalBookings}</strong>
                  <p>Bookings</p>
                </div>
                <div>
                  <strong>₹{selectedGuest.totalSpent.toLocaleString()}</strong>
                  <p>Total Spent</p>
                </div>
                <div>
                  <strong>{selectedGuest.loyaltyPoints}</strong>
                  <p>Points</p>
                </div>
              </div>
            </div>

            <div className="guest-info-grid">
              <div className="info-section">
                <h4>Contact Information</h4>
                <p><strong>Phone:</strong> {selectedGuest.phone}</p>
                <p><strong>Email:</strong> {selectedGuest.email}</p>
                <p><strong>Date of Birth:</strong> {selectedGuest.dateOfBirth || 'Not provided'}</p>
              </div>

              <div className="info-section">
                <h4>ID Proof</h4>
                <p><strong>Type:</strong> {selectedGuest.idProofType}</p>
                <p><strong>Number:</strong> {selectedGuest.idProofNumber}</p>
              </div>

              <div className="info-section">
                <h4>Address</h4>
                <p>{selectedGuest.address}</p>
                <p>{selectedGuest.city}, {selectedGuest.state}</p>
                <p>{selectedGuest.country}</p>
              </div>

              <div className="info-section">
                <h4>Guest Stats</h4>
                <p><strong>Member Since:</strong> {selectedGuest.createdAt}</p>
                <p><strong>Last Visit:</strong> {selectedGuest.lastVisit || 'Never'}</p>
              </div>
            </div>

            {selectedGuest.preferences && (
              <div className="info-section full-width">
                <h4>Preferences</h4>
                <p>{selectedGuest.preferences}</p>
              </div>
            )}

            {selectedGuest.notes && (
              <div className="info-section full-width">
                <h4>Notes</h4>
                <p>{selectedGuest.notes}</p>
              </div>
            )}

            <h4 style={{ marginTop: '24px', marginBottom: '12px' }}>Booking History</h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getGuestBookings(selectedGuest.id).map(booking => {
                    const room = rooms.find(r => r.id === booking.roomId);
                    return (
                      <tr key={booking.id}>
                        <td>{room?.roomNumber || 'N/A'}</td>
                        <td>{booking.checkInDate}</td>
                        <td>{booking.checkOutDate}</td>
                        <td>₹{booking.totalAmount}</td>
                        <td>
                          <span className={`status-badge status-${booking.status.toLowerCase()}`}>
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {getGuestBookings(selectedGuest.id).length === 0 && (
                <p style={{ textAlign: 'center', padding: '20px', color: '#6b7280' }}>
                  No booking history available
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Guests;