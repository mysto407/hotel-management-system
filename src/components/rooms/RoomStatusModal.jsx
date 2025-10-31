// src/components/rooms/RoomStatusModal.jsx
import { Modal } from '../common/Modal';
import { Home, RefreshCw, Lock, X } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import { updateRoomStatus } from '../../lib/supabase'; // Assuming this path
import styles from './RoomStatusModal.module.css'; // You'll need to create this CSS file or adapt styles




export const RoomStatusModal = ({ isOpen, onClose, room }) => {
  const { fetchRooms } = useRooms();

  const handleSubmitRoomStatus = async (newStatus) => {
    if (!room) return;

    try {
      await updateRoomStatus(room.id, newStatus);
      await fetchRooms();
      alert(`Room ${room.room_number} status changed to ${newStatus}`);
      onClose();
    } catch (error) {
      console.error('Error updating room status:', error);
      alert('Failed to update room status: ' + error.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Change Room Status"
      size="small"
    >
      {room && (
        <div>
          <div className={styles.modalInfoBox} style={{ marginBottom: '24px' }}>
            <div className={styles.modalInfoBoxTitle}>
              Room {room.room_number}
            </div>
            <div className={styles.modalInfoBoxText}>
              Floor {room.floor}
            </div>
            <div className={styles.modalInfoBoxText} style={{ marginTop: '8px' }}>
              Current Status: <strong>{room.status}</strong>
            </div>
          </div>

          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#374151',
            marginBottom: '12px'
          }}>
            Select New Status:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={() => handleSubmitRoomStatus('Available')}
              className="btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: room.status === 'Available' ? '#f0fdf4' : 'white',
                border: room.status === 'Available' ? '2px solid #10b981' : '1px solid #d1d5db'
              }}
            >
              <Home size={18} />
              <span>Available</span>
            </button>

            <button
              onClick={() => handleSubmitRoomStatus('Maintenance')}
              className="btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: room.status === 'Maintenance' ? '#fef3c7' : 'white',
                border: room.status === 'Maintenance' ? '2px solid #f59e0b' : '1px solid #d1d5db'
              }}
            >
              <RefreshCw size={18} />
              <span>Maintenance</span>
            </button>

            <button
              onClick={() => handleSubmitRoomStatus('Blocked')}
              className="btn-secondary"
              style={{
                justifyContent: 'flex-start',
                padding: '12px 16px',
                background: room.status === 'Blocked' ? '#fee2e2' : 'white',
                border: room.status === 'Blocked' ? '2px solid #ef4444' : '1px solid #d1d5db'
              }}
            >
              <Lock size={18} />
              <span>Blocked</span>
            </button>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ width: '100%' }}
            >
              <X size={18} /> Cancel
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};