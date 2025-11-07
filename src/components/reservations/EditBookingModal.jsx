// src/components/reservations/EditBookingModal.jsx
import { useState, useEffect } from 'react';
import { UserPlus, XCircle, Save } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import { useGuests } from '../../context/GuestContext';
import { useAgents } from '../../context/AgentContext';
import { calculateDays } from '../../utils/helpers';
import { AddGuestModal } from '../guests/AddGuestModal';
import { AddAgentModal } from '../agents/AddAgentModal';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export const EditBookingModal = ({
  isOpen,
  onClose,
  onSubmit,
  editingReservation,
  editingGroup,
  initialFormData,
  initialRoomDetails
}) => {
  const { rooms, roomTypes } = useRooms();
  const { guests, getGuestByPhone } = useGuests();
  const { agents } = useAgents();

  const [formData, setFormData] = useState({
    booking_source: 'direct',
    agent_id: '',
    direct_source: '',
    guest_id: '',
    room_type_id: '',
    number_of_rooms: 1,
    check_in_date: '',
    check_out_date: '',
    meal_plan: 'NM',
    total_amount: 0,
    advance_payment: 0,
    payment_status: 'Pending',
    status: 'Confirmed',
    special_requests: ''
  });

  const [roomDetails, setRoomDetails] = useState([{
    room_type_id: '',
    room_id: '',
    number_of_adults: 1,
    number_of_children: 0,
    number_of_infants: 0
  }]);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);

  // Update form data when props change
  useEffect(() => {
    if (initialFormData) {
      setFormData(initialFormData);
    }
    if (initialRoomDetails) {
      setRoomDetails(initialRoomDetails);
    }
    
    if (initialFormData?.guest_id) {
      const guest = guests.find(g => g.id === initialFormData.guest_id);
      setSelectedGuest(guest);
    }
  }, [initialFormData, initialRoomDetails, guests]);

  const availableRooms = rooms.filter(r => r.status === 'Available');

  const getAvailableRoomsByType = (roomTypeId) => {
    if (!roomTypeId) return [];
    return rooms.filter(r => r.room_type_id === roomTypeId && r.status === 'Available');
  };

  const handleNumberOfRoomsChange = (count) => {
    const numRooms = parseInt(count) || 1;
    setFormData({ ...formData, number_of_rooms: numRooms });
    
    const newRoomDetails = [];
    for (let i = 0; i < numRooms; i++) {
      newRoomDetails.push(roomDetails[i] || {
        room_type_id: '',
        room_id: '',
        number_of_adults: 1,
        number_of_children: 0,
        number_of_infants: 0
      });
    }
    setRoomDetails(newRoomDetails);
  };

  const updateRoomDetail = (index, field, value) => {
    const updated = [...roomDetails];
    updated[index] = { ...updated[index], [field]: value };
    setRoomDetails(updated);
  };

  const autoAssignRooms = () => {
    const updated = [...roomDetails];
    
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].room_id && updated[i].room_type_id) {
        const availableRooms = getAvailableRoomsByType(updated[i].room_type_id);
        const unassignedRooms = availableRooms.filter(room => 
          !updated.some(rd => rd.room_id === room.id)
        );
        
        if (unassignedRooms.length > 0) {
          updated[i].room_id = unassignedRooms[0].id;
        }
      }
    }
    setRoomDetails(updated);
  };

  const calculateTotal = () => {
    if (formData.check_in_date && formData.check_out_date && roomDetails.length > 0) {
      const days = calculateDays(formData.check_in_date, formData.check_out_date);
      let total = 0;
      
      roomDetails.forEach(roomDetail => {
        if (roomDetail.room_type_id) {
          const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
          if (roomType) {
            total += roomType.base_price * days;
          }
        }
      });
      
      setFormData(prev => ({ ...prev, total_amount: total }));
    }
  };

  const handleGuestSearch = (phone) => {
    const guest = getGuestByPhone(phone);
    if (guest) {
      setFormData({ ...formData, guest_id: guest.id });
      setSelectedGuest(guest);
    } else {
      setFormData({ ...formData, guest_id: '' });
      setSelectedGuest(null);
    }
  };

  const handleGuestSelect = (guestId) => {
    const guest = guests.find(g => g.id === guestId);
    setFormData({ ...formData, guest_id: guestId });
    setSelectedGuest(guest);
  };

  const onGuestAdded = (newGuest) => {
    setFormData({ ...formData, guest_id: newGuest.id });
    setSelectedGuest(newGuest);
    setIsGuestModalOpen(false);
  };

  const onAgentAdded = (newAgent) => {
    setFormData({ ...formData, agent_id: newAgent.id });
    setIsAgentModalOpen(false);
  };

  const handleSubmit = () => {
    if (!formData.guest_id || !formData.check_in_date || !formData.check_out_date) {
      alert('Please fill all required fields');
      return;
    }
    const unselectedRoomTypes = roomDetails.filter(rd => !rd.room_type_id);
    if (unselectedRoomTypes.length > 0) {
      alert(`Please select room type for all ${formData.number_of_rooms} room(s)`);
      return;
    }
    const unassignedRooms = roomDetails.filter(rd => !rd.room_id);
    if (unassignedRooms.length > 0) {
      alert(`Please assign room numbers for all ${formData.number_of_rooms} room(s)`);
      return;
    }
    const roomIds = roomDetails.map(rd => rd.room_id);
    const uniqueRoomIds = new Set(roomIds);
    if (roomIds.length !== uniqueRoomIds.size) {
      alert('Cannot assign the same room multiple times');
      return;
    }
    onSubmit(formData, roomDetails);
  };
  
  const title = editingGroup 
    ? `Edit Group Booking - ${editingGroup.length} Rooms` 
    : editingReservation 
      ? 'Edit Reservation' 
      : `New Booking${formData.number_of_rooms > 1 ? ` - ${formData.number_of_rooms} Rooms` : ''}`;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Booking Source */}
            <div className="space-y-2">
              <Label>Booking Source *</Label>
              <Select
                value={formData.booking_source}
                onValueChange={(value) => {
                  setFormData({...formData, booking_source: value, agent_id: '', direct_source: ''});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct</SelectItem>
                  <SelectItem value="agent">Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direct Source */}
            {formData.booking_source === 'direct' && (
              <div className="space-y-2">
                <Label>Direct Booking Source</Label>
                <Input
                  value={formData.direct_source}
                  onChange={(e) => setFormData({...formData, direct_source: e.target.value})}
                  placeholder="e.g., Walk-in, Phone Call, Website"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Specify where this booking came from
                </p>
              </div>
            )}

            {/* Agent Selection */}
            {formData.booking_source === 'agent' && (
              <div className="space-y-2">
                <Label>Select Agent *</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.agent_id}
                    onValueChange={(value) => setFormData({...formData, agent_id: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Select Agent</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} - {agent.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setIsAgentModalOpen(true)} 
                    variant="outline"
                    type="button"
                  >
                    <UserPlus size={18} />
                  </Button>
                </div>
              </div>
            )}

            {/* Guest Selection */}
            <div className="space-y-2 col-span-2">
              <Label>Select Guest *</Label>
              <div className="flex gap-2">
                <Select
                  value={formData.guest_id}
                  onValueChange={handleGuestSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select guest" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Select Guest</SelectItem>
                    {guests.map(guest => (
                      <SelectItem key={guest.id} value={guest.id}>
                        {guest.name} - {guest.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={() => setIsGuestModalOpen(true)} 
                  variant="outline"
                  type="button"
                >
                  <UserPlus size={18} />
                </Button>
              </div>
            </div>

            {/* Guest Quick Search */}
            <div className="space-y-2 col-span-2">
              <Label>Or Search by Phone</Label>
              <Input
                type="tel"
                placeholder="Enter phone number to search"
                onBlur={(e) => handleGuestSearch(e.target.value)}
              />
            </div>

            {/* Selected Guest Info */}
            {selectedGuest && (
              <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="font-semibold text-blue-800">{selectedGuest.name}</p>
                <p className="text-sm text-blue-600">
                  {selectedGuest.phone} • {selectedGuest.email || 'No email'}
                </p>
              </div>
            )}

            {/* Number of Rooms */}
            {!editingReservation && !editingGroup && (
              <div className="space-y-2">
                <Label>Number of Rooms *</Label>
                <Select
                  value={String(formData.number_of_rooms)}
                  onValueChange={(value) => {
                    handleNumberOfRoomsChange(value);
                    setTimeout(calculateTotal, 0);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: Math.min(availableRooms.length, 10) }, (_, i) => i + 1).map(num => (
                      <SelectItem key={num} value={String(num)}>
                        {num} {num === 1 ? 'Room' : 'Rooms'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {availableRooms.length} rooms currently available
                </p>
              </div>
            )}

            {/* Room Details */}
            <div className="space-y-4 col-span-2">
              <div className="flex justify-between items-center">
                <Label className="text-base font-semibold">Room Details *</Label>
                {!editingReservation && !editingGroup && formData.number_of_rooms > 0 && (
                  <Button
                    type="button"
                    onClick={autoAssignRooms}
                    variant="secondary"
                    size="sm"
                  >
                    Auto-Assign Rooms
                  </Button>
                )}
              </div>

              {roomDetails.map((roomDetail, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardContent className="p-4 space-y-4">
                    <p className="font-semibold text-gray-700">Room {index + 1}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Room Type Selection */}
                      <div className="space-y-2">
                        <Label>Room Type *</Label>
                        <Select
                          value={roomDetail.room_type_id || ''}
                          onValueChange={(value) => {
                            const updated = [...roomDetails];
                            updated[index] = {
                              ...updated[index],
                              room_type_id: value,
                              room_id: ''
                            };
                            setRoomDetails(updated);
                            setTimeout(calculateTotal, 0);
                          }}
                          disabled={editingReservation || editingGroup}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Room Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Select Room Type</SelectItem>
                            {roomTypes.map(roomType => {
                              const availableCount = getAvailableRoomsByType(roomType.id).length;
                              return (
                                <SelectItem key={roomType.id} value={roomType.id}>
                                  {roomType.name} - ₹{roomType.base_price}/night ({availableCount} available)
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Room Number Selection */}
                      {roomDetail.room_type_id && (
                        <div className="space-y-2">
                          <Label>Room Number *</Label>
                          <Select
                            value={roomDetail.room_id || ''}
                            onValueChange={(value) => updateRoomDetail(index, 'room_id', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Room Number" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Select Room Number</SelectItem>
                              {getAvailableRoomsByType(roomDetail.room_type_id)
                                .filter(room => 
                                  room.id === roomDetail.room_id || 
                                  !roomDetails.some(rd => rd.room_id === room.id)
                                )
                                .map(room => (
                                  <SelectItem key={room.id} value={room.id}>
                                    Room {room.room_number} - Floor {room.floor}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    
                    {/* Guest Counts */}
                    <div className="space-y-2">
                      <Label>Number of Guests *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Input
                            type="number"
                            min="1"
                            value={roomDetail.number_of_adults || 1}
                            onChange={(e) => updateRoomDetail(index, 'number_of_adults', e.target.value)}
                            placeholder="Adults"
                          />
                          <p className="text-xs text-muted-foreground text-center mt-1">Adults</p>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0"
                            value={roomDetail.number_of_children || 0}
                            onChange={(e) => updateRoomDetail(index, 'number_of_children', e.target.value)}
                            placeholder="Children"
                          />
                          <p className="text-xs text-muted-foreground text-center mt-1">Children</p>
                        </div>
                        <div>
                          <Input
                            type="number"
                            min="0"
                            value={roomDetail.number_of_infants || 0}
                            onChange={(e) => updateRoomDetail(index, 'number_of_infants', e.target.value)}
                            placeholder="Infants"
                          />
                          <p className="text-xs text-muted-foreground text-center mt-1">Infants</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-700 pt-2">
                      Total: {parseInt(roomDetail.number_of_adults || 0) + 
                               parseInt(roomDetail.number_of_children || 0) + 
                               parseInt(roomDetail.number_of_infants || 0)} guests
                      {roomDetail.room_type_id && formData.check_in_date && formData.check_out_date && (
                        <span className="ml-3 font-semibold text-gray-800">
                          • ₹{(() => {
                            const roomType = roomTypes.find(rt => rt.id === roomDetail.room_type_id);
                            const days = calculateDays(formData.check_in_date, formData.check_out_date);
                            return roomType ? (roomType.base_price * days).toLocaleString() : 0;
                          })()} 
                          {formData.check_in_date && formData.check_out_date && 
                            ` (${calculateDays(formData.check_in_date, formData.check_out_date)} nights)`
                          }
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Total Summary */}
            {roomDetails.length > 0 && (
              <div className="col-span-2 p-3 bg-blue-50 border border-blue-200 rounded-md grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div>
                  <strong>Total Rooms:</strong> {roomDetails.length}
                </div>
                <div>
                  <strong>Total Guests:</strong> {roomDetails.reduce((sum, rd) => 
                    sum + parseInt(rd.number_of_adults || 0) + 
                    parseInt(rd.number_of_children || 0) + 
                    parseInt(rd.number_of_infants || 0), 0
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Meal Plan *</Label>
              <Select
                value={formData.meal_plan}
                onValueChange={(value) => setFormData({...formData, meal_plan: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NM">NM - No Meal</SelectItem>
                  <SelectItem value="BO">BO - Breakfast Only</SelectItem>
                  <SelectItem value="HB">HB - Half Board</SelectItem>
                  <SelectItem value="FB">FB - Full Board</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inquiry">Inquiry</SelectItem>
                  <SelectItem value="Tentative">Tentative</SelectItem>
                  <SelectItem value="Hold">Hold</SelectItem>
                  <SelectItem value="Confirmed">Confirmed</SelectItem>
                  <SelectItem value="Checked-in">Checked-in</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Check-in Date *</Label>
              <Input
                type="date"
                value={formData.check_in_date}
                onChange={(e) => {
                  setFormData({...formData, check_in_date: e.target.value});
                  setTimeout(calculateTotal, 0);
                }}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Check-out Date *</Label>
              <Input
                type="date"
                value={formData.check_out_date}
                onChange={(e) => {
                  setFormData({...formData, check_out_date: e.target.value});
                  setTimeout(calculateTotal, 0);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Total Amount *</Label>
              <Input
                type="number"
                value={formData.total_amount}
                onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
              />
              {(!editingReservation || editingGroup) && formData.number_of_rooms > 1 && formData.total_amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  Calculated from individual room rates
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Advance Payment</Label>
              <Input
                type="number"
                value={formData.advance_payment}
                onChange={(e) => setFormData({...formData, advance_payment: e.target.value})}
              />
              {(!editingReservation || editingGroup) && formData.number_of_rooms > 1 && formData.advance_payment > 0 && (
                <p className="text-xs text-muted-foreground">
                  ₹{(formData.advance_payment / formData.number_of_rooms).toFixed(2)} per room
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value) => setFormData({...formData, payment_status: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Special Requests</Label>
              <Textarea
                value={formData.special_requests}
                onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
                rows="2"
                placeholder="Any special requirements..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onClose}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              <Save size={18} className="mr-2" /> Save Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Add Guest Modal */}
      <AddGuestModal
        isOpen={isGuestModalOpen}
        onClose={() => setIsGuestModalOpen(false)}
        onGuestAdded={onGuestAdded}
      />

      {/* Reusable Add Agent Modal */}
      <AddAgentModal
        isOpen={isAgentModalOpen}
        onClose={() => setIsAgentModalOpen(false)}
        onAgentAdded={onAgentAdded}
      />
    </>
  );
};