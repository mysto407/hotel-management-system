import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useMealPlans } from './MealPlanContext'
import { useDiscounts } from './DiscountContext'
import { applyMultipleDiscounts } from '../utils/discountCalculations'
import { getTotalTaxRate } from '../lib/supabase'

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
  const { validatePromoCode } = useDiscounts()

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
  const [selectedDiscounts, setSelectedDiscounts] = useState([])
  const [appliedPromoCode, setAppliedPromoCode] = useState(null)

  // Assign Later mode - when true, rooms are booked by type only (no specific room assigned)
  const [assignLater, setAssignLater] = useState(true)

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
    photoUrl: null,
    assignedRoomId: ''
  })

  // Multiple guests support (allGuestsDetails[0] is always the primary guest)
  const [allGuestsDetails, setAllGuestsDetails] = useState([])

  // Step 3: Payment
  const [paymentInfo, setPaymentInfo] = useState({
    paymentType: 'cash',
    amount: 0,
    notes: ''
  })

  // Tax rates from tax_configurations (loaded dynamically)
  const [taxRate, setTaxRate] = useState(18) // Default 18% for rooms/addons
  const [foodTaxRate, setFoodTaxRate] = useState(5) // Default 5% for food/meal plans

  // Load dynamic tax rates from tax_configurations
  useEffect(() => {
    const loadTaxRates = async () => {
      const { rate: roomRate } = await getTotalTaxRate('room_charge')
      const { rate: foodRate } = await getTotalTaxRate('food')
      if (roomRate > 0) setTaxRate(roomRate)
      if (foodRate > 0) setFoodTaxRate(foodRate)
    }
    loadTaxRates()
  }, [])

  // Room selection handlers
  const addRoom = useCallback((room, quantity = 1, rateTypeId = null, checkIn = null, checkOut = null) => {
    setSelectedRooms(prev => {
      // Create a unique key based on room type, rate, and date range
      const cartKey = `${room.id}_${checkIn}_${checkOut}_${rateTypeId || 'default'}`
      const existing = prev.find(r => r.cartKey === cartKey)

      if (existing) {
        return prev.map(r =>
          r.cartKey === cartKey
            ? {
                ...r,
                quantity: r.quantity + quantity,
                assignedRooms: r.assignedRooms || [],
                mealPlans: r.mealPlans || [],
                guestCounts: r.guestCounts || []
              }
            : r
        )
      }
      return [...prev, {
        ...room,
        cartKey,
        quantity,
        checkIn,
        checkOut,
        assignedRooms: [],
        mealPlans: [],
        guestCounts: [],
        rateTypeId: rateTypeId || null,
        ratePrice: room.ratePrice || room.base_price
      }]
    })
  }, [])

  const removeRoom = useCallback((cartKey) => {
    setSelectedRooms(prev => prev.filter(r => r.cartKey !== cartKey))
  }, [])

  const clearSelectedRooms = useCallback(() => {
    setSelectedRooms([])
  }, [])

  const updateRoomQuantity = useCallback((cartKey, quantity) => {
    if (quantity <= 0) {
      removeRoom(cartKey)
      return
    }
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
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

  const updateRoomRate = useCallback((cartKey, rateTypeId, ratePrice) => {
    setSelectedRooms(prev =>
      prev.map(r =>
        r.cartKey === cartKey
          ? { ...r, rateTypeId, ratePrice }
          : r
      )
    )
  }, [])

  // Room assignment handlers
  const assignRoom = useCallback((cartKey, roomId, index) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
          const assignedRooms = [...(r.assignedRooms || [])]
          assignedRooms[index] = roomId
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  const unassignRoom = useCallback((cartKey, index) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
          const assignedRooms = [...(r.assignedRooms || [])]
          assignedRooms[index] = null
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  const autoAssignRooms = useCallback((cartKey, availableRoomIds) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
          // Auto-assign available rooms up to the quantity
          const assignedRooms = availableRoomIds.slice(0, r.quantity)
          return { ...r, assignedRooms }
        }
        return r
      })
    )
  }, [])

  // Meal plan handlers
  const setMealPlan = useCallback((cartKey, index, mealPlan) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
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
  const setGuestCount = useCallback((cartKey, index, guestCount) => {
    setSelectedRooms(prev =>
      prev.map(r => {
        if (r.cartKey === cartKey) {
          const guestCounts = [...(r.guestCounts || [])]
          // Merge with existing guest count to preserve other fields (adults/children/infants)
          const currentCount = guestCounts[index] || { adults: 1, children: 0, infants: 0 }
          guestCounts[index] = { ...currentCount, ...guestCount }
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

  // Discount handlers
  const addDiscount = useCallback((discount) => {
    setSelectedDiscounts(prev => {
      // Check if discount already exists
      if (prev.some(d => d.id === discount.id)) {
        return prev
      }
      return [...prev, discount]
    })
  }, [])

  const removeDiscount = useCallback((discountId) => {
    setSelectedDiscounts(prev => prev.filter(d => d.id !== discountId))
    // If removing promo code, clear it
    if (appliedPromoCode?.id === discountId) {
      setAppliedPromoCode(null)
    }
  }, [appliedPromoCode])

  const applyPromoCode = useCallback(async (promoCode) => {
    const result = await validatePromoCode(promoCode)
    if (result.valid) {
      setAppliedPromoCode(result.discount)
      addDiscount(result.discount)
      return { success: true, discount: result.discount }
    } else {
      return { success: false, error: result.error }
    }
  }, [validatePromoCode, addDiscount])

  const clearDiscounts = useCallback(() => {
    setSelectedDiscounts([])
    setAppliedPromoCode(null)
  }, [])

  // Bill calculation
  const calculateBill = useCallback(() => {
    // If no rooms selected, return empty bill
    if (selectedRooms.length === 0) {
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

    // Calculate total nights across all date ranges (for display purposes)
    const totalNights = selectedRooms.reduce((sum, room) => {
      if (!room.checkIn || !room.checkOut) return sum
      const checkIn = new Date(room.checkIn)
      const checkOut = new Date(room.checkOut)
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
      return sum + (nights * room.quantity)
    }, 0)

    // Calculate room charges using selected rate price
    const roomSubtotal = selectedRooms.reduce((sum, room) => {
      if (!room.checkIn || !room.checkOut) return sum

      const checkIn = new Date(room.checkIn)
      const checkOut = new Date(room.checkOut)
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

      const roomTotal = (room.ratePrice || room.base_price || 0) * nights * room.quantity
      return sum + roomTotal
    }, 0)

    // Calculate meal plan charges
    const mealPlanSubtotal = selectedRooms.reduce((sum, room) => {
      if (!room.checkIn || !room.checkOut) return sum

      const checkIn = new Date(room.checkIn)
      const checkOut = new Date(room.checkOut)
      const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))

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

    const subtotalBeforeDiscount = roomSubtotal + mealPlanSubtotal + addonSubtotal

    // Apply discounts
    const roomRateDiscounts = selectedDiscounts.filter(d => d.applies_to === 'room_rates')
    const addonDiscounts = selectedDiscounts.filter(d => d.applies_to === 'addons')
    const totalBillDiscounts = selectedDiscounts.filter(d => d.applies_to === 'total_bill')

    // Calculate discounts for each category
    const roomDiscountResult = applyMultipleDiscounts(roomSubtotal, roomRateDiscounts)
    const addonDiscountResult = applyMultipleDiscounts(addonSubtotal, addonDiscounts)

    // Calculate subtotal after room and addon discounts
    const subtotalAfterCategoryDiscounts =
      roomDiscountResult.finalAmount +
      mealPlanSubtotal +
      addonDiscountResult.finalAmount

    // Apply total bill discounts on the final subtotal
    const totalBillDiscountResult = applyMultipleDiscounts(
      subtotalAfterCategoryDiscounts,
      totalBillDiscounts
    )

    const subtotal = totalBillDiscountResult.finalAmount
    const totalDiscount =
      roomDiscountResult.totalDiscount +
      addonDiscountResult.totalDiscount +
      totalBillDiscountResult.totalDiscount

    const tax = subtotal * (taxRate / 100) // Dynamic tax from tax_configurations
    const total = subtotal + tax
    const suggestedDeposit = total * 0.3 // 30% suggested deposit
    const balanceDue = total - (paymentInfo.amount || 0)

    return {
      subtotalBeforeDiscount,
      subtotal,
      totalDiscount,
      discountBreakdown: {
        roomDiscounts: roomDiscountResult.appliedDiscounts,
        addonDiscounts: addonDiscountResult.appliedDiscounts,
        totalBillDiscounts: totalBillDiscountResult.appliedDiscounts
      },
      tax,
      taxRate, // Include tax rate for display
      total,
      nights: totalNights,
      suggestedDeposit,
      balanceDue,
      mealPlanSubtotal
    }
  }, [selectedRooms, addons, selectedDiscounts, paymentInfo.amount, getMealPlanPrice, taxRate])

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
    setSelectedDiscounts([])
    setAppliedPromoCode(null)
    setAssignLater(false)
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
      photoUrl: null,
      assignedRoomId: ''
    })
    setAllGuestsDetails([]) // Clear all guests array
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
    selectedDiscounts,
    appliedPromoCode,
    assignLater,
    guestDetails,
    allGuestsDetails,
    paymentInfo,

    // Setters
    setFilters,
    setSelectedAgent,
    setAssignLater,
    setGuestDetails,
    setAllGuestsDetails,
    setPaymentInfo,

    // Room handlers
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

    // Addon handlers
    addAddon,
    updateAddon,
    removeAddon,

    // Discount handlers
    addDiscount,
    removeDiscount,
    applyPromoCode,
    clearDiscounts,

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
