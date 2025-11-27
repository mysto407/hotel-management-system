import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { getAvailableRooms } from '../../lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Clock, BedDouble, User, Calendar } from 'lucide-react';

/**
 * Modal for assigning a room to an unassigned reservation during check-in
 */
export default function RoomAssignmentModal({
  open,
  onOpenChange,
  reservation,
  onAssign, // (roomId) => Promise<void> - called after room is assigned, should proceed with check-in
}) {
  const { roomTypes } = useRooms();
  const { guests } = useGuests();

  const [availableRooms, setAvailableRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(false);

  // Load available rooms when modal opens
  useEffect(() => {
    if (open && reservation) {
      loadAvailableRooms();
    } else {
      setAvailableRooms([]);
      setSelectedRoomId('');
    }
  }, [open, reservation]);

  const loadAvailableRooms = async () => {
    if (!reservation) return;

    setLoadingRooms(true);
    try {
      const { data, error } = await getAvailableRooms(
        reservation.check_in_date,
        reservation.check_out_date
      );

      if (error) {
        console.error('Error loading available rooms:', error);
        setAvailableRooms([]);
        return;
      }

      // Filter to only show rooms of the same type as the reservation
      const matchingRooms = (data || []).filter(
        room => room.room_type_id === reservation.room_type_id
      );

      setAvailableRooms(matchingRooms);

      // Auto-select first available room
      if (matchingRooms.length > 0) {
        setSelectedRoomId(matchingRooms[0].id);
      }
    } catch (err) {
      console.error('Error loading rooms:', err);
      setAvailableRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedRoomId || !onAssign) return;

    setLoading(true);
    try {
      await onAssign(selectedRoomId);
    } finally {
      setLoading(false);
    }
  };

  // Get reservation details
  const guest = reservation ? guests.find(g => g.id === reservation.guest_id) : null;
  const roomType = reservation ? roomTypes.find(rt => rt.id === reservation.room_type_id) : null;
  const checkIn = reservation?.check_in_date ? parseISO(reservation.check_in_date) : null;
  const checkOut = reservation?.check_out_date ? parseISO(reservation.check_out_date) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Assign Room for Check-in
          </DialogTitle>
          <DialogDescription>
            This reservation doesn't have a room assigned. Please select a room to complete check-in.
          </DialogDescription>
        </DialogHeader>

        {reservation && (
          <div className="space-y-4 py-4">
            {/* Reservation Details */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{guest?.name || 'Unknown Guest'}</span>
              </div>

              <div className="flex items-center gap-2">
                <BedDouble className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{roomType?.name || 'Unknown Room Type'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {checkIn && checkOut && (
                    <>
                      {format(checkIn, 'MMM d')} - {format(checkOut, 'MMM d, yyyy')}
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Room Selection */}
            <div className="space-y-2">
              <Label htmlFor="room-select">Select Room *</Label>

              {loadingRooms ? (
                <div className="h-10 flex items-center justify-center text-sm text-muted-foreground">
                  Loading available rooms...
                </div>
              ) : availableRooms.length === 0 ? (
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    No available rooms of type "{roomType?.name}" for these dates.
                  </p>
                </div>
              ) : (
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger id="room-select">
                    <SelectValue placeholder="Select a room..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        <div className="flex items-center gap-2">
                          <span>Room {room.room_number}</span>
                          {room.floor && (
                            <Badge variant="outline" className="text-xs">
                              Floor {room.floor}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {availableRooms.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availableRooms.length} room{availableRooms.length !== 1 ? 's' : ''} available
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedRoomId || loading || loadingRooms}
          >
            {loading ? 'Assigning...' : 'Assign & Check In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
