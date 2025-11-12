import { useState, useMemo } from 'react'
import { Search, Plus, Trash2, ChevronRight } from 'lucide-react'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useRooms } from '../../context/RoomContext'
import StepIndicator from '../../components/reservations/StepIndicator'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select'

// Common add-on types
const ADDON_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'transport', label: 'Transport' },
  { value: 'parking', label: 'Parking' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'spa', label: 'Spa' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'other', label: 'Other' },
]

export default function NewReservation({ onNavigate }) {
  const { roomTypes, rooms } = useRooms()
  const {
    filters,
    setFilters,
    selectedRooms,
    addRoom,
    removeRoom,
    updateRoomQuantity,
    addons,
    addAddon,
    removeAddon,
    calculateBill
  } = useReservationFlow()

  const [addonForm, setAddonForm] = useState({
    roomId: '',
    addonType: 'breakfast',
    customName: '',
    price: '',
    quantity: 1
  })

  // Calculate bill
  const bill = calculateBill()

  // Filter available room types based on search and date availability
  const availableRoomTypes = useMemo(() => {
    return roomTypes.map(roomType => {
      // Get all rooms of this type
      const typeRooms = rooms.filter(r => r.room_type_id === roomType.id && r.status === 'Available')

      // Calculate how many are already selected
      const selected = selectedRooms.find(sr => sr.id === roomType.id)?.quantity || 0
      const availableCount = typeRooms.length - selected

      return {
        ...roomType,
        availableCount,
        roomIds: typeRooms.map(r => r.id)
      }
    }).filter(rt => {
      // Filter by search query
      if (filters.searchQuery) {
        return rt.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
      }
      return true
    })
  }, [roomTypes, rooms, selectedRooms, filters.searchQuery])

  const handleAddRoom = (roomType) => {
    if (roomType.availableCount > 0) {
      addRoom(roomType, 1)
    }
  }

  const handleAddAddon = () => {
    if (addonForm.roomId && addonForm.price) {
      const addonName = addonForm.addonType === 'other'
        ? addonForm.customName
        : ADDON_TYPES.find(t => t.value === addonForm.addonType)?.label

      if (!addonName) {
        alert('Please enter a name for the custom add-on')
        return
      }

      const room = selectedRooms.find(r => r.id === addonForm.roomId)

      addAddon({
        roomId: addonForm.roomId,
        roomName: room?.name || 'Unknown Room',
        addonType: addonForm.addonType,
        name: addonName,
        price: parseFloat(addonForm.price),
        quantity: parseInt(addonForm.quantity) || 1
      })

      setAddonForm({
        roomId: '',
        addonType: 'breakfast',
        customName: '',
        price: '',
        quantity: 1
      })
    }
  }

  const canProceed = filters.checkIn && filters.checkOut && selectedRooms.length > 0

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">New Reservation</h1>
          <StepIndicator currentStep={1} />
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white border-b px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="space-y-2">
            <Label>Booking Source</Label>
            <Select
              value={filters.source}
              onValueChange={(value) => setFilters({ ...filters, source: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="walk-in">Walk-in</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Check-in Date *</Label>
            <Input
              type="date"
              value={filters.checkIn || ''}
              onChange={(e) => setFilters({ ...filters, checkIn: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Check-out Date *</Label>
            <Input
              type="date"
              value={filters.checkOut || ''}
              onChange={(e) => setFilters({ ...filters, checkOut: e.target.value })}
              min={filters.checkIn || ''}
            />
          </div>

          <div className="space-y-2">
            <Label>Promo Code</Label>
            <Input
              type="text"
              value={filters.promoCode}
              onChange={(e) => setFilters({ ...filters, promoCode: e.target.value })}
              placeholder="Enter promo code"
            />
          </div>

          <div className="space-y-2">
            <Label>Search Rooms</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search room types..."
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {bill.nights > 0 && (
          <div className="mt-3 text-sm text-gray-600">
            <strong>{bill.nights}</strong> night{bill.nights !== 1 ? 's' : ''}
            {filters.checkIn && filters.checkOut &&
              ` (${new Date(filters.checkIn).toLocaleDateString()} - ${new Date(filters.checkOut).toLocaleDateString()})`
            }
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Room Selection Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Side: Selected Rooms */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4">
                <h2 className="text-lg font-semibold mb-4">Selected Rooms</h2>
                {selectedRooms.length === 0 ? (
                  <p className="text-gray-500 text-sm">No rooms selected</p>
                ) : (
                  <div className="space-y-3">
                    {selectedRooms.map(room => (
                      <div key={room.id} className="flex items-center justify-between border-b pb-3">
                        <div className="flex-1">
                          <div className="font-medium">{room.name}</div>
                          <div className="text-sm text-gray-500">
                            ₹{room.base_price} × {bill.nights} nights
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={room.quantity}
                            onChange={(e) => updateRoomQuantity(room.id, parseInt(e.target.value))}
                            className="w-16 text-center"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeRoom(room.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Available Rooms Table */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left p-3 text-sm font-semibold">Type</th>
                        <th className="text-right p-3 text-sm font-semibold">Starting From</th>
                        <th className="text-center p-3 text-sm font-semibold">Available</th>
                        <th className="text-center p-3 text-sm font-semibold">Capacity</th>
                        <th className="text-center p-3 text-sm font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availableRoomTypes.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center p-8 text-gray-500">
                            No rooms available
                          </td>
                        </tr>
                      ) : (
                        availableRoomTypes.map(roomType => {
                          const isSelected = selectedRooms.some(sr => sr.id === roomType.id)
                          const selectedQty = selectedRooms.find(sr => sr.id === roomType.id)?.quantity || 0

                          return (
                            <tr key={roomType.id} className="border-b hover:bg-gray-50">
                              <td className="p-3">
                                <div>
                                  <div className="font-medium">{roomType.name}</div>
                                  {roomType.description && (
                                    <div className="text-sm text-gray-500">{roomType.description}</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-right font-semibold">
                                ₹{roomType.base_price}
                              </td>
                              <td className="p-3 text-center">
                                <span className={`
                                  px-2 py-1 rounded text-sm font-medium
                                  ${roomType.availableCount > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                `}>
                                  {roomType.availableCount}
                                  {isSelected && ` (${selectedQty} selected)`}
                                </span>
                              </td>
                              <td className="p-3 text-center text-gray-600">
                                {roomType.capacity} guests
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  onClick={() => handleAddRoom(roomType)}
                                  disabled={roomType.availableCount === 0}
                                  size="sm"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Add-ons Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add-ons</h2>

            {selectedRooms.length === 0 ? (
              <p className="text-gray-500 text-sm">Please select rooms first to add add-ons</p>
            ) : (
              <>
                {/* Add-on Form */}
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6 pb-6 border-b">
                  <div className="space-y-2">
                    <Label>Room *</Label>
                    <Select
                      value={addonForm.roomId}
                      onValueChange={(value) => setAddonForm({ ...addonForm, roomId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedRooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Add-on Type *</Label>
                    <Select
                      value={addonForm.addonType}
                      onValueChange={(value) => setAddonForm({ ...addonForm, addonType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ADDON_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {addonForm.addonType === 'other' && (
                    <div className="space-y-2">
                      <Label>Custom Name *</Label>
                      <Input
                        type="text"
                        placeholder="Enter name"
                        value={addonForm.customName}
                        onChange={(e) => setAddonForm({ ...addonForm, customName: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Price *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={addonForm.price}
                      onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={addonForm.quantity}
                      onChange={(e) => setAddonForm({ ...addonForm, quantity: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="invisible">Add</Label>
                    <Button
                      onClick={handleAddAddon}
                      disabled={!addonForm.roomId || !addonForm.price || (addonForm.addonType === 'other' && !addonForm.customName)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>

                {/* Added Add-ons Table */}
                {addons.length === 0 ? (
                  <p className="text-gray-500 text-sm">No add-ons added yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Room</th>
                          <th className="text-left p-3 text-sm font-semibold">Add-on Type</th>
                          <th className="text-left p-3 text-sm font-semibold">Name</th>
                          <th className="text-right p-3 text-sm font-semibold">Price</th>
                          <th className="text-center p-3 text-sm font-semibold">Quantity</th>
                          <th className="text-right p-3 text-sm font-semibold">Total</th>
                          <th className="text-center p-3 text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addons.map(addon => (
                          <tr key={addon.id} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{addon.roomName}</td>
                            <td className="p-3 text-sm capitalize">{addon.addonType}</td>
                            <td className="p-3 text-sm font-medium">{addon.name}</td>
                            <td className="p-3 text-sm text-right">₹{addon.price.toFixed(2)}</td>
                            <td className="p-3 text-sm text-center">{addon.quantity}</td>
                            <td className="p-3 text-sm text-right font-semibold">
                              ₹{(addon.price * addon.quantity).toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeAddon(addon.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bill Summary Row */}
      <div className="bg-gray-100 border-t px-6 py-3">
        <div className="flex items-center justify-end gap-8 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-semibold">₹{bill.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Taxes (18%):</span>
            <span className="font-semibold">₹{bill.tax.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Grand Total:</span>
            <span className="font-bold text-lg text-blue-600">₹{bill.total.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Suggested Deposit:</span>
            <span className="font-semibold text-green-600">₹{bill.suggestedDeposit.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Balance Due:</span>
            <span className="font-semibold">₹{(bill.total - bill.suggestedDeposit).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer with Navigation */}
      <div className="bg-white border-t px-6 py-4">
        <div className="flex justify-end">
          <Button
            onClick={() => onNavigate('guest-details')}
            disabled={!canProceed}
            size="lg"
          >
            Guest Details
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
