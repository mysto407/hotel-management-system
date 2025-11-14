// src/context/MealPlanContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getMealPlans,
  getActiveMealPlans,
  getMealPlanByCode as getMealPlanByCodeAPI,
  createMealPlan as createMealPlanAPI,
  updateMealPlan as updateMealPlanAPI,
  deleteMealPlan as deleteMealPlanAPI
} from '../lib/supabase';

const MealPlanContext = createContext();

export const useMealPlans = () => {
  const context = useContext(MealPlanContext);
  if (!context) throw new Error('useMealPlans must be used within MealPlanProvider');
  return context;
};

export const MealPlanProvider = ({ children }) => {
  const [mealPlans, setMealPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMealPlans();
  }, []);

  const loadMealPlans = async () => {
    setLoading(true);
    const { data, error } = await getMealPlans();
    if (error) {
      console.error('Error loading meal plans:', error);
    } else {
      setMealPlans(data || []);
    }
    setLoading(false);
  };

  const addMealPlan = async (mealPlan) => {
    const { data, error } = await createMealPlanAPI(mealPlan);
    if (error) {
      console.error('Error creating meal plan:', error);

      // Check for unique constraint violation on code
      if (error.code === '23505') {
        alert('A meal plan with this code already exists. Please use a different code.');
      } else {
        alert('Failed to create meal plan: ' + error.message);
      }
      return null;
    }
    setMealPlans([...mealPlans, data[0]].sort((a, b) => a.sort_order - b.sort_order));
    return data[0];
  };

  const updateMealPlan = async (id, updatedMealPlan) => {
    const { data, error } = await updateMealPlanAPI(id, updatedMealPlan);
    if (error) {
      console.error('Error updating meal plan:', error);

      // Check for unique constraint violation on code
      if (error.code === '23505') {
        alert('A meal plan with this code already exists. Please use a different code.');
      } else {
        alert('Failed to update meal plan: ' + error.message);
      }
      return null;
    }
    setMealPlans(mealPlans.map(plan =>
      plan.id === id ? { ...plan, ...data[0] } : plan
    ).sort((a, b) => a.sort_order - b.sort_order));
    return data[0];
  };

  const deleteMealPlan = async (id) => {
    const { error } = await deleteMealPlanAPI(id);
    if (error) {
      console.error('Error deleting meal plan:', error);

      // Check for foreign key constraint
      if (error.code === '23503') {
        alert('Cannot delete meal plan: It is being used in existing reservations. You can deactivate it instead.');
      } else {
        alert('Failed to delete meal plan: ' + error.message);
      }
      return false;
    }
    setMealPlans(mealPlans.filter(plan => plan.id !== id));
    return true;
  };

  const toggleMealPlanStatus = async (id) => {
    const plan = mealPlans.find(p => p.id === id);
    if (!plan) return null;

    return await updateMealPlan(id, { is_active: !plan.is_active });
  };

  // Get only active meal plans for dropdowns
  const getActivePlans = () => {
    return mealPlans.filter(plan => plan.is_active);
  };

  // Get meal plan by code (for backward compatibility and quick lookup)
  const getMealPlanByCode = (code) => {
    return mealPlans.find(plan => plan.code === code);
  };

  // Get meal plan display name by code
  const getMealPlanName = (code) => {
    const plan = getMealPlanByCode(code);
    return plan ? plan.name : code; // Fallback to code if not found
  };

  // Get meal plan price by code
  const getMealPlanPrice = (code) => {
    const plan = getMealPlanByCode(code);
    return plan ? parseFloat(plan.price_per_person) : 0;
  };

  // Calculate total meal plan cost
  const calculateMealPlanCost = (code, numberOfGuests, numberOfNights) => {
    const pricePerPerson = getMealPlanPrice(code);
    return pricePerPerson * numberOfGuests * numberOfNights;
  };

  // Update sort order for multiple plans
  const updateSortOrder = async (reorderedPlans) => {
    try {
      // Update each plan's sort_order
      const updates = reorderedPlans.map((plan, index) =>
        updateMealPlan(plan.id, { sort_order: index })
      );
      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error('Error updating sort order:', error);
      return false;
    }
  };

  const value = {
    mealPlans,
    loading,
    loadMealPlans,
    addMealPlan,
    updateMealPlan,
    deleteMealPlan,
    toggleMealPlanStatus,
    getActivePlans,
    getMealPlanByCode,
    getMealPlanName,
    getMealPlanPrice,
    calculateMealPlanCost,
    updateSortOrder
  };

  return (
    <MealPlanContext.Provider value={value}>
      {children}
    </MealPlanContext.Provider>
  );
};
