import { createContext, useContext, useState } from 'react';

const RoomContext = createContext();

export const useRooms = () => {
  const context = useContext(RoomContext);
  if (!context) throw new Error('useRooms must be used within RoomProvider');
  return context;
};

export const RoomProvider = ({ children }) => {
  const [roomTypes, setRoomTypes] = useState([
    { id: 1, name: 'Single Room', basePrice: 2500, capacity: 1, amenities: 'AC, TV, WiFi', description: 'Comfortable single occupancy room' },
    { id: 2, name: 'Double Room', basePrice: 4000, capacity: 2, amenities: 'AC, TV, WiFi, Mini Bar', description: 'Spacious room with double bed' },
    { id: 3, name: 'Deluxe Suite', basePrice: 8000, capacity: 3, amenities: 'AC, TV, WiFi, Mini Bar, Balcony, Jacuzzi', description: 'Luxurious suite with premium amenities' }
  ]);

  const [rooms, setRooms] = useState([
    { id: 1, roomNumber: '101', floor: 1, roomTypeId: 1, status: 'Available' },
    { id: 2, roomNumber: '102', floor: 1, roomTypeId: 1, status: 'Occupied' },
    { id: 3, roomNumber: '103', floor: 1, roomTypeId: 2, status: 'Available' },
    { id: 4, roomNumber: '201', floor: 2, roomTypeId: 2, status: 'Maintenance' },
    { id: 5, roomNumber: '202', floor: 2, roomTypeId: 3, status: 'Available' },
    { id: 6, roomNumber: '301', floor: 3, roomTypeId: 3, status: 'Blocked' },
    { id: 7, roomNumber: '104', floor: 1, roomTypeId: 1, status: 'Available' },
    { id: 8, roomNumber: '105', floor: 1, roomTypeId: 2, status: 'Available' }
  ]);

  const addRoomType = (roomType) => {
    setRoomTypes([...roomTypes, { ...roomType, id: Date.now() }]);
  };

  const updateRoomType = (id, updatedType) => {
    setRoomTypes(roomTypes.map(rt => rt.id === id ? { ...rt, ...updatedType } : rt));
  };

  const deleteRoomType = (id) => {
    setRoomTypes(roomTypes.filter(rt => rt.id !== id));
  };

  const addRoom = (room) => {
    setRooms([...rooms, { ...room, id: Date.now() }]);
  };

  const updateRoom = (id, updatedRoom) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, ...updatedRoom } : r));
  };

  const deleteRoom = (id) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const updateRoomStatus = (id, status) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <RoomContext.Provider value={{
      roomTypes, rooms,
      addRoomType, updateRoomType, deleteRoomType,
      addRoom, updateRoom, deleteRoom, updateRoomStatus
    }}>
      {children}
    </RoomContext.Provider>
  );
};