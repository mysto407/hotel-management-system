import { createContext, useContext, useState, useCallback } from 'react'
import { useMealPlans } from './MealPlanContext'

const ReservationFlowContext = createContext()

export function useReservationFlow() {
  const context = useContext(ReservationFlowContext)
  if (!context) {
    throw new Error('useReservationFlow must be used within ReservationFlowProvider')
  }
  return context
}

export function ReservationFlowProvider({ children }) {
  const { getMealPlanPrice } = useMealPlans()

  // Step 1: Availability & Room Selection
  const [filters, setFilters] = useState({
    checkIn: null,
    checkOut: null,
    source: 'walk-in',
    promoCode: '',
    searchQuery: ''
  })

  const [selectedAgent, setSelectedAgent] = useState(null)
  const [selectedRooms, setSelectedRooms] = useState([])
  const [addons, setAddons] = useState([])

  // Step 2: Guest Details
  const [guestDetails, setGuestDetails] = useState({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    idType: 'N/A',
    idNumber: '',
    photo: null,
    photoUrl: null
  })

  // Step 3: Payment
  const [paymentInfo, setPaymentInfo] = useState({
    paymentType: 'cash',
    amount: 0,
    notes: ''
  })

  // Room selection handlers
  const addRoom = useCallback((room, quantity = 1) => {
    setSelectedRooms(prev => {
      const existing = prev.find(r => r.id === room.id)
      if (existing) {
        return prev.map(r =>
          r.id === room.id
            ? { ...r, quantity: r.quantity + quantity, assignedRooms: r.assignedRooms || [], mealPlans: r.mealPlans || [], guestCounts: r.guestCounts || [] }
            : r
        )
      }
      return [...prev, { ...room, quantity, assignedRooms: [], mealPlans: [], guestCounts: [] }]
    })
  }, [])

  const removeRoom = useCallback((roomId) => {
    setSelectedRooms(prev => prev.filter(r => r.id !== roomId))
  }, [])

  const updateRoomQuantity = useCallback((roomId, quantity) => {
    if (quantity <= 0) {
      removeRoom(roomId)
      return
    }
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomId) {
          // Trim assigned rooms, meal plans, and guest counts if quantity decreased
          const assignedRooms = (r.assignedRooms || []).slice(0, quantity)
          const mealPlans = (r.mealPlans || []).slice(0, quantity)
          const guestCounts = (r.guestCounts || []).slice(0, quantity)
          return { ...r, quantity, assignedRooms, mealPlans, guestCounts }
        }
        return r
      })
    )
  }, [removeRoom])

  // Room assignment handlers
  const assignRoom = useCallback((roomTypeId, roomId, index) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomTypeId) {
          const assignedRooms = [...(r.assignedRooms || [])]
          assignedRooms[index] = roomId
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  const unassignRoom = useCallback((roomTypeId, index) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomTypeId) {
          const assignedRooms = [...(r.assignedRooms || [])]
          assignedRooms[index] = null
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  const autoAssignRooms = useCallback((roomTypeId, availableRoomIds) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomTypeId) {
          // Auto-assign available rooms up to the quantity
          const assignedRooms = availableRoomIds.slice(0, r.quantity)
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  // Meal plan handlers
  const setMealPlan = useCallback((roomTypeId, index, mealPlan) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomTypeId) {
          const mealPlans = [...(r.mealPlans || [])]
          mealPlans[index] = mealPlan
          return { ...r, mealPlans }
        }
        return r
      })
    )
  }, [])

  const setMealPlanForAll = useCallback((mealPlan) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        const mealPlans = Array(r.quantity).fill(mealPlan)
        return { ...r, mealPlans }
      })
    )
  }, [])

  // Guest count handlers
  const setGuestCount = useCallback((roomTypeId, index, guestCount) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.id === roomTypeId) {
          const guestCounts = [...(r.guestCounts || [])]
          guestCounts[index] = guestCount
          return { ...r, guestCounts }
        }
        return r
      })
    )
  }, [])

  const setGuestCountForAll = useCallback((guestCount) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        const guestCounts = Array(r.quantity).fill(guestCount)
        return { ...r, guestCounts }
      })
    )
  }, [])

  // Addon handlers
  const addAddon = useCallback((addon) => {
    setAddons(prev => [...prev, { ...addon, id: Date.now() }])
  }, [])

  const updateAddon = useCallback((addonId, updatedAddon) => {
    setAddons(prev => prev.map(a => a.id === addonId ? { ...a, ...updatedAddon } : a))
  }, [])

  const removeAddon = useCallback((addonId) => {
    setAddons(prev => prev.filter(a => a.id !== addonId))
  }, [])

  // Bill calculation
  const calculateBill = useCallback(() => {
    const checkIn = filters.checkIn ? new Date(filters.checkIn) : null
    const checkOut = filters.checkOut ? new Date(filters.checkOut) : null

    if (!checkIn || !checkOut) {
      return {
        subtotal: 0,
        tax: 0,
        total: 0,
        nights: 0,
        suggestedDeposit: 0,
        balanceDue: 0,
        mealPlanSubtotal: 0
      }
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

    // Calculate room charges
    const roomSubtotal = selectedRooms.reduce((sum, room) => {
      const roomTotal = (room.base_price || 0) * nights * room.quantity
      return sum + roomTotal
    }, 0)

    // Calculate meal plan charges
    const mealPlanSubtotal = selectedRooms.reduce((sum, room) => {
      let roomMealPlanTotal = 0

      // Calculate for each room instance
      for (let i = 0; i < room.quantity; i++) {
        const mealPlanCode = room.mealPlans?.[i] || 'none'
        const guestCount = room.guestCounts?.[i] || { adults: 1, children: 0, infants: 0 }

        // Calculate total guests (adults + children, excluding infants)
        const totalGuests = (guestCount.adults || 1) + (guestCount.children || 0)

        // Get price per person per day for this meal plan (0 if no meal plan)
        const pricePerPerson = (mealPlanCode && mealPlanCode !== 'none') ? getMealPlanPrice(mealPlanCode) : 0

        // Calculate total meal plan cost for this room
        roomMealPlanTotal += pricePerPerson * totalGuests * nights
      }

      return sum + roomMealPlanTotal
    }, 0)

    // Calculate addon charges
    const addonSubtotal = addons.reduce((sum, addon) => {
      return sum + (addon.price || 0) * (addon.quantity || 1)
    }, 0)

    const subtotal = roomSubtotal + mealPlanSubtotal + addonSubtotal
    const tax = subtotal * 0.18 // 18% GST
    const total = subtotal + tax
    const suggestedDeposit = total * 0.3 // 30% suggested deposit
    const balanceDue = total - (paymentInfo.amount || 0)

    return {
      subtotal,
      tax,
      total,
      nights,
      suggestedDeposit,
      balanceDue,
      mealPlanSubtotal
    }
  }, [filters, selectedRooms, addons, paymentInfo.amount, getMealPlanPrice])

  // Reset flow
  const resetFlow = useCallback(() => {
    setFilters({
      checkIn: null,
      checkOut: null,
      source: 'walk-in',
      promoCode: '',
      searchQuery: ''
    })
    setSelectedAgent(null)
    setSelectedRooms([])
    setAddons([])
    setGuestDetails({
      firstName: '',
      surname: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      country: '',
      pincode: '',
      idType: 'N/A',
      idNumber: '',
      photo: null,
      photoUrl: null
    })
    setPaymentInfo({
      paymentType: 'cash',
      amount: 0,
      notes: ''
    })
  }, [])

  const value = {
    // State
    filters,
    selectedAgent,
    selectedRooms,
    addons,
    guestDetails,
    paymentInfo,

    // Setters
    setFilters,
    setSelectedAgent,
    setGuestDetails,
    setPaymentInfo,

    // Room handlers
    addRoom,
    removeRoom,
    updateRoomQuantity,
    assignRoom,
    unassignRoom,
    autoAssignRooms,
    setMealPlan,
    setMealPlanForAll,
    setGuestCount,
    setGuestCountForAll,

    // Addon handlers
    addAddon,
    updateAddon,
    removeAddon,

    // Utilities
    calculateBill,
    resetFlow
  }

  return (
    <ReservationFlowContext.Provider value={value}>
      {children}
    </ReservationFlowContext.Provider>
  )
}
