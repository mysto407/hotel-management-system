// src/components/guests/AddGuestModal.jsx
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useGuests } from '../../context/GuestContext';

export const AddGuestModal = ({ isOpen, onClose, onGuestAdded }) => {
  const { addGuest } = useGuests();
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

  const resetForm = () => {
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
    onClose();
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    try {
      const newGuest = await addGuest(guestFormData);
      if (newGuest) {
        if (onGuestAdded) {
          onGuestAdded(newGuest);
        }
        resetForm();
      }
    } catch (error) {
      console.error('Error adding guest:', error);
      alert('Failed to add guest: ' + error.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetForm}
      title="Add New Guest"
      size="large"
    >
      <div className="form-grid">
        <div className="form-group">
          <label>Full Name *</label>
          <input
            type="text"
            value={guestFormData.name}
            onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
            placeholder="John Doe"
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={guestFormData.phone}
            onChange={(e) => setGuestFormData({ ...guestFormData, phone: e.target.value })}
            placeholder="9876543210"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={guestFormData.email}
            onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
            placeholder="john@example.com"
          />
        </div>
        <div className="form-group">
          <label>ID Proof Type</label>
          <select
            value={guestFormData.id_proof_type}
            onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_type: e.target.value })}
          >
            <option value="AADHAR">AADHAR</option>
            <option value="PAN">PAN</option>
            <option value="Passport">Passport</option>
            <option value="Driving License">Driving License</option>
            <option value="Voter ID">Voter ID</option>
            <option value="N/A">N/A</option>
          </select>
        </div>
        <div className="form-group">
          <label>ID Proof Number</label>
          <input
            type="text"
            value={guestFormData.id_proof_number}
            onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_number: e.target.value })}
            placeholder="AADHAR-1234"
          />
        </div>
        <div className="form-group">
          <label>Guest Type</label>
          <select
            value={guestFormData.guest_type}
            onChange={(e) => setGuestFormData({ ...guestFormData, guest_type: e.target.value })}
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
            onChange={(e) => setGuestFormData({ ...guestFormData, address: e.target.value })}
            placeholder="123 Main Street"
          />
        </div>
        <div className="form-group">
          <label>City</label>
          <input
            type="text"
            value={guestFormData.city}
            onChange={(e) => setGuestFormData({ ...guestFormData, city: e.target.value })}
            placeholder="Mumbai"
          />
        </div>
        <div className="form-group">
          <label>State</label>
          <input
            type="text"
            value={guestFormData.state}
            onChange={(e) => setGuestFormData({ ...guestFormData, state: e.target.value })}
            placeholder="Maharashtra"
          />
        </div>
        <div className="form-group">
          <label>Country</label>
          <input
            type="text"
            value={guestFormData.country}
            onChange={(e) => setGuestFormData({ ...guestFormData, country: e.target.value })}
            placeholder="India"
          />
        </div>
      </div>
      <div className="modal-actions">
        <button onClick={resetForm} className="btn-secondary">
          <X size={18} /> Cancel
        </button>
        <button onClick={handleCreateGuest} className="btn-primary">
          <Save size={18} /> Add Guest
        </button>
      </div>
    </Modal>
  );
};