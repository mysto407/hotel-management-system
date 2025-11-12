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

  const [addonForm, setAddonForm] = useState({ name: '', price: '', quantity: 1 })

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
    if (addonForm.name && addonForm.price) {
      addAddon({
        name: addonForm.name,
        price: parseFloat(addonForm.price),
        quantity: parseInt(addonForm.quantity) || 1
      })
      setAddonForm({ name: '', price: '', quantity: 1 })
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Left Side: Cart */}
          <div className="space-y-6">
            {/* Selected Rooms */}
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

            {/* Add-ons */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Add-ons</h2>

              {/* Add-on Form */}
              <div className="space-y-3 mb-4 pb-4 border-b">
                <Input
                  type="text"
                  placeholder="Add-on name"
                  value={addonForm.name}
                  onChange={(e) => setAddonForm({ ...addonForm, name: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={addonForm.price}
                    onChange={(e) => setAddonForm({ ...addonForm, price: e.target.value })}
                  />
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={addonForm.quantity}
                    onChange={(e) => setAddonForm({ ...addonForm, quantity: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddAddon}
                  variant="outline"
                  className="w-full"
                  disabled={!addonForm.name || !addonForm.price}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* Added Add-ons */}
              {addons.length === 0 ? (
                <p className="text-gray-500 text-sm">No add-ons</p>
              ) : (
                <div className="space-y-2">
                  {addons.map(addon => (
                    <div key={addon.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{addon.name}</div>
                        <div className="text-gray-500">
                          ₹{addon.price} × {addon.quantity}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAddon(addon.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bill Summary */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold mb-4">Bill Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{bill.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>GST (18%)</span>
                  <span>₹{bill.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Grand Total</span>
                  <span>₹{bill.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-blue-600 mt-3 pt-3 border-t">
                  <span>Suggested Deposit (30%)</span>
                  <span>₹{bill.suggestedDeposit.toFixed(2)}</span>
                </div>
              </div>
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
