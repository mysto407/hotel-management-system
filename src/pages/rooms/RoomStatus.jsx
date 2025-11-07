// src/pages/rooms/RoomStatus.jsx
import { useState } from 'react';
import { useRooms } from '../../context/RoomContext';

// Import shadcn components
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';

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
    Available: 'border-green-500 bg-green-50',
    Occupied: 'border-red-500 bg-red-50',
    Maintenance: 'border-yellow-500 bg-yellow-50',
    Blocked: 'border-gray-500 bg-gray-50'
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
        <h1 className="text-3xl font-bold">Room Status</h1>
        <div className="flex items-center gap-2">
          <Label htmlFor="floor-select">Floor:</Label>
          <Select
            value={selectedFloor}
            onValueChange={setSelectedFloor}
          >
            <SelectTrigger id="floor-select" className="w-[180px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Floors</SelectItem>
              {floors.map(floor => (
                <SelectItem key={floor} value={String(floor)}>Floor {floor}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusColors).map(([status, className]) => (
              <div key={status} className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-sm", className.split(' ')[1])} />
                <span className="text-sm font-medium">{status}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredRooms.map(room => (
          <Card
            key={room.id}
            className={cn("flex flex-col", statusColors[room.status], "border-l-4")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-bold">Room {room.room_number}</CardTitle>
              <Badge variant={getStatusVariant(room.status)}>
                {room.status}
              </Badge>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-muted-foreground">{getRoomTypeName(room.room_type_id)}</p>
              <p className="text-sm text-muted-foreground">Floor {room.floor}</p>
            </CardContent>
            <CardFooter>
              <Select
                value={room.status}
                onValueChange={(value) => updateRoomStatus(room.id, value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Occupied">Occupied</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RoomStatus;