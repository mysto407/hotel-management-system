// src/context/RoomContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getRoomTypes,
  createRoomType as createRoomTypeAPI,
  updateRoomType as updateRoomTypeAPI,
  deleteRoomType as deleteRoomTypeAPI,
  getRooms,
  createRoom as createRoomAPI,
  updateRoom as updateRoomAPI,
  deleteRoom as deleteRoomAPI,
  updateRoomStatus as updateRoomStatusAPI
} from '../lib/supabase';

const RoomContext = createContext();

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRooms must be used within RoomProvider');
  return context;
};

export const RoomProvider = ({ children }) => {
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadRoomTypes(), loadRooms()]);
    setLoading(false);
  };

  const loadRoomTypes = async () => {
    try {
      const { data, error } = await getRoomTypes();
      if (error) throw error;
      setRoomTypes(data || []);
    } catch (error) {
      console.error('Error loading room types:', error);
      alert('Failed to load room types: ' + error.message);
    }
  };

  const loadRooms = async () => {
    try {
      const { data, error } = await getRooms();
      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      alert('Failed to load rooms: ' + error.message);
    }
  };

  // Room Type Operations
  const addRoomType = async (roomType) => {
    try {
      // Ensure all field names are in snake_case
      const roomTypeData = {
        name: roomType.name,
        base_price: parseFloat(roomType.base_price),
        capacity: parseInt(roomType.capacity),
        amenities: roomType.amenities || '',
        description: roomType.description || ''
      };

      const { data, error } = await createRoomTypeAPI(roomTypeData);
      if (error) throw error;
      
      if (data && data.length > 0) {
        setRoomTypes([...roomTypes, data[0]]);
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error creating room type:', error);
      alert('Failed to create room type: ' + error.message);
      return null;
    }
  };

  const updateRoomType = async (id, updatedType) => {
    try {
      // Ensure all field names are in snake_case
      const roomTypeData = {
        name: updatedType.name,
        base_price: parseFloat(updatedType.base_price),
        capacity: parseInt(updatedType.capacity),
        amenities: updatedType.amenities || '',
        description: updatedType.description || ''
      };

      const { data, error } = await updateRoomTypeAPI(id, roomTypeData);
      if (error) throw error;
      
      if (data && data.length > 0) {
        setRoomTypes(roomTypes.map(rt => rt.id === id ? data[0] : rt));
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error updating room type:', error);
      alert('Failed to update room type: ' + error.message);
      return null;
    }
  };

  const deleteRoomType = async (id) => {
    try {
      const { error } = await deleteRoomTypeAPI(id);
      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message.includes('foreign key')) {
          alert('Cannot delete room type. It is being used by existing rooms.');
        } else {
          throw error;
        }
        return false;
      }
      
      setRoomTypes(roomTypes.filter(rt => rt.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting room type:', error);
      alert('Failed to delete room type: ' + error.message);
      return false;
    }
  };

  // Room Operations
  const addRoom = async (room) => {
    try {
      // Ensure all field names are in snake_case and types are correct
      const roomData = {
        room_number: room.room_number,
        floor: room.floor ? parseInt(room.floor) : null,
        room_type_id: room.room_type_id,
        category: room.category || 'main building',
        status: room.status || 'Available'
      };

      const { data, error } = await createRoomAPI(roomData);
      if (error) throw error;
      
      // Reload rooms to get with relations
      await loadRooms();
      
      if (data && data.length > 0) {
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error creating room:', error);
      
      // Check for duplicate room number
      if (error.code === '23505' || error.message.includes('duplicate')) {
        alert('Room number already exists. Please use a different number.');
      } else {
        alert('Failed to create room: ' + error.message);
      }
      return null;
    }
  };

  const updateRoom = async (id, updatedRoom) => {
    try {
      // Ensure all field names are in snake_case and types are correct
      const roomData = {
        room_number: updatedRoom.room_number,
        floor: updatedRoom.floor ? parseInt(updatedRoom.floor) : null,
        room_type_id: updatedRoom.room_type_id,
        category: updatedRoom.category || 'main building',
        status: updatedRoom.status
      };

      const { error } = await updateRoomAPI(id, roomData);
      if (error) throw error;
      
      // Reload rooms to get updated data with relations
      await loadRooms();
      return true;
    } catch (error) {
      console.error('Error updating room:', error);
      
      // Check for duplicate room number
      if (error.code === '23505' || error.message.includes('duplicate')) {
        alert('Room number already exists. Please use a different number.');
      } else {
        alert('Failed to update room: ' + error.message);
      }
      return false;
    }
  };

  const deleteRoom = async (id) => {
    try {
      const { error } = await deleteRoomAPI(id);
      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message.includes('foreign key')) {
          alert('Cannot delete room. It has existing reservations.');
        } else {
          throw error;
        }
        return false;
      }
      
      setRooms(rooms.filter(r => r.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      alert('Failed to delete room: ' + error.message);
      return false;
    }
  };

  const updateRoomStatus = async (id, status) => {
    try {
      const { error } = await updateRoomStatusAPI(id, status);
      if (error) throw error;
      
      // Update local state immediately for better UX
      setRooms(rooms.map(r => r.id === id ? { ...r, status } : r));
      return true;
    } catch (error) {
      console.error('Error updating room status:', error);
      alert('Failed to update room status: ' + error.message);
      return false;
    }
  };

  // Helper functions
  const getRoomById = (roomId) => {
    return rooms.find(r => r.id === roomId);
  };

  const getRoomTypeById = (roomTypeId) => {
    return roomTypes.find(rt => rt.id === roomTypeId);
  };

  const getRoomsByType = (roomTypeId) => {
    return rooms.filter(r => r.room_type_id === roomTypeId);
  };

  const getRoomsByStatus = (status) => {
    return rooms.filter(r => r.status === status);
  };

  const getRoomsByFloor = (floor) => {
    return rooms.filter(r => r.floor === floor);
  };

  const getRoomsByCategory = (category) => {
    return rooms.filter(r => r.category === category);
  };

  const getAvailableRooms = () => {
    return rooms.filter(r => r.status === 'Available');
  };

  const getRoomStats = () => {
    return {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'Available').length,
      occupied: rooms.filter(r => r.status === 'Occupied').length,
      maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      blocked: rooms.filter(r => r.status === 'Blocked').length
    };
  };

  return (
    <RoomContext.Provider value={{
      roomTypes,
      rooms,
      loading,
      addRoomType,
      updateRoomType,
      deleteRoomType,
      addRoom,
      updateRoom,
      deleteRoom,
      updateRoomStatus,
      fetchRooms: loadRooms,
      getRoomById,
      getRoomTypeById,
      getRoomsByType,
      getRoomsByStatus,
      getRoomsByFloor,
      getRoomsByCategory,
      getAvailableRooms,
      getRoomStats
    }}>
      {children}
    </RoomContext.Provider>
  );
};