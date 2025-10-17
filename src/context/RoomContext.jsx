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
    loadRoomTypes();
    loadRooms();
  }, []);

  const loadRoomTypes = async () => {
    const { data, error } = await getRoomTypes();
    if (error) {
      console.error('Error loading room types:', error);
    } else {
      setRoomTypes(data || []);
    }
  };

  const loadRooms = async () => {
    const { data, error } = await getRooms();
    if (error) {
      console.error('Error loading rooms:', error);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const addRoomType = async (roomType) => {
    const { data, error } = await createRoomTypeAPI(roomType);
    if (error) {
      console.error('Error creating room type:', error);
      return null;
    }
    setRoomTypes([...roomTypes, data[0]]);
    return data[0];
  };

  const updateRoomType = async (id, updatedType) => {
    const { data, error } = await updateRoomTypeAPI(id, updatedType);
    if (error) {
      console.error('Error updating room type:', error);
      return;
    }
    setRoomTypes(roomTypes.map(rt => rt.id === id ? data[0] : rt));
  };

  const deleteRoomType = async (id) => {
    const { error } = await deleteRoomTypeAPI(id);
    if (error) {
      console.error('Error deleting room type:', error);
      alert('Cannot delete room type. It may be in use by rooms.');
      return;
    }
    setRoomTypes(roomTypes.filter(rt => rt.id !== id));
  };

  const addRoom = async (room) => {
    const { data, error } = await createRoomAPI(room);
    if (error) {
      console.error('Error creating room:', error);
      return null;
    }
    await loadRooms(); // Reload to get with relations
    return data[0];
  };

  const updateRoom = async (id, updatedRoom) => {
    const { error } = await updateRoomAPI(id, updatedRoom);
    if (error) {
      console.error('Error updating room:', error);
      return;
    }
    await loadRooms(); // Reload to get with relations
  };

  const deleteRoom = async (id) => {
    const { error } = await deleteRoomAPI(id);
    if (error) {
      console.error('Error deleting room:', error);
      alert('Cannot delete room. It may have reservations.');
      return;
    }
    setRooms(rooms.filter(r => r.id !== id));
  };

  const updateRoomStatus = async (id, status) => {
    const { error } = await updateRoomStatusAPI(id, status);
    if (error) {
      console.error('Error updating room status:', error);
      return;
    }
    setRooms(rooms.map(r => r.id === id ? { ...r, status } : r));
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
      updateRoomStatus
    }}>
      {children}
    </RoomContext.Provider>
  );
};