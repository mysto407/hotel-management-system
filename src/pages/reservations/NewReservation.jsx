import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Trash2, ChevronRight, Shuffle, UserPlus } from 'lucide-react'
import { format } from 'date-fns'
import { useReservationFlow } from '../../context/ReservationFlowContext'
import { useRooms } from '../../context/RoomContext'
import { useMealPlans } from '../../context/MealPlanContext'
import { useAgents } from '../../context/AgentContext'
import { useAlert } from '@/context/AlertContext'
import { getAvailableRooms } from '../../lib/supabase'
import StepIndicator from '../../components/reservations/StepIndicator'
import { AddAgentModal } from '../../components/agents/AddAgentModal'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Calendar } from '../../components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../components/ui/popover'
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
  const { roomTypes, getRateTypesByRoomType, getDefaultRateTypeByRoomType } = useRooms()
  const { getActivePlans } = useMealPlans()
  const { agents } = useAgents()
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert()
  const {
    filters,
    setFilters,
    selectedAgent,
    setSelectedAgent,
    selectedRooms,
    addRoom,
    removeRoom,
    clearSelectedRooms,
    updateRoomQuantity,
    updateRoomRate,
    assignRoom,
    unassignRoom,
    autoAssignRooms,
    setMealPlan,
    setMealPlanForAll,
    setGuestCount,
    setGuestCountForAll,
    addons,
    addAddon,
    removeAddon,
    calculateBill
  } = useReservationFlow()

  // State for available rooms based on date range
  const [availableRooms, setAvailableRooms] = useState([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [selectedRates, setSelectedRates] = useState({})

  const [addonForm, setAddonForm] = useState({
    roomId: '',
    addonType: 'breakfast',
    customName: '',
    price: '',
    quantity: 1
  })

  // State to track quantity for each room type
  const [roomQuantities, setRoomQuantities] = useState({})
  const [sameMealPlanForAll, setSameMealPlanForAll] = useState(true)
  const [globalMealPlan, setGlobalMealPlan] = useState('none')
  const [dateRangeOpen, setDateRangeOpen] = useState(false)
  const [showAddAgentModal, setShowAddAgentModal] = useState(false)

  // Fetch available rooms when dates change
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      if (filters.checkIn && filters.checkOut) {
        setLoadingRooms(true)
        const { data, error } = await getAvailableRooms(filters.checkIn, filters.checkOut)
        if (error) {
          console.error('Error fetching available rooms:', error)
          showError('Failed to load available rooms')
          setAvailableRooms([])
        } else {
          setAvailableRooms(data || [])
        }
        setLoadingRooms(false)
      } else {
        // Clear available rooms and selected rooms when dates are cleared
        setAvailableRooms([])
        clearSelectedRooms()
      }
    }

    fetchAvailableRooms()
  }, [filters.checkIn, filters.checkOut, showError, clearSelectedRooms])

  const getRoomQuantity = (roomTypeId) => {
    return roomQuantities[roomTypeId] || 1
  }

  const updateRoomTypeQuantity = (roomTypeId, quantity) => {
    setRoomQuantities(prev => ({
      ...prev,
      [roomTypeId]: Math.max(1, parseInt(quantity) || 1)
    }))
  }

  const handleGlobalMealPlanChange = (mealPlan) => {
    setGlobalMealPlan(mealPlan)
    if (sameMealPlanForAll) {
      setMealPlanForAll(mealPlan)
    }
  }

  // Get available rooms for a specific room type (excluding already assigned rooms)
  const getAvailableRoomsForType = (roomTypeId) => {
    // Get all rooms of this type that are available for the selected date range
    const typeRooms = availableRooms.filter(r => r.room_type_id === roomTypeId)

    // Get already assigned room IDs across all selected rooms
    const assignedRoomIds = selectedRooms.flatMap(sr => sr.assignedRooms || []).filter(Boolean)

    // Return rooms that haven't been assigned yet in this booking
    return typeRooms.filter(r => !assignedRoomIds.includes(r.id))
  }

  const handleAutoAssignAll = () => {
    selectedRooms.forEach(roomType => {
      const typeAvailableRooms = getAvailableRoomsForType(roomType.id)
      const availableRoomIds = typeAvailableRooms.map(r => r.id)
      autoAssignRooms(roomType.id, availableRoomIds)
    })
  }

  // Calculate bill
  const bill = calculateBill()

  // Check if filters are applied (dates are required)
  const hasFiltersApplied = filters.checkIn && filters.checkOut

  // Filter available room types based on search and date availability
  const availableRoomTypes = useMemo(() => {
    if (!hasFiltersApplied) {
      return []
    }

    return roomTypes.map(roomType => {
      // Get all rooms of this type that are available for the selected date range
      const typeRooms = availableRooms.filter(r => r.room_type_id === roomType.id)

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
  }, [roomTypes, availableRooms, selectedRooms, filters.searchQuery, hasFiltersApplied])

  const handleAddRoom = (roomType, quantity = 1) => {
    if (roomType.availableCount > 0) {
      // Get the selected rate for this room type
      const selectedRate = getSelectedRateForRoomType(roomType.id)

      // Add the room with rate information
      const roomWithRate = {
        ...roomType,
        ratePrice: selectedRate?.base_price || roomType.base_price
      }

      addRoom(roomWithRate, quantity, selectedRate?.id)
    }
  }

  const handleAutoAssign = (roomTypeId) => {
    const typeAvailableRooms = getAvailableRoomsForType(roomTypeId)
    const availableRoomIds = typeAvailableRooms.map(r => r.id)
    autoAssignRooms(roomTypeId, availableRoomIds)
  }

  const handleAddAddon = () => {
    if (addonForm.roomId && addonForm.price) {
      const addonName = addonForm.addonType === 'other'
        ? addonForm.customName
        : ADDON_TYPES.find(t => t.value === addonForm.addonType)?.label

      if (!addonName) {
        showError('Please enter a name for the custom add-on')
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

  // Validate that all rooms have assigned room numbers
  const allRoomsAssigned = selectedRooms.every(roomType => {
    const assignedCount = (roomType.assignedRooms || []).filter(Boolean).length
    return assignedCount === roomType.quantity
  })

  // Validate that an agent is selected when source is 'agent'
  const agentValid = filters.source !== 'agent' || selectedAgent !== null

  const canProceed = filters.checkIn && filters.checkOut && selectedRooms.length > 0 && allRoomsAssigned && agentValid

  // Handle agent added from modal
  const handleAgentAdded = (newAgent) => {
    setSelectedAgent(newAgent)
    setShowAddAgentModal(false)
  }

  // Get the selected rate type for a room type, or default to the default rate
  const getSelectedRateForRoomType = (roomTypeId) => {
    const rateTypes = getRateTypesByRoomType(roomTypeId)
    if (rateTypes.length === 0) return null

    // If a rate is selected in state, use that
    if (selectedRates[roomTypeId]) {
      const selected = rateTypes.find(rt => rt.id === selectedRates[roomTypeId])
      if (selected) return selected
    }

    // Otherwise, use the default rate
    const defaultRate = getDefaultRateTypeByRoomType(roomTypeId)
    if (defaultRate) return defaultRate

    // Fallback to the first rate
    return rateTypes[0]
  }

  const handleRateChange = (roomTypeId, rateTypeId) => {
    setSelectedRates(prev => ({
      ...prev,
      [roomTypeId]: rateTypeId
    }))

    // If this room is already selected, update its rate in the cart
    const isRoomSelected = selectedRooms.some(sr => sr.id === roomTypeId)
    if (isRoomSelected) {
      const rateTypes = getRateTypesByRoomType(roomTypeId)
      const selectedRate = rateTypes.find(rt => rt.id === rateTypeId)
      if (selectedRate) {
        updateRoomRate(roomTypeId, rateTypeId, selectedRate.base_price)
      }
    }
  }

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
              onValueChange={(value) => {
                setFilters({ ...filters, source: value })
                // Clear agent selection if source is changed from agent
                if (value !== 'agent') {
                  setSelectedAgent(null)
                }
              }}
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

          {/* Agent Selection - Only show when source is 'agent' */}
          {filters.source === 'agent' && (
            <div className="space-y-2">
              <Label>Select Agent *</Label>
              <div className="flex gap-2">
                <Select
                  value={selectedAgent?.id || ''}
                  onValueChange={(value) => {
                    const agent = agents.find(a => a.id === value)
                    setSelectedAgent(agent)
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddAgentModal(true)}
                  title="Add new agent"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          <div className={`space-y-2 ${filters.source === 'agent' ? 'md:col-span-2' : 'md:col-span-2'}`}>
            <Label>Check-in / Check-out Date *</Label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  {filters.checkIn && filters.checkOut ? (
                    <>
                      {format(new Date(filters.checkIn), 'dd MMM yyyy')} - {format(new Date(filters.checkOut), 'dd MMM yyyy')}
                    </>
                  ) : (
                    <span className="text-muted-foreground">Select date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="space-y-2">
                  <Calendar
                    mode="range"
                    selected={
                      filters.checkIn && filters.checkOut
                        ? {
                            from: new Date(filters.checkIn),
                            to: new Date(filters.checkOut)
                          }
                        : filters.checkIn
                        ? {
                            from: new Date(filters.checkIn),
                            to: undefined
                          }
                        : undefined
                    }
                    onSelect={(range) => {
                      if (range?.from) {
                        const fromDate = format(range.from, 'yyyy-MM-dd')

                        if (range.to) {
                          const toDate = format(range.to, 'yyyy-MM-dd')

                          // Check if check-out is different from check-in
                          if (fromDate === toDate) {
                            // Don't update if same date - keep calendar open
                            setFilters({
                              ...filters,
                              checkIn: fromDate,
                              checkOut: null
                            })
                          } else {
                            // Both dates selected and valid - update and close
                            setFilters({
                              ...filters,
                              checkIn: fromDate,
                              checkOut: toDate
                            })
                            setDateRangeOpen(false)
                          }
                        } else {
                          // Only check-in selected - keep popover open
                          setFilters({
                            ...filters,
                            checkIn: fromDate,
                            checkOut: null
                          })
                        }
                      } else {
                        // Range was cleared
                        setFilters({
                          ...filters,
                          checkIn: null,
                          checkOut: null
                        })
                      }
                    }}
                    numberOfMonths={2}
                    disabled={(date) => {
                      const today = new Date(new Date().setHours(0, 0, 0, 0))
                      // Disable past dates
                      if (date < today) return true

                      // If check-in is selected, disable the same date for check-out
                      if (filters.checkIn) {
                        const checkInDate = new Date(filters.checkIn)
                        checkInDate.setHours(0, 0, 0, 0)

                        // Disable the check-in date to prevent same-day check-out
                        if (date.getTime() === checkInDate.getTime()) {
                          return true
                        }
                      }

                      return false
                    }}
                  />
                  {(filters.checkIn || filters.checkOut) && (
                    <div className="px-3 pb-3 border-t pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFilters({
                            ...filters,
                            checkIn: null,
                            checkOut: null
                          })
                        }}
                        className="w-full"
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
            {/* Left Side: Available Rooms Table */}
            <div className="lg:col-span-2">
              {!hasFiltersApplied ? (
                <div className="bg-white rounded-lg shadow p-8">
                  <div className="text-center text-gray-500">
                    <Search className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-lg font-medium">Apply Filters to View Available Rooms</p>
                    <p className="text-sm mt-2">Please select check-in and check-out dates to see available room types.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Type</th>
                          <th className="text-center p-3 text-sm font-semibold">Capacity</th>
                          <th className="text-center p-3 text-sm font-semibold">Rates</th>
                          <th className="text-center p-3 text-sm font-semibold">Available</th>
                          <th className="text-center p-3 text-sm font-semibold">Quantity</th>
                          <th className="text-center p-3 text-sm font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableRoomTypes.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center p-8 text-gray-500">
                              No rooms available matching your criteria
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
                              <td className="p-3 text-center">
                                <span className="text-gray-600">
                                  {roomType.capacity} {roomType.capacity === 1 ? 'person' : 'people'}
                                </span>
                              </td>
                              <td className="p-3 text-right">
                                {(() => {
                                  const availableRates = getRateTypesByRoomType(roomType.id)
                                  const selectedRate = getSelectedRateForRoomType(roomType.id)

                                  if (availableRates.length === 0) {
                                    return <span className="text-muted-foreground text-sm">No rates defined</span>
                                  }

                                  if (availableRates.length === 1) {
                                    return <span className="font-semibold">₹{selectedRate?.base_price || roomType.base_price}</span>
                                  }

                                  return (
                                    <Select
                                      value={selectedRate?.id || ''}
                                      onValueChange={(value) => handleRateChange(roomType.id, value)}
                                    >
                                      <SelectTrigger className="h-8 w-[200px] ml-auto">
                                        <SelectValue>
                                          {selectedRate ? `₹${selectedRate.base_price} - ${selectedRate.rate_name}` : 'Select rate'}
                                        </SelectValue>
                                      </SelectTrigger>
                                      <SelectContent>
                                        {availableRates.map(rate => (
                                          <SelectItem key={rate.id} value={rate.id}>
                                            ₹{rate.base_price} - {rate.rate_name}
                                            {rate.is_default && ' (Default)'}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )
                                })()}
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
                              <td className="p-3 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  max={roomType.availableCount}
                                  value={getRoomQuantity(roomType.id)}
                                  onChange={(e) => updateRoomTypeQuantity(roomType.id, e.target.value)}
                                  className="w-16 text-center"
                                  placeholder="1"
                                />
                              </td>
                              <td className="p-3 text-center">
                                <Button
                                  onClick={() => handleAddRoom(roomType, getRoomQuantity(roomType.id))}
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
              )}
            </div>

            {/* Right Side: Selected Rooms Cart */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-4">
                {/* Header with Auto Assign All and Meal Plan */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Selected Rooms</h2>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleAutoAssignAll}
                      disabled={selectedRooms.length === 0}
                    >
                      <Shuffle className="h-3 w-3 mr-1" />
                      Auto Assign All
                    </Button>
                  </div>

                  {/* Meal Plan Selection */}
                  {selectedRooms.length > 0 && (
                    <div className="flex items-center gap-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="sameMealPlan"
                          checked={sameMealPlanForAll}
                          onChange={(e) => {
                            setSameMealPlanForAll(e.target.checked)
                            if (e.target.checked) {
                              setMealPlanForAll(globalMealPlan)
                            }
                          }}
                          className="rounded"
                        />
                        <Label htmlFor="sameMealPlan" className="text-sm cursor-pointer">
                          Same Meal Plan for All
                        </Label>
                      </div>
                      {sameMealPlanForAll && (
                        <Select
                          value={globalMealPlan}
                          onValueChange={handleGlobalMealPlanChange}
                        >
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue placeholder="No meal plan" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Meal Plan</SelectItem>
                            {getActivePlans().map(plan => (
                              <SelectItem key={plan.code} value={plan.code}>
                                {plan.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                {selectedRooms.length === 0 ? (
                  <p className="text-gray-500 text-sm">No rooms selected</p>
                ) : (
                  <div className="space-y-4">
                    {selectedRooms.map(room => {
                      const typeAvailableRooms = getAvailableRoomsForType(room.id)
                      return (
                        <div key={room.id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{room.name}</div>
                              <div className="text-sm text-gray-500">
                                ₹{room.ratePrice || room.base_price} × {bill.nights} nights
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

                          {/* Room Number Assignments */}
                          <div className="space-y-2 border-t pt-3">
                            <Label className="text-sm font-medium">Room Assignments *</Label>
                            {Array.from({ length: room.quantity }).map((_, index) => (
                              <div key={index} className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-gray-600 w-12">#{index + 1}</Label>
                                  <Select
                                    value={room.assignedRooms?.[index] || ''}
                                    onValueChange={(value) => {
                                      if (value === 'unassign') {
                                        unassignRoom(room.id, index)
                                      } else {
                                        assignRoom(room.id, value, index)
                                      }
                                    }}
                                  >
                                    <SelectTrigger className={`h-8 text-sm flex-1 ${!room.assignedRooms?.[index] ? 'border-red-300' : ''}`}>
                                      <SelectValue placeholder="Select room *" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassign">
                                        <span className="text-gray-500">Not assigned</span>
                                      </SelectItem>
                                      {typeAvailableRooms.map(r => (
                                        <SelectItem
                                          key={r.id}
                                          value={r.id}
                                          disabled={
                                            room.assignedRooms?.includes(r.id) &&
                                            room.assignedRooms[index] !== r.id
                                          }
                                        >
                                          Room {r.room_number}
                                        </SelectItem>
                                      ))}
                                      {room.assignedRooms?.[index] && (
                                        <SelectItem value={room.assignedRooms[index]}>
                                          Room {availableRooms.find(r => r.id === room.assignedRooms[index])?.room_number}
                                        </SelectItem>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Individual Meal Plan if not using same for all */}
                                {!sameMealPlanForAll && (
                                  <div className="flex items-center gap-2 pl-14">
                                    <Label className="text-xs text-gray-600 w-20">Meal Plan:</Label>
                                    <Select
                                      value={room.mealPlans?.[index] || 'none'}
                                      onValueChange={(value) => setMealPlan(room.id, index, value)}
                                    >
                                      <SelectTrigger className="h-7 text-xs flex-1">
                                        <SelectValue placeholder="No meal plan" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">No Meal Plan</SelectItem>
                                        {getActivePlans().map(plan => (
                                          <SelectItem key={plan.code} value={plan.code}>
                                            {plan.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}

                                {/* Guest Count */}
                                <div className="grid grid-cols-3 gap-2 pl-14 mt-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Adults</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={room.guestCounts?.[index]?.adults || 1}
                                      onChange={(e) => {
                                        const currentCounts = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                                        setGuestCount(room.id, index, {
                                          ...currentCounts,
                                          adults: parseInt(e.target.value) || 1
                                        })
                                      }}
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Children</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={room.guestCounts?.[index]?.children || 0}
                                      onChange={(e) => {
                                        const currentCounts = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                                        setGuestCount(room.id, index, {
                                          ...currentCounts,
                                          children: parseInt(e.target.value) || 0
                                        })
                                      }}
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-600">Infants</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      value={room.guestCounts?.[index]?.infants || 0}
                                      onChange={(e) => {
                                        const currentCounts = room.guestCounts?.[index] || { adults: 1, children: 0, infants: 0 }
                                        setGuestCount(room.id, index, {
                                          ...currentCounts,
                                          infants: parseInt(e.target.value) || 0
                                        })
                                      }}
                                      className="h-7 text-xs"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
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
          {bill.totalDiscount > 0 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Original Amount:</span>
                <span className="text-gray-500 line-through">₹{bill.subtotalBeforeDiscount.toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-600">Discount:</span>
                <span className="font-semibold text-green-600">-₹{bill.totalDiscount.toFixed(2)}</span>
              </div>
            </>
          )}
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
      <div className="sticky bottom-0 z-10 bg-white border-t px-6 py-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            {selectedRooms.length > 0 && !allRoomsAssigned && (
              <p className="text-sm text-red-600">
                ⚠ Please assign room numbers to all selected rooms before proceeding
              </p>
            )}
            {filters.source === 'agent' && !selectedAgent && (
              <p className="text-sm text-red-600">
                ⚠ Please select an agent before proceeding
              </p>
            )}
          </div>
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

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={showAddAgentModal}
        onClose={() => setShowAddAgentModal(false)}
        onAgentAdded={handleAgentAdded}
      />
    </div>
  )
}
