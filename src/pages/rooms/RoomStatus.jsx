// ==========================================
// FILE: src/pages/rooms/RoomStatus.jsx
// ==========================================
import { useState } from 'react';
import { Card } from '../../components/common/Card';
import { useRooms } from '../../context/RoomContext';

const RoomStatus = () => {
  const { rooms, roomTypes, updateRoomStatus } = useRooms();
  const [selectedFloor, setSelectedFloor] = useState('all');

  const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
  const filteredRooms = selectedFloor === 'all' 
    ? rooms 
    : rooms.filter(r => r.floor === parseInt(selectedFloor));

  const getRoomTypeName = (typeId) => {
    const type = roomTypes.find(t => t.id === typeId);
    return type ? type.name : 'Unknown';
  };

  const statusColors = {
    Available: '#10b981',
    Occupied: '#ef4444',
    Maintenance: '#f59e0b',
    Blocked: '#6b7280'
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Room Status</h1>
        <div className="filter-group">
          <label>Floor:</label>
          <select
            value={selectedFloor}
            onChange={(e) => setSelectedFloor(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Floors</option>
            {floors.map(floor => (
              <option key={floor} value={floor}>Floor {floor}</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <div className="status-legend">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="legend-item">
              <div className="legend-color" style={{backgroundColor: color}}></div>
              <span>{status}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="room-grid">
        {filteredRooms.map(room => (
          <Card
            key={room.id}
            className="room-card"
            style={{borderLeft: `4px solid ${statusColors[room.status]}`}}
          >
            <div className="room-card-header">
              <h4>Room {room.roomNumber}</h4>
              <span className={`status-badge status-${room.status.toLowerCase()}`}>
                {room.status}
              </span>
            </div>
            <p className="room-type">{getRoomTypeName(room.roomTypeId)}</p>
            <p className="room-floor">Floor {room.floor}</p>
            <div className="room-actions">
              <select
                value={room.status}
                onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                className="status-select"
              >
                <option value="Available">Available</option>
                <option value="Occupied">Occupied</option>
                <option value="Maintenance">Maintenance</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoomStatus;