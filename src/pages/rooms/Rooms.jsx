// src/pages/rooms/Rooms.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useRooms } from '../../context/RoomContext';

const Rooms = () => {
  const { rooms, roomTypes, addRoom, updateRoom, deleteRoom } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    floor: '',
    room_type_id: '',
    status: 'Available'
  });

  const handleSubmit = async () => {
    const roomData = {
      room_number: formData.room_number,
      floor: parseInt(formData.floor),
      room_type_id: formData.room_type_id,
      status: formData.status
    };

    if (editingRoom) {
      await updateRoom(editingRoom.id, roomData);
    } else {
      await addRoom(roomData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      room_number: '',
      floor: '',
      room_type_id: '',
      status: 'Available'
    });
    setEditingRoom(null);
    setIsModalOpen(false);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      floor: room.floor,
      room_type_id: room.room_type_id,
      status: room.status
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this room?')) {
      await deleteRoom(id);
    }
  };

  const getRoomTypeName = (typeId) => {
    const type = roomTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Rooms</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> Add Room
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Room Number</th>
              <th>Floor</th>
              <th>Room Type</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map(room => (
              <tr key={room.id}>
                <td><strong>{room.room_number}</strong></td>
                <td>Floor {room.floor}</td>
                <td>{getRoomTypeName(room.room_type_id)}</td>
                <td>
                  <span className={`status-badge status-${room.status.toLowerCase()}`}>
                    {room.status}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(room)} className="btn-icon btn-edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(room.id)} className="btn-icon btn-delete">
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
        title={editingRoom ? 'Edit Room' : 'Add Room'}
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Room Number</label>
            <input
              type="text"
              value={formData.room_number}
              onChange={(e) => setFormData({...formData, room_number: e.target.value})}
              placeholder="101"
            />
          </div>
          <div className="form-group">
            <label>Floor</label>
            <input
              type="number"
              value={formData.floor}
              onChange={(e) => setFormData({...formData, floor: e.target.value})}
              placeholder="1"
            />
          </div>
          <div className="form-group">
            <label>Room Type</label>
            <select
              value={formData.room_type_id}
              onChange={(e) => setFormData({...formData, room_type_id: e.target.value})}
            >
              <option value="">Select Room Type</option>
              {roomTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
            >
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Blocked">Blocked</option>
            </select>
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

export default Rooms;