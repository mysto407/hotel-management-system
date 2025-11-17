// src/components/reservations/QuickBookingModal.jsx
import { Save, X, UserPlus } from 'lucide-react';
import { useMealPlans } from '../../context/MealPlanContext';
import { useRooms } from '../../context/RoomContext';
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { calculateDays } from '../../utils/helpers';

export const QuickBookingModal = ({
  isOpen,
  onClose,
  onSubmit,
  bookingData,
  setBookingData,
  guests,
  rooms,
  roomTypes,
  agents,
  pendingBookings = [],
  onAddGuestClick,
  onAddAgentClick
}) => {
  const { getActivePlans } = useMealPlans();
  const { getActiveRateTypesByRoomType, getDefaultRateTypeByRoomType } = useRooms();

  const room = rooms.find(r => r.id === bookingData.room_id);
  const roomType = roomTypes.find(rt => rt.id === room?.room_type_id);
  const nights = (bookingData.check_in_date && bookingData.check_out_date)
    ? calculateDays(bookingData.check_in_date, bookingData.check_out_date)
    : 0;

  // Get available rate types for the selected room type
  const availableRateTypes = roomType ? getActiveRateTypesByRoomType(roomType.id) : [];

  // Auto-select default rate type if not already set
  if (roomType && !bookingData.rate_type_id && availableRateTypes.length > 0) {
    const defaultRate = getDefaultRateTypeByRoomType(roomType.id);
    if (defaultRate) {
      setBookingData({ ...bookingData, rate_type_id: defaultRate.id });
    } else if (availableRateTypes.length > 0) {
      setBookingData({ ...bookingData, rate_type_id: availableRateTypes[0].id });
    }
  }

  // Get selected rate type details
  const selectedRateType = availableRateTypes.find(rt => rt.id === bookingData.rate_type_id);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {pendingBookings.length > 1 ? `Quick Booking (Creating ${pendingBookings.length} bookings)` : "Quick Booking"}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Multi-booking indicator */}
          {pendingBookings.length > 1 && (
            <div className="md:col-span-2">
              <Alert variant="warning">
                <AlertTitle>Multi-Room Booking</AlertTitle>
                <AlertDescription>
                  You're creating <strong>{pendingBookings.length} bookings</strong> at once. Guest details will be applied to all.
                  <br />
                  <span className="italic">
                    Rooms: {pendingBookings.map((b) => {
                      const room = rooms.find(r => r.id === b.roomId);
                      return room?.room_number || '?';
                    }).join(', ')}
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Room and Date Info */}
          <div className="md:col-span-2">
            <Alert variant="info">
              <AlertTitle>
                {`Room ${room?.room_number || ''} - ${roomType?.name || ''}`}
              </AlertTitle>
              <AlertDescription>
                Check-in: {bookingData.check_in_date}
                <br />
                Check-out: {bookingData.check_out_date}
                {nights > 0 && (
                  <strong className="block mt-1">{nights} night{nights !== 1 ? 's' : ''}</strong>
                )}
                {selectedRateType && (
                  <>
                    <br />
                    <span className="text-sm">
                      Rate: {selectedRateType.rate_name} - ₹{selectedRateType.base_price}/night
                      {nights > 0 && ` (Total: ₹${(selectedRateType.base_price * nights).toFixed(2)})`}
                    </span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          </div>

          {/* Rate Type Selection */}
          {availableRateTypes.length > 0 && (
            <div className="space-y-2 md:col-span-2">
              <Label>Rate Plan *</Label>
              <Select
                value={bookingData.rate_type_id || ''}
                onValueChange={(value) => setBookingData({ ...bookingData, rate_type_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Rate Plan" />
                </SelectTrigger>
                <SelectContent>
                  {availableRateTypes.map(rateType => (
                    <SelectItem key={rateType.id} value={rateType.id}>
                      {rateType.rate_name} - ₹{rateType.base_price}
                      {rateType.is_default && ' (Default)'}
                      {rateType.description && ` - ${rateType.description}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRateType?.inclusions && (
                <p className="text-xs text-muted-foreground">
                  Includes: {selectedRateType.inclusions}
                </p>
              )}
              {selectedRateType?.cancellation_policy && (
                <p className="text-xs text-muted-foreground">
                  Cancellation: {selectedRateType.cancellation_policy}
                </p>
              )}
            </div>
          )}

          {/* Booking Source */}
          <div className="space-y-2">
            <Label>Booking Source *</Label>
            <Select
              value={bookingData.booking_source || 'direct'}
              onValueChange={(value) => {
                setBookingData({
                  ...bookingData, 
                  booking_source: value, 
                  agent_id: '', 
                  direct_source: ''
                });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Direct Source / Agent */}
          {bookingData.booking_source === 'direct' ? (
            <div className="space-y-2">
              <Label>Direct Booking Source</Label>
              <Input
                type="text"
                value={bookingData.direct_source || ''}
                onChange={(e) => setBookingData({...bookingData, direct_source: e.target.value})}
                placeholder="e.g., Walk-in, Phone Call"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select Agent *</Label>
              <div className="flex gap-2">
                <Select
                  value={bookingData.agent_id || ''}
                  onValueChange={(value) => setBookingData({...bookingData, agent_id: value})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <SelectItem value="">Select Agent</SelectItem>  <-- REMOVED THIS LINE */}
                    {agents && agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={onAddAgentClick} variant="outline" size="icon" type="button">
                  <UserPlus size={18} />
                </Button>
              </div>
            </div>
          )}

          {/* Guest Selection */}
          <div className="space-y-2 md:col-span-2">
            <Label>Select Guest *</Label>
            <div className="flex gap-2">
              <Select
                value={bookingData.guest_id}
                onValueChange={(value) => setBookingData({ ...bookingData, guest_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Guest" />
                </SelectTrigger>
                <SelectContent>
                  {/* <SelectItem value="">Select Guest</SelectItem>  <-- REMOVED THIS LINE */}
                  {guests.map(guest => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.name} - {guest.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={onAddGuestClick} variant="outline" size="icon" type="button">
                <UserPlus size={18} />
              </Button>
            </div>
          </div>

          {/* Check-out Date */}
          <div className="space-y-2">
            <Label>Check-out Date *</Label>
            <Input
              type="date"
              value={bookingData.check_out_date}
              onChange={(e) => setBookingData({ ...bookingData, check_out_date: e.target.value })}
              min={bookingData.check_in_date}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={bookingData.status}
              onValueChange={(value) => setBookingData({ ...bookingData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Confirmed">Confirmed</SelectItem>
                <SelectItem value="Hold">Hold</SelectItem>
                <SelectItem value="Tentative">Tentative</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Number of Guests */}
          <div className="space-y-2">
            <Label>Adults *</Label>
            <Input
              type="number"
              min="1"
              value={bookingData.number_of_adults}
              onChange={(e) => setBookingData({ ...bookingData, number_of_adults: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Children</Label>
            <Input
              type="number"
              min="0"
              value={bookingData.number_of_children}
              onChange={(e) => setBookingData({ ...bookingData, number_of_children: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Infants</Label>
            <Input
              type="number"
              min="0"
              value={bookingData.number_of_infants}
              onChange={(e) => setBookingData({ ...bookingData, number_of_infants: e.target.value })}
            />
          </div>

          {/* Meal Plan */}
          <div className="space-y-2">
            <Label>Meal Plan</Label>
            <Select
              value={bookingData.meal_plan}
              onValueChange={(value) => setBookingData({ ...bookingData, meal_plan: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getActivePlans().map(plan => (
                  <SelectItem key={plan.code} value={plan.code}>
                    {plan.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Special Requests */}
          <div className="space-y-2 md:col-span-2">
            <Label>Special Requests</Label>
            <Textarea
              value={bookingData.special_requests}
              onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
              rows="2"
              placeholder="Any special requirements..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={onClose}>
              <X size={18} className="mr-2" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={onSubmit}>
            <Save size={18} className="mr-2" /> Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};