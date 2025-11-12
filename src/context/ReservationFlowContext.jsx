import { createContext, useContext, useState, useCallback } from 'react'

const ReservationFlowContext = createContext()

export function useReservationFlow() {
  const context = useContext(ReservationFlowContext)
  if (!context) {
    throw new Error('useReservationFlow must be used within ReservationFlowProvider')
  }
  return context
}

export function ReservationFlowProvider({ children }) {
  // Step 1: Availability & Room Selection
  const [filters, setFilters] = useState({
    checkIn: null,
    checkOut: null,
    source: 'walk-in',
    promoCode: '',
    searchQuery: ''
  })

  const [selectedRooms, setSelectedRooms] = useState([])
  const [addons, setAddons] = useState([])

  // Step 2: Guest Details
  const [guestDetails, setGuestDetails] = useState({
    name: '',
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
    photoUrl: null,
    adults: 1,
    children: 0,
    infants: 0
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
            ? { ...r, quantity: r.quantity + quantity }
            : r
        )
      }
      return [...prev, { ...room, quantity }]
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
      prev.map(r => r.id === roomId ? { ...r, quantity } : r)
    )
  }, [removeRoom])

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
        balanceDue: 0
      }
    }

    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

    // Calculate room charges
    const roomSubtotal = selectedRooms.reduce((sum, room) => {
      const roomTotal = (room.base_price || 0) * nights * room.quantity
      return sum + roomTotal
    }, 0)

    // Calculate addon charges
    const addonSubtotal = addons.reduce((sum, addon) => {
      return sum + (addon.price || 0) * (addon.quantity || 1)
    }, 0)

    const subtotal = roomSubtotal + addonSubtotal
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
      balanceDue
    }
  }, [filters, selectedRooms, addons, paymentInfo.amount])

  // Reset flow
  const resetFlow = useCallback(() => {
    setFilters({
      checkIn: null,
      checkOut: null,
      source: 'walk-in',
      promoCode: '',
      searchQuery: ''
    })
    setSelectedRooms([])
    setAddons([])
    setGuestDetails({
      name: '',
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
      photoUrl: null,
      adults: 1,
      children: 0,
      infants: 0
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
    selectedRooms,
    addons,
    guestDetails,
    paymentInfo,

    // Setters
    setFilters,
    setGuestDetails,
    setPaymentInfo,

    // Room handlers
    addRoom,
    removeRoom,
    updateRoomQuantity,

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
