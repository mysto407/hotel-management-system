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
  updateRoomStatus as updateRoomStatusAPI,
  getRoomRateTypes,
  getActiveRoomRateTypes,
  getDefaultRateType,
  createRoomRateType as createRoomRateTypeAPI,
  updateRoomRateType as updateRoomRateTypeAPI,
  deleteRoomRateType as deleteRoomRateTypeAPI,
  setDefaultRateType as setDefaultRateTypeAPI
} from '../lib/supabase';
import { useAlert } from './AlertContext';

const RoomContext = createContext();

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRooms must be used within RoomProvider');
  return context;
};

export const RoomProvider = ({ children }) => {
  const { error: showError, success: showSuccess } = useAlert();
  const [roomTypes, setRoomTypes] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [rateTypes, setRateTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadRoomTypes(), loadRooms(), loadRateTypes()]);
    setLoading(false);
  };

  const loadRoomTypes = async () => {
    try {
      const { data, error } = await getRoomTypes();
      if (error) throw error;
      setRoomTypes(data || []);
    } catch (error) {
      console.error('Error loading room types:', error);
      showError('Failed to load room types: ' + error.message);
    }
  };

  const loadRooms = async () => {
    try {
      const { data, error } = await getRooms();
      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error('Error loading rooms:', error);
      showError('Failed to load rooms: ' + error.message);
    }
  };

  const loadRateTypes = async () => {
    try {
      const { data, error } = await getRoomRateTypes();
      if (error) throw error;
      setRateTypes(data || []);
    } catch (error) {
      console.error('Error loading rate types:', error);
      showError('Failed to load rate types: ' + error.message);
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
      showError('Failed to create room type: ' + error.message);
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
      showError('Failed to update room type: ' + error.message);
      return null;
    }
  };

  const deleteRoomType = async (id) => {
    try {
      const { error } = await deleteRoomTypeAPI(id);
      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message.includes('foreign key')) {
          showError('Cannot delete room type. It is being used by existing rooms.');
        } else {
          throw error;
        }
        return false;
      }

      setRoomTypes(roomTypes.filter(rt => rt.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting room type:', error);
      showError('Failed to delete room type: ' + error.message);
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
        showError('Room number already exists. Please use a different number.');
      } else {
        showError('Failed to create room: ' + error.message);
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
        showError('Room number already exists. Please use a different number.');
      } else {
        showError('Failed to update room: ' + error.message);
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
          showError('Cannot delete room. It has existing reservations.');
        } else {
          throw error;
        }
        return false;
      }

      setRooms(rooms.filter(r => r.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting room:', error);
      showError('Failed to delete room: ' + error.message);
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
      showError('Failed to update room status: ' + error.message);
      return false;
    }
  };

  // Room Rate Type Operations
  const addRateType = async (rateType) => {
    try {
      const rateTypeData = {
        room_type_id: rateType.room_type_id,
        rate_name: rateType.rate_name,
        rate_code: rateType.rate_code,
        base_price: parseFloat(rateType.base_price),
        is_default: rateType.is_default || false,
        description: rateType.description || '',
        inclusions: rateType.inclusions || '',
        min_nights: rateType.min_nights ? parseInt(rateType.min_nights) : 1,
        max_nights: rateType.max_nights ? parseInt(rateType.max_nights) : null,
        cancellation_policy: rateType.cancellation_policy || '',
        advance_booking_days: rateType.advance_booking_days ? parseInt(rateType.advance_booking_days) : 0,
        is_active: rateType.is_active !== undefined ? rateType.is_active : true,
        valid_from: rateType.valid_from || null,
        valid_to: rateType.valid_to || null
      };

      const { data, error } = await createRoomRateTypeAPI(rateTypeData);
      if (error) throw error;

      if (data && data.length > 0) {
        await loadRateTypes(); // Reload to get with relations
        showSuccess('Rate type created successfully');
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error creating rate type:', error);
      if (error.code === '23505' || error.message.includes('duplicate')) {
        showError('Rate code already exists for this room type. Please use a different code.');
      } else {
        showError('Failed to create rate type: ' + error.message);
      }
      return null;
    }
  };

  const updateRateType = async (id, updatedRateType) => {
    try {
      const rateTypeData = {
        rate_name: updatedRateType.rate_name,
        rate_code: updatedRateType.rate_code,
        base_price: parseFloat(updatedRateType.base_price),
        is_default: updatedRateType.is_default || false,
        description: updatedRateType.description || '',
        inclusions: updatedRateType.inclusions || '',
        min_nights: updatedRateType.min_nights ? parseInt(updatedRateType.min_nights) : 1,
        max_nights: updatedRateType.max_nights ? parseInt(updatedRateType.max_nights) : null,
        cancellation_policy: updatedRateType.cancellation_policy || '',
        advance_booking_days: updatedRateType.advance_booking_days ? parseInt(updatedRateType.advance_booking_days) : 0,
        is_active: updatedRateType.is_active !== undefined ? updatedRateType.is_active : true,
        valid_from: updatedRateType.valid_from || null,
        valid_to: updatedRateType.valid_to || null
      };

      const { error } = await updateRoomRateTypeAPI(id, rateTypeData);
      if (error) throw error;

      await loadRateTypes(); // Reload to get updated data
      showSuccess('Rate type updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating rate type:', error);
      if (error.code === '23505' || error.message.includes('duplicate')) {
        showError('Rate code already exists for this room type. Please use a different code.');
      } else {
        showError('Failed to update rate type: ' + error.message);
      }
      return false;
    }
  };

  const deleteRateType = async (id) => {
    try {
      const { error } = await deleteRoomRateTypeAPI(id);
      if (error) {
        if (error.code === '23503' || error.message.includes('foreign key')) {
          showError('Cannot delete rate type. It is being used by existing reservations.');
        } else {
          throw error;
        }
        return false;
      }

      setRateTypes(rateTypes.filter(rt => rt.id !== id));
      showSuccess('Rate type deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting rate type:', error);
      showError('Failed to delete rate type: ' + error.message);
      return false;
    }
  };

  const setDefaultRate = async (roomTypeId, rateTypeId) => {
    try {
      const { error } = await setDefaultRateTypeAPI(roomTypeId, rateTypeId);
      if (error) throw error;

      await loadRateTypes(); // Reload to get updated defaults
      showSuccess('Default rate type updated successfully');
      return true;
    } catch (error) {
      console.error('Error setting default rate type:', error);
      showError('Failed to set default rate type: ' + error.message);
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
      reserved: rooms.filter(r => r.status === 'Reserved').length,
      occupied: rooms.filter(r => r.status === 'Occupied').length,
      maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      blocked: rooms.filter(r => r.status === 'Blocked').length
    };
  };

  const getRateTypesByRoomType = (roomTypeId) => {
    return rateTypes.filter(rt => rt.room_type_id === roomTypeId);
  };

  const getActiveRateTypesByRoomType = (roomTypeId) => {
    return rateTypes.filter(rt => rt.room_type_id === roomTypeId && rt.is_active);
  };

  const getDefaultRateTypeByRoomType = (roomTypeId) => {
    return rateTypes.find(rt => rt.room_type_id === roomTypeId && rt.is_default && rt.is_active);
  };

  const getRateTypeById = (rateTypeId) => {
    return rateTypes.find(rt => rt.id === rateTypeId);
  };

  return (
    <RoomContext.Provider value={{
      roomTypes,
      rooms,
      rateTypes,
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
      getRoomStats,
      // Rate type operations
      addRateType,
      updateRateType,
      deleteRateType,
      setDefaultRate,
      fetchRateTypes: loadRateTypes,
      getRateTypesByRoomType,
      getActiveRateTypesByRoomType,
      getDefaultRateTypeByRoomType,
      getRateTypeById
    }}>
      {children}
    </RoomContext.Provider>
  );
};