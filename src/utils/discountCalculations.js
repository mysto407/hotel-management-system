// src/utils/discountCalculations.js
// Utility functions for calculating discounts

/**
 * Calculate discount amount based on discount type and value
 * @param {Object} discount - The discount object
 * @param {number} originalAmount - The original amount before discount
 * @returns {number} - The discount amount
 */
export const calculateDiscountAmount = (discount, originalAmount) => {
    if (!discount || !originalAmount) return 0

    let discountAmount = 0

    switch (discount.discount_type) {
        case 'percentage':
            discountAmount = (originalAmount * discount.value) / 100
            break
        case 'fixed_amount':
        case 'promo_code':
        case 'seasonal':
        case 'long_stay':
            // For fixed amount, check if discount value is percentage or fixed
            if (discount.value <= 100 && discount.discount_type !== 'fixed_amount') {
                // Treat as percentage
                discountAmount = (originalAmount * discount.value) / 100
            } else {
                // Treat as fixed amount
                discountAmount = Math.min(discount.value, originalAmount)
            }
            break
        default:
            discountAmount = 0
    }

    // Ensure discount doesn't exceed original amount
    return Math.min(Math.round(discountAmount * 100) / 100, originalAmount)
}

/**
 * Calculate final amount after applying discount
 * @param {number} originalAmount - The original amount before discount
 * @param {number} discountAmount - The discount amount
 * @returns {number} - The final amount after discount
 */
export const calculateFinalAmount = (originalAmount, discountAmount) => {
    const finalAmount = originalAmount - discountAmount
    return Math.max(0, Math.round(finalAmount * 100) / 100)
}

/**
 * Apply multiple discounts to an amount
 * @param {number} originalAmount - The original amount before discounts
 * @param {Array} discounts - Array of discount objects
 * @param {Object} options - Options for discount application
 * @returns {Object} - Object containing breakdown of discounts
 */
export const applyMultipleDiscounts = (originalAmount, discounts, options = {}) => {
    if (!discounts || discounts.length === 0) {
        return {
            originalAmount,
            totalDiscount: 0,
            finalAmount: originalAmount,
            appliedDiscounts: []
        }
    }

    // Sort by priority (highest first)
    const sortedDiscounts = [...discounts].sort((a, b) => b.priority - a.priority)

    let currentAmount = originalAmount
    let totalDiscount = 0
    const appliedDiscounts = []

    for (const discount of sortedDiscounts) {
        // Check if discount can be combined
        if (appliedDiscounts.length > 0 && !discount.can_combine) {
            continue // Skip if this discount can't be combined
        }

        const discountAmount = calculateDiscountAmount(discount, currentAmount)

        if (discountAmount > 0) {
            appliedDiscounts.push({
                id: discount.id,
                name: discount.name,
                type: discount.discount_type,
                value: discount.value,
                amount: discountAmount,
                priority: discount.priority
            })

            totalDiscount += discountAmount
            currentAmount = calculateFinalAmount(currentAmount, discountAmount)

            // If this discount can't be combined, stop here
            if (!discount.can_combine) {
                break
            }
        }
    }

    return {
        originalAmount,
        totalDiscount: Math.round(totalDiscount * 100) / 100,
        finalAmount: Math.round(currentAmount * 100) / 100,
        appliedDiscounts
    }
}

/**
 * Check if a discount is currently valid
 * @param {Object} discount - The discount object
 * @param {Date} checkDate - The date to check against (defaults to today)
 * @returns {boolean} - Whether the discount is valid
 */
export const isDiscountValid = (discount, checkDate = new Date()) => {
    if (!discount || !discount.enabled) return false

    const today = checkDate.toISOString().split('T')[0]

    // Check valid_from
    if (discount.valid_from) {
        if (today < discount.valid_from) return false
    }

    // Check valid_to
    if (discount.valid_to) {
        if (today > discount.valid_to) return false
    }

    // Check maximum uses
    if (discount.maximum_uses) {
        if (discount.current_uses >= discount.maximum_uses) return false
    }

    return true
}

/**
 * Check if a discount applies to a specific room type
 * @param {Object} discount - The discount object
 * @param {string} roomTypeId - The room type ID
 * @returns {boolean} - Whether the discount applies
 */
export const discountAppliesTo = (discount, roomTypeId) => {
    if (!discount) return false

    const applicableRoomTypes = discount.applicable_room_types || []

    // Empty array means applies to all room types
    if (applicableRoomTypes.length === 0) return true

    return applicableRoomTypes.includes(roomTypeId)
}

/**
 * Filter discounts based on reservation criteria
 * @param {Array} discounts - Array of discount objects
 * @param {Object} criteria - Criteria object
 * @returns {Array} - Filtered array of applicable discounts
 */
export const filterApplicableDiscounts = (discounts, criteria) => {
    const {
        checkInDate,
        checkOutDate,
        roomTypeId,
        nights,
        promoCode
    } = criteria

    return discounts.filter(discount => {
        // Must be enabled
        if (!discount.enabled) return false

        // Check validity period
        if (!isDiscountValid(discount, new Date(checkInDate))) return false

        // Check minimum nights
        if (discount.minimum_nights > nights) return false

        // Check room type applicability
        if (roomTypeId && !discountAppliesTo(discount, roomTypeId)) return false

        // If promo code is provided, only include that discount
        if (promoCode) {
            return discount.promo_code === promoCode
        }

        // Don't auto-apply promo code discounts
        if (discount.discount_type === 'promo_code') return false

        return true
    })
}

/**
 * Calculate room rate with discount
 * @param {number} baseRate - The base room rate
 * @param {number} nights - Number of nights
 * @param {Array} discounts - Array of applicable discounts
 * @param {string} appliesTo - Where discount applies ('room_rates', 'addons', 'total_bill')
 * @returns {Object} - Object with rate breakdown
 */
export const calculateRoomRateWithDiscount = (baseRate, nights, discounts, appliesTo = 'room_rates') => {
    const originalSubtotal = baseRate * nights

    // Filter discounts that apply to room rates
    const applicableDiscounts = discounts.filter(d => d.applies_to === appliesTo)

    const discountResult = applyMultipleDiscounts(originalSubtotal, applicableDiscounts)

    return {
        baseRate,
        nights,
        originalSubtotal,
        discounts: discountResult.appliedDiscounts,
        totalDiscount: discountResult.totalDiscount,
        subtotalAfterDiscount: discountResult.finalAmount
    }
}

/**
 * Format discount for display
 * @param {Object} discount - The discount object
 * @returns {string} - Formatted discount string
 */
export const formatDiscount = (discount) => {
    if (!discount) return ''

    if (discount.discount_type === 'percentage') {
        return `${discount.value}% off`
    } else {
        return `₹${discount.value} off`
    }
}

/**
 * Get discount badge color based on type
 * @param {string} discountType - The discount type
 * @returns {string} - Tailwind color class
 */
export const getDiscountBadgeColor = (discountType) => {
    const colors = {
        percentage: 'bg-blue-100 text-blue-800',
        fixed_amount: 'bg-green-100 text-green-800',
        promo_code: 'bg-purple-100 text-purple-800',
        seasonal: 'bg-orange-100 text-orange-800',
        long_stay: 'bg-indigo-100 text-indigo-800'
    }
    return colors[discountType] || 'bg-gray-100 text-gray-800'
}
