// src/components/rooms/RoomStatusModal.jsx
import { Home, RefreshCw, Lock, X } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import { updateRoomStatus } from '../../lib/supabase';
import { useAlert } from '@/context/AlertContext';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label"; // <-- ADD THIS LINE

import { cn } from '@/lib/utils';

export const RoomStatusModal = ({ isOpen, onClose, room }) => {
  const { fetchRooms } = useRooms();
  const { error: showError } = useAlert();

  const handleSubmitRoomStatus = async (newStatus) => {
    if (!room) return;

    try {
      await updateRoomStatus(room.id, newStatus);
      await fetchRooms();
      onClose();
    } catch (error) {
      console.error('Error updating room status:', error);
      showError('Failed to update room status: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Change Room Status</DialogTitle>
        </DialogHeader>
        {room && (
          <div className="py-4 space-y-6">
            <Alert>
              <AlertTitle className="font-semibold">
                Room {room.room_number}
              </AlertTitle>
              <AlertDescription>
                Floor {room.floor}
                <br />
                Current Status: <strong>{room.status}</strong>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Select New Status:</Label>
              <Button
                onClick={() => handleSubmitRoomStatus('Available')}
                variant={room.status === 'Available' ? 'default' : 'outline'}
                className="w-full justify-start"
              >
                <Home size={18} className="mr-2" />
                Available
              </Button>

              <Button
                onClick={() => handleSubmitRoomStatus('Maintenance')}
                variant={room.status === 'Maintenance' ? 'default' : 'outline'}
                className="w-full justify-start"
              >
                <RefreshCw size={18} className="mr-2" />
                Maintenance
              </Button>

              <Button
                onClick={() => handleSubmitRoomStatus('Blocked')}
                variant={room.status === 'Blocked' ? 'destructive' : 'outline'}
                className={cn(
                  "w-full justify-start",
                  room.status === 'Blocked' && "bg-slate-700 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-900 text-white dark:text-slate-100"
                )}
              >
                <Lock size={18} className="mr-2" />
                Blocked
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-full">
              <X size={18} className="mr-2" /> Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};