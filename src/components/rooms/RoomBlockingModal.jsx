// src/components/rooms/RoomBlockingModal.jsx
import { useState, useEffect } from 'react';
import { format, parseISO, addDays, differenceInDays } from 'date-fns';
import { CalendarDays, X, AlertTriangle, Wrench } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RoomBlockingModal = ({
  isOpen,
  onClose,
  initialRoom = null,
  initialStartDate = null,
  initialEndDate = null,
  editingBlocking = null
}) => {
  const { rooms, roomTypes, addBlocking, updateBlocking, removeBlocking } = useRooms();

  const [formData, setFormData] = useState({
    room_id: '',
    start_date: '',
    end_date: '',
    reason: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes or editing changes
  useEffect(() => {
    if (isOpen) {
      if (editingBlocking) {
        // Editing existing blocking
        setFormData({
          room_id: editingBlocking.room_id || '',
          start_date: editingBlocking.start_date || '',
          end_date: editingBlocking.end_date || '',
          reason: editingBlocking.reason || ''
        });
      } else {
        // Creating new blocking
        setFormData({
          room_id: initialRoom || '',
          start_date: initialStartDate ? format(initialStartDate, 'yyyy-MM-dd') : '',
          end_date: initialEndDate ? format(initialEndDate, 'yyyy-MM-dd') : '',
          reason: ''
        });
      }
      setError('');
    }
  }, [isOpen, editingBlocking, initialRoom, initialStartDate, initialEndDate]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.room_id) {
      setError('Please select a room');
      return false;
    }
    if (!formData.start_date) {
      setError('Please select a start date');
      return false;
    }
    if (!formData.end_date) {
      setError('Please select an end date');
      return false;
    }

    const startDate = parseISO(formData.start_date);
    const endDate = parseISO(formData.end_date);

    if (endDate <= startDate) {
      setError('End date must be after start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (editingBlocking) {
        await updateBlocking(editingBlocking.id, formData);
      } else {
        await addBlocking(formData);
      }
      onClose();
    } catch (err) {
      setError('Failed to save room blocking');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBlocking) return;

    setLoading(true);
    try {
      await removeBlocking(editingBlocking.id);
      onClose();
    } catch (err) {
      setError('Failed to remove blocking');
    } finally {
      setLoading(false);
    }
  };

  // Get room display name
  const getRoom = (roomId) => rooms.find(r => r.id === roomId);
  const getRoomType = (room) => roomTypes.find(rt => rt.id === room?.room_type_id);

  // Calculate duration
  const duration = formData.start_date && formData.end_date
    ? differenceInDays(parseISO(formData.end_date), parseISO(formData.start_date))
    : 0;

  // Group rooms by type for the dropdown
  const roomsByType = roomTypes.map(type => ({
    type,
    rooms: rooms.filter(r => r.room_type_id === type.id)
      .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
  })).filter(group => group.rooms.length > 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-500" />
            {editingBlocking ? 'Edit Room Blocking' : 'Block Room Dates'}
          </DialogTitle>
          <DialogDescription>
            Block a room for maintenance or other purposes. The room will be unavailable for reservations during this period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Room Selection */}
          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Select
              value={formData.room_id}
              onValueChange={(value) => handleChange('room_id', value)}
              disabled={!!initialRoom}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent>
                {roomsByType.map(group => (
                  <div key={group.type.id}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      {group.type.name}
                    </div>
                    {group.rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>
                        Room {room.room_number}
                        {room.floor && <span className="text-muted-foreground ml-2">(Floor {room.floor})</span>}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  min={formData.start_date ? addDays(parseISO(formData.start_date), 1).toISOString().split('T')[0] : undefined}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Duration display */}
          {duration > 0 && (
            <p className="text-sm text-muted-foreground">
              Blocking for <span className="font-medium text-foreground">{duration} day{duration !== 1 ? 's' : ''}</span>
            </p>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleChange('reason', e.target.value)}
              placeholder="e.g., Maintenance, Renovation, Deep cleaning..."
              rows={2}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:gap-0">
            {editingBlocking && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Remove Blocking
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingBlocking ? 'Update' : 'Block Room'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomBlockingModal;
