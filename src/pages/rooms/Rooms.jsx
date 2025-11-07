// src/pages/rooms/Rooms.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const Rooms = () => {
  const { rooms, roomTypes, addRoom, updateRoom, deleteRoom } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    room_number: '',
    floor: '',
    room_type_id: '',
    category: 'main building',
    status: 'Available'
  });

  const handleSubmit = async () => {
    const roomData = {
      room_number: formData.room_number,
      floor: formData.floor ? parseInt(formData.floor) : null,
      room_type_id: formData.room_type_id,
      category: formData.category,
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
      category: 'main building',
      status: 'Available'
    });
    setEditingRoom(null);
    setIsModalOpen(false);
  };

  const handleEdit = (room) => {
    setEditingRoom(room);
    setFormData({
      room_number: room.room_number,
      floor: room.floor || '',
      room_type_id: room.room_type_id,
      category: room.category || 'main building',
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
  
  const getStatusVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'available': return 'success';
      case 'occupied': return 'destructive';
      case 'maintenance': return 'warning';
      case 'blocked': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Rooms</h1>
        <Button onClick={() => { setEditingRoom(null); setIsModalOpen(true); }}>
          <Plus size={20} className="mr-2" /> Add Room
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room Number</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map(room => (
                <TableRow key={room.id}>
                  <TableCell className="font-medium">{room.room_number}</TableCell>
                  <TableCell>{room.floor ? `Floor ${room.floor}` : '-'}</TableCell>
                  <TableCell className="capitalize">{room.category || 'main building'}</TableCell>
                  <TableCell>{getRoomTypeName(room.room_type_id)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(room.status)}>
                      {room.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(room)}>
                        <Edit2 size={16} className="text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(room.id)}>
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Room'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room_number">Room Number</Label>
              <Input
                id="room_number"
                value={formData.room_number}
                onChange={(e) => setFormData({...formData, room_number: e.target.value})}
                placeholder="101"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="floor">Floor</Label>
              <Input
                id="floor"
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({...formData, floor: e.target.value})}
                placeholder="1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({...formData, category: value})}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main building">Main Building</SelectItem>
                  <SelectItem value="cottage">Cottage</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="room_type_id">Room Type</Label>
              <Select
                value={formData.room_type_id}
                onValueChange={(value) => setFormData({...formData, room_type_id: value})}
              >
                <SelectTrigger id="room_type_id">
                  <SelectValue placeholder="Select Room Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select Room Type</SelectItem>
                  {roomTypes.map(type => (
                    <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              <Save size={18} className="mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Rooms;