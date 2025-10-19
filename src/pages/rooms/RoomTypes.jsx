// src/pages/rooms/RoomTypes.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useRooms } from '../../context/RoomContext';

const RoomTypes = () => {
  const { roomTypes, addRoomType, updateRoomType, deleteRoomType } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
    capacity: '',
    amenities: '',
    description: ''
  });

  const handleSubmit = async () => {
    const roomTypeData = {
      name: formData.name,
      base_price: parseFloat(formData.base_price),
      capacity: parseInt(formData.capacity),
      amenities: formData.amenities,
      description: formData.description
    };

    if (editingType) {
      await updateRoomType(editingType.id, roomTypeData);
    } else {
      await addRoomType(roomTypeData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      base_price: '',
      capacity: '',
      amenities: '',
      description: ''
    });
    setEditingType(null);
    setIsModalOpen(false);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      base_price: type.base_price,
      capacity: type.capacity,
      amenities: type.amenities || '',
      description: type.description || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Room Types</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> Add Room Type
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Base Price</th>
              <th>Capacity</th>
              <th>Amenities</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roomTypes.map(type => (
              <tr key={type.id}>
                <td><strong>{type.name}</strong></td>
                <td>₹{type.base_price}</td>
                <td>{type.capacity} {type.capacity === 1 ? 'person' : 'people'}</td>
                <td>{type.amenities}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(type)} className="btn-icon btn-edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteRoomType(type.id)} className="btn-icon btn-delete">
                      <Trash2 size={16} />
                    </button>
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
        title={editingType ? 'Edit Room Type' : 'Add Room Type'}
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Room Type Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Deluxe Suite"
            />
          </div>
          <div className="form-group">
            <label>Base Price (₹) *</label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) => setFormData({...formData, base_price: e.target.value})}
              placeholder="2500"
            />
          </div>
          <div className="form-group">
            <label>Capacity *</label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({...formData, capacity: e.target.value})}
              placeholder="2"
            />
          </div>
          <div className="form-group full-width">
            <label>Amenities</label>
            <input
              type="text"
              value={formData.amenities}
              onChange={(e) => setFormData({...formData, amenities: e.target.value})}
              placeholder="AC, TV, WiFi, Mini Bar"
            />
          </div>
          <div className="form-group full-width">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder="Brief description of the room type"
              rows="3"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={18} /> Save
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default RoomTypes;