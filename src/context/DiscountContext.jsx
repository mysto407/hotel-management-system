// src/context/DiscountContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getDiscounts,
  getActiveDiscounts,
  getDiscountByPromoCode,
  getApplicableDiscounts as getApplicableDiscountsAPI,
  createDiscount as createDiscountAPI,
  updateDiscount as updateDiscountAPI,
  deleteDiscount as deleteDiscountAPI,
  toggleDiscountStatus as toggleDiscountStatusAPI,
  getDiscountApplicationsByReservation,
  getDiscountApplicationsByBill,
  createDiscountApplication as createDiscountApplicationAPI,
  deleteDiscountApplication as deleteDiscountApplicationAPI
} from '../lib/supabase';
import { useAlert } from './AlertContext';
import {
  calculateDiscountAmount,
  applyMultipleDiscounts,
  filterApplicableDiscounts,
  isDiscountValid,
  calculateRoomRateWithDiscount
} from '../utils/discountCalculations';

const DiscountContext = createContext();

export const useDiscounts = () => {
  const context = useContext(DiscountContext);
  if (!context) throw new Error('useDiscounts must be used within DiscountProvider');
  return context;
};

export const DiscountProvider = ({ children }) => {
  const { error: showError, success: showSuccess } = useAlert();
  const [discounts, setDiscounts] = useState([]);
  const [activeDiscounts, setActiveDiscounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([loadDiscounts(), loadActiveDiscounts()]);
    setLoading(false);
  };

  const loadDiscounts = async () => {
    try {
      const { data, error } = await getDiscounts();
      if (error) throw error;
      setDiscounts(data || []);
    } catch (error) {
      console.error('Error loading discounts:', error);
      showError('Failed to load discounts: ' + error.message);
    }
  };

  const loadActiveDiscounts = async () => {
    try {
      const { data, error } = await getActiveDiscounts();
      if (error) throw error;
      setActiveDiscounts(data || []);
    } catch (error) {
      console.error('Error loading active discounts:', error);
      showError('Failed to load active discounts: ' + error.message);
    }
  };

  // Discount Operations
  const addDiscount = async (discount) => {
    try {
      // Ensure all field names are in snake_case
      const discountData = {
        name: discount.name,
        description: discount.description || '',
        discount_type: discount.discount_type,
        value: parseFloat(discount.value),
        applies_to: discount.applies_to || 'room_rates',
        enabled: discount.enabled !== undefined ? discount.enabled : true,
        valid_from: discount.valid_from || null,
        valid_to: discount.valid_to || null,
        applicable_room_types: discount.applicable_room_types || [],
        promo_code: discount.promo_code || null,
        minimum_nights: parseInt(discount.minimum_nights) || 0,
        maximum_uses: discount.maximum_uses ? parseInt(discount.maximum_uses) : null,
        current_uses: 0,
        priority: parseInt(discount.priority) || 0,
        can_combine: discount.can_combine !== undefined ? discount.can_combine : false
      };

      const { data, error } = await createDiscountAPI(discountData);
      if (error) throw error;

      if (data && data.length > 0) {
        setDiscounts([...discounts, data[0]]);
        if (data[0].enabled) {
          setActiveDiscounts([...activeDiscounts, data[0]]);
        }
        showSuccess('Discount created successfully');
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error creating discount:', error);

      // Check for duplicate promo code
      if (error.code === '23505' || error.message.includes('duplicate')) {
        showError('Promo code already exists. Please use a different code.');
      } else {
        showError('Failed to create discount: ' + error.message);
      }
      return null;
    }
  };

  const updateDiscount = async (id, updatedDiscount) => {
    try {
      // Ensure all field names are in snake_case
      const discountData = {
        name: updatedDiscount.name,
        description: updatedDiscount.description || '',
        discount_type: updatedDiscount.discount_type,
        value: parseFloat(updatedDiscount.value),
        applies_to: updatedDiscount.applies_to || 'room_rates',
        enabled: updatedDiscount.enabled !== undefined ? updatedDiscount.enabled : true,
        valid_from: updatedDiscount.valid_from || null,
        valid_to: updatedDiscount.valid_to || null,
        applicable_room_types: updatedDiscount.applicable_room_types || [],
        promo_code: updatedDiscount.promo_code || null,
        minimum_nights: parseInt(updatedDiscount.minimum_nights) || 0,
        maximum_uses: updatedDiscount.maximum_uses ? parseInt(updatedDiscount.maximum_uses) : null,
        priority: parseInt(updatedDiscount.priority) || 0,
        can_combine: updatedDiscount.can_combine !== undefined ? updatedDiscount.can_combine : false
      };

      const { data, error } = await updateDiscountAPI(id, discountData);
      if (error) throw error;

      if (data && data.length > 0) {
        setDiscounts(discounts.map(d => d.id === id ? data[0] : d));
        setActiveDiscounts(activeDiscounts.map(d => d.id === id ? data[0] : d).filter(d => d.enabled));
        showSuccess('Discount updated successfully');
        return data[0];
      }
      return null;
    } catch (error) {
      console.error('Error updating discount:', error);

      // Check for duplicate promo code
      if (error.code === '23505' || error.message.includes('duplicate')) {
        showError('Promo code already exists. Please use a different code.');
      } else {
        showError('Failed to update discount: ' + error.message);
      }
      return null;
    }
  };

  const deleteDiscount = async (id) => {
    try {
      const { error } = await deleteDiscountAPI(id);
      if (error) {
        // Check if it's a foreign key constraint error
        if (error.code === '23503' || error.message.includes('foreign key')) {
          showError('Cannot delete discount. It has been applied to existing reservations.');
        } else {
          throw error;
        }
        return false;
      }

      setDiscounts(discounts.filter(d => d.id !== id));
      setActiveDiscounts(activeDiscounts.filter(d => d.id !== id));
      showSuccess('Discount deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting discount:', error);
      showError('Failed to delete discount: ' + error.message);
      return false;
    }
  };

  const toggleDiscountStatus = async (id, enabled) => {
    try {
      const { data, error } = await toggleDiscountStatusAPI(id, enabled);
      if (error) throw error;

      if (data && data.length > 0) {
        setDiscounts(discounts.map(d => d.id === id ? { ...d, enabled } : d));

        if (enabled) {
          setActiveDiscounts([...activeDiscounts, data[0]]);
        } else {
          setActiveDiscounts(activeDiscounts.filter(d => d.id !== id));
        }

        showSuccess(`Discount ${enabled ? 'enabled' : 'disabled'} successfully`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error toggling discount status:', error);
      showError('Failed to toggle discount status: ' + error.message);
      return false;
    }
  };

  // Discount Application Operations
  const applyDiscountToReservation = async (reservationId, discountId, originalAmount) => {
    try {
      const discount = discounts.find(d => d.id === discountId);
      if (!discount) {
        showError('Discount not found');
        return null;
      }

      const discountAmount = calculateDiscountAmount(discount, originalAmount);
      const finalAmount = originalAmount - discountAmount;

      const applicationData = {
        discount_id: discountId,
        reservation_id: reservationId,
        bill_id: null,
        discount_amount: discountAmount,
        original_amount: originalAmount,
        final_amount: finalAmount
      };

      const { data, error } = await createDiscountApplicationAPI(applicationData);
      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error applying discount:', error);
      showError('Failed to apply discount: ' + error.message);
      return null;
    }
  };

  const applyDiscountToBill = async (billId, discountId, originalAmount) => {
    try {
      const discount = discounts.find(d => d.id === discountId);
      if (!discount) {
        showError('Discount not found');
        return null;
      }

      const discountAmount = calculateDiscountAmount(discount, originalAmount);
      const finalAmount = originalAmount - discountAmount;

      const applicationData = {
        discount_id: discountId,
        reservation_id: null,
        bill_id: billId,
        discount_amount: discountAmount,
        original_amount: originalAmount,
        final_amount: finalAmount
      };

      const { data, error } = await createDiscountApplicationAPI(applicationData);
      if (error) throw error;

      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error applying discount to bill:', error);
      showError('Failed to apply discount to bill: ' + error.message);
      return null;
    }
  };

  const removeDiscountApplication = async (applicationId) => {
    try {
      const { error } = await deleteDiscountApplicationAPI(applicationId);
      if (error) throw error;

      showSuccess('Discount removed successfully');
      return true;
    } catch (error) {
      console.error('Error removing discount:', error);
      showError('Failed to remove discount: ' + error.message);
      return false;
    }
  };

  // Helper functions
  const getDiscountById = (discountId) => {
    return discounts.find(d => d.id === discountId);
  };

  const validatePromoCode = async (promoCode) => {
    try {
      const { data, error } = await getDiscountByPromoCode(promoCode);
      if (error || !data) {
        return { valid: false, error: 'Invalid promo code' };
      }

      if (!isDiscountValid(data)) {
        return { valid: false, error: 'Promo code has expired or is no longer valid' };
      }

      return { valid: true, discount: data };
    } catch (error) {
      console.error('Error validating promo code:', error);
      return { valid: false, error: 'Failed to validate promo code' };
    }
  };

  const getApplicableDiscounts = async (checkInDate, checkOutDate, roomTypeId, nights) => {
    try {
      const { data, error } = await getApplicableDiscountsAPI(
        checkInDate,
        checkOutDate,
        roomTypeId,
        nights
      );
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting applicable discounts:', error);
      return [];
    }
  };

  const calculateDiscounts = (originalAmount, applicableDiscounts) => {
    return applyMultipleDiscounts(originalAmount, applicableDiscounts);
  };

  const calculateRoomRate = (baseRate, nights, applicableDiscounts, appliesTo = 'room_rates') => {
    return calculateRoomRateWithDiscount(baseRate, nights, applicableDiscounts, appliesTo);
  };

  const getDiscountStats = () => {
    const now = new Date();
    return {
      total: discounts.length,
      active: discounts.filter(d => d.enabled && isDiscountValid(d, now)).length,
      inactive: discounts.filter(d => !d.enabled).length,
      expired: discounts.filter(d => d.enabled && !isDiscountValid(d, now)).length,
      totalUsed: discounts.reduce((sum, d) => sum + (d.current_uses || 0), 0)
    };
  };

  return (
    <DiscountContext.Provider value={{
      discounts,
      activeDiscounts,
      loading,
      addDiscount,
      updateDiscount,
      deleteDiscount,
      toggleDiscountStatus,
      applyDiscountToReservation,
      applyDiscountToBill,
      removeDiscountApplication,
      getDiscountById,
      validatePromoCode,
      getApplicableDiscounts,
      calculateDiscounts,
      calculateRoomRate,
      getDiscountStats,
      refreshDiscounts: loadDiscounts,
      getDiscountApplicationsByReservation,
      getDiscountApplicationsByBill
    }}>
      {children}
    </DiscountContext.Provider>
  );
};
