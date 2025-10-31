// src/components/reservations/EditBookingModal.jsx
import { useState, useEffect } from 'react';
import { UserPlus, XCircle, Save } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { calculateDays } from '../../utils/helpers';

export const EditBookingModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingReservation,
  editingGroup,
  initialFormData,
  initialRoomDetails
}) => {
  const { rooms, roomTypes } = useRooms();
  const { guests, getGuestByPhone, addGuest } = useGuests();
  const { agents, addAgent } = useAgents();

  const [formData, setFormData] = useState({
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    guest_id: '',
    room_type_id: '',
    number_of_rooms: 1,
    check_in_date: '',
    check_out_date: '',
    meal_plan: 'NM',
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
    status: 'Confirmed',
    special_requests: ''
  });

  const [roomDetails, setRoomDetails] = useState([{
    room_type_id: '',
    room_id: '',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0
  }]);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

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

  const [agentFormData, setAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission: '',
    address: ''
  });

  // Update form data when props change
  useEffect(() => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
    if (initialRoomDetails) {
      setRoomDetails(initialRoomDetails);
    }
    
    // Set selected guest if editing
    if (initialFormData?.guest_id) {
      const guest = guests.find(g => g.id === initialFormData.guest_id);
      setSelectedGuest(guest);
    }
  }, [initialFormData, initialRoomDetails, guests]);

  const availableRooms = rooms.filter(r => r.status === 'Available');

  // Get available rooms by room type
  const getAvailableRoomsByType = (roomTypeId) => {
    if (!roomTypeId) return [];
    return rooms.filter(r => r.room_type_id === roomTypeId && r.status === 'Available');
  };

  // Handle number of rooms change
  const handleNumberOfRoomsChange = (count) => {
    const numRooms = parseInt(count) || 1;
    setFormData({ ...formData, number_of_rooms: numRooms });
    
    const newRoomDetails = [];
    for (let i = 0; i < numRooms; i++) {
      newRoomDetails.push(roomDetails[i] || {
        room_type_id: '',
        room_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0
      });
    }
    setRoomDetails(newRoomDetails);
  };

  // Update individual room details
  const updateRoomDetail = (index, field, value) => {
    const updated = [...roomDetails];
    updated[index] = { ...updated[index], [field]: value };
    setRoomDetails(updated);
  };

  // Auto-assign rooms
  const autoAssignRooms = () => {
    const updated = [...roomDetails];
    
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].room_id && updated[i].room_type_id) {
        const availableRooms = getAvailableRoomsByType(updated[i].room_type_id);
        const unassignedRooms = availableRooms.filter(room => 
          !updated.some(rd => rd.room_id === room.id)
        );
        
        if (unassignedRooms.length > 0) {
          updated[i].room_id = unassignedRooms[0].id;
        }
      }
    }
    
    setRoomDetails(updated);
  };

  // Calculate total
  const calculateTotal = () => {
    if (formData.check_in_date && formData.check_out_date && roomDetails.length > 0) {
      const days = calculateDays(formData.check_in_date, formData.check_out_date);
      let total = 0;
      
      roomDetails.forEach(roomDetail => {
        if (roomDetail.room_type_id) {
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          if (roomType) {
            total += roomType.base_price * days;
          }
        }
      });
      
      setFormData(prev => ({ ...prev, total_amount: total }));
    }
  };

  // Guest handlers
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

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }

    const newGuest = await addGuest(guestFormData);
    if (newGuest) {
      setFormData({ ...formData, guest_id: newGuest.id });
      setSelectedGuest(newGuest);
      resetGuestForm();
    }
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

  // Agent handlers
  const handleCreateAgent = async () => {
    if (!agentFormData.name) {
      alert('Please enter agent name');
      return;
    }
  
    const agentData = {
      name: agentFormData.name,
      email: agentFormData.email || null,
      phone: agentFormData.phone || null,
      commission: agentFormData.commission && agentFormData.commission !== '' 
        ? parseFloat(agentFormData.commission) 
        : null,
      address: agentFormData.address || null
    };
  
    const newAgent = await addAgent(agentData);
    if (newAgent) {
      setFormData({ ...formData, agent_id: newAgent.id });
      resetAgentForm();
    }
  };

  const resetAgentForm = () => {
    setAgentFormData({
      name: '',
      email: '',
      phone: '',
      commission: '',
      address: ''
    });
    setIsAgentModalOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.guest_id || !formData.check_in_date || !formData.check_out_date) {
      alert('Please fill all required fields');
      return;
    }

    // Validate all rooms have room types selected
    const unselectedRoomTypes = roomDetails.filter(rd => !rd.room_type_id);
    if (unselectedRoomTypes.length > 0) {
      alert(`Please select room type for all ${formData.number_of_rooms} room(s)`);
      return;
    }

    // Validate all rooms are assigned
    const unassignedRooms = roomDetails.filter(rd => !rd.room_id);
    if (unassignedRooms.length > 0) {
      alert(`Please assign room numbers for all ${formData.number_of_rooms} room(s)`);
      return;
    }

    // Check for duplicate room assignments
    const roomIds = roomDetails.map(rd => rd.room_id);
    const uniqueRoomIds = new Set(roomIds);
    if (roomIds.length !== uniqueRoomIds.size) {
      alert('Cannot assign the same room multiple times');
      return;
    }

    onSubmit(formData, roomDetails);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          editingGroup 
            ? `Edit Group Booking - ${editingGroup.length} Rooms` 
            : editingReservation 
              ? 'Edit Reservation' 
              : `New Booking${formData.number_of_rooms > 1 ? ` - ${formData.number_of_rooms} Rooms` : ''}`
        }
        size="large"
      >
        <div className="form-grid">
          {/* Booking Source */}
          <div className="form-group">
            <label>Booking Source *</label>
            <select
              value={formData.booking_source}
              onChange={(e) => {
                setFormData({...formData, booking_source: e.target.value, agent_id: '', direct_source: ''});
              }}
            >
              <option value="direct">Direct</option>
              <option value="agent">Agent</option>
            </select>
          </div>

          {/* Direct Source */}
          {formData.booking_source === 'direct' && (
            <div className="form-group">
              <label>Direct Booking Source</label>
              <input
                type="text"
                value={formData.direct_source}
                onChange={(e) => setFormData({...formData, direct_source: e.target.value})}
                placeholder="e.g., Walk-in, Phone Call, Website"
              />
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block', fontSize: '12px' }}>
                Optional: Specify where this booking came from
              </small>
            </div>
          )}

          {/* Agent Selection */}
          {formData.booking_source === 'agent' && (
            <div className="form-group">
              <label>Select Agent *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  style={{ flex: 1 }}
                  value={formData.agent_id}
                  onChange={(e) => setFormData({...formData, agent_id: e.target.value})}
                >
                  <option value="">Select Agent</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} - {agent.phone}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsAgentModalOpen(true)} 
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

          {/* Number of Rooms */}
          {!editingReservation && !editingGroup && (
            <div className="form-group">
              <label>Number of Rooms *</label>
              <select
                value={formData.number_of_rooms}
                onChange={(e) => {
                  handleNumberOfRoomsChange(e.target.value);
                  setTimeout(calculateTotal, 0);
                }}
              >
                {Array.from({ length: Math.min(availableRooms.length, 10) }, (_, i) => i + 1).map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? 'Room' : 'Rooms'}
                  </option>
                ))}
              </select>
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                {availableRooms.length} rooms currently available
              </small>
            </div>
          )}

          {/* Room Details */}
          <div className="form-group full-width">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '12px'
            }}>
              <label style={{ margin: 0 }}>Room Details *</label>
              {!editingReservation && !editingGroup && formData.number_of_rooms > 0 && (
                <button
                  type="button"
                  onClick={autoAssignRooms}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '13px' }}
                >
                  Auto-Assign Rooms
                </button>
              )}
            </div>

            {roomDetails.map((roomDetail, index) => (
              <div 
                key={index}
                style={{
                  padding: '16px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  marginBottom: '12px'
                }}
              >
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Room {index + 1}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Room Type Selection */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      color: '#6b7280',
                      marginBottom: '4px'
                    }}>
                      Room Type *
                    </label>
                    <select
                      value={roomDetail.room_type_id || ''}
                      onChange={(e) => {
                        const updated = [...roomDetails];
                        updated[index] = {
                          ...updated[index],
                          room_type_id: e.target.value,
                          room_id: ''
                        };
                        setRoomDetails(updated);
                        setTimeout(calculateTotal, 0);
                      }}
                      disabled={editingReservation || editingGroup}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Select Room Type</option>
                      {roomTypes.map(roomType => {
                        const availableCount = getAvailableRoomsByType(roomType.id).length;
                        return (
                          <option key={roomType.id} value={roomType.id}>
                            {roomType.name} - ₹{roomType.base_price}/night ({availableCount} available)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Room Number Selection */}
                  {roomDetail.room_type_id && (
                    <div>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '12px', 
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        Room Number *
                      </label>
                      <select
                        value={roomDetail.room_id || ''}
                        onChange={(e) => updateRoomDetail(index, 'room_id', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      >
                        <option value="">Select Room Number</option>
                        {getAvailableRoomsByType(roomDetail.room_type_id)
                          .filter(room => 
                            room.id === roomDetail.room_id || 
                            !roomDetails.some(rd => rd.room_id === room.id)
                          )
                          .map(room => (
                            <option key={room.id} value={room.id}>
                              Room {room.room_number} - Floor {room.floor}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Guest Counts */}
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '12px', 
                      color: '#6b7280',
                      marginBottom: '6px'
                    }}>
                      Number of Guests *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <div>
                        <input
                          type="number"
                          min="1"
                          value={roomDetail.number_of_adults || 1}
                          onChange={(e) => updateRoomDetail(index, 'number_of_adults', e.target.value)}
                          placeholder="Adults"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textAlign: 'center' }}>
                          Adults
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={roomDetail.number_of_children || 0}
                          onChange={(e) => updateRoomDetail(index, 'number_of_children', e.target.value)}
                          placeholder="Children"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textAlign: 'center' }}>
                          Children
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          value={roomDetail.number_of_infants || 0}
                          onChange={(e) => updateRoomDetail(index, 'number_of_infants', e.target.value)}
                          placeholder="Infants"
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '14px'
                          }}
                        />
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px', textAlign: 'center' }}>
                          Infants
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: '12px',
                    color: '#6b7280',
                    paddingTop: '4px'
                  }}>
                    Total: {parseInt(roomDetail.number_of_adults || 0) + 
                             parseInt(roomDetail.number_of_children || 0) + 
                             parseInt(roomDetail.number_of_infants || 0)} guests
                    {roomDetail.room_type_id && formData.check_in_date && formData.check_out_date && (
                      <span style={{ marginLeft: '12px', fontWeight: '600', color: '#374151' }}>
                        • ₹{(() => {
                          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
                          const days = calculateDays(formData.check_in_date, formData.check_out_date);
                          return roomType ? (roomType.base_price * days).toLocaleString() : 0;
                        })()} 
                        {formData.check_in_date && formData.check_out_date && 
                          ` (${calculateDays(formData.check_in_date, formData.check_out_date)} nights)`
                        }
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Total Summary */}
            {roomDetails.length > 0 && (
              <div style={{
                padding: '12px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '13px',
                color: '#1e40af'
              }}>
                <div>
                  <strong>Total Rooms:</strong> {roomDetails.length}
                </div>
                <div>
                  <strong>Total Guests:</strong> {roomDetails.reduce((sum, rd) => 
                    sum + parseInt(rd.number_of_adults || 0) + 
                    parseInt(rd.number_of_children || 0) + 
                    parseInt(rd.number_of_infants || 0), 0
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Meal Plan *</label>
            <select
              value={formData.meal_plan}
              onChange={(e) => setFormData({...formData, meal_plan: e.target.value})}
            >
              <option value="NM">NM - No Meal</option>
              <option value="BO">BO - Breakfast Only</option>
              <option value="HB">HB - Half Board</option>
              <option value="FB">FB - Full Board</option>
            </select>
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
            {(!editingReservation || editingGroup) && formData.number_of_rooms > 1 && formData.total_amount > 0 && (
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                Calculated from individual room rates
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Advance Payment</label>
            <input
              type="number"
              value={formData.advance_payment}
              onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
            />
            {(!editingReservation || editingGroup) && formData.number_of_rooms > 1 && formData.advance_payment > 0 && (
              <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                ₹{(formData.advance_payment / formData.number_of_rooms).toFixed(2)} per room
              </small>
            )}
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
              <option value="Inquiry">Inquiry</option>
              <option value="Tentative">Tentative</option>
              <option value="Hold">Hold</option>
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
          <button onClick={onClose} className="btn-secondary">
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
            <label>Phone</label>
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
            <label>ID Proof Type</label>
            <select
              value={guestFormData.id_proof_type}
              onChange={(e) => setGuestFormData({...guestFormData, id_proof_type: e.target.value})}
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

      {/* Add Agent Modal */}
      <Modal
        isOpen={isAgentModalOpen}
        onClose={resetAgentForm}
        title="Add New Agent"
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Agent/Agency Name *</label>
            <input
              type="text"
              value={agentFormData.name}
              onChange={(e) => setAgentFormData({...agentFormData, name: e.target.value})}
              placeholder="Travel Agency Name"
            />
          </div>
          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              value={agentFormData.phone}
              onChange={(e) => setAgentFormData({...agentFormData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={agentFormData.email}
              onChange={(e) => setAgentFormData({...agentFormData, email: e.target.value})}
              placeholder="agent@example.com"
            />
          </div>
          <div className="form-group">
            <label>Commission (%)</label>
            <input
              type="number"
              value={agentFormData.commission}
              onChange={(e) => setAgentFormData({...agentFormData, commission: e.target.value})}
              placeholder="10"
            />
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <input
              type="text"
              value={agentFormData.address}
              onChange={(e) => setAgentFormData({...agentFormData, address: e.target.value})}
              placeholder="123 Main Street"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetAgentForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleCreateAgent} className="btn-primary">
            <Save size={18} /> Add Agent
          </button>
        </div>
      </Modal>
    </>
  );
};