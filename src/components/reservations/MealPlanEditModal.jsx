import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Coffee, Utensils, UtensilsCrossed } from 'lucide-react'
import { useMealPlans } from '../../context/MealPlanContext'

export default function MealPlanEditModal({ open, onOpenChange, reservation, onSave }) {
  const { getMealPlanName, getActivePlans, getMealPlanByCode, getMealsIncluded } = useMealPlans()
  const [selectedMealPlan, setSelectedMealPlan] = useState('')

  // Initialize meal plan when modal opens
  useEffect(() => {
    if (open && reservation) {
      setSelectedMealPlan(reservation.meal_plan || '')
    }
  }, [open, reservation])

  const handleSave = () => {
    // Convert empty string to null for database
    const mealPlanValue = selectedMealPlan === '' ? null : selectedMealPlan
    onSave(reservation.id, mealPlanValue)
    onOpenChange(false)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  if (!reservation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Meal Plan</DialogTitle>
          <DialogDescription>
            Update the meal plan for this reservation
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            Current: <span className="font-medium text-foreground">
              {getMealPlanName(reservation.meal_plan) || 'None'}
            </span>
            {reservation.meal_plan && (
              <div className="flex gap-1 mt-1">
                {getMealsIncluded(reservation.meal_plan).map(meal => (
                  <Badge key={meal} variant="secondary" className="text-xs">
                    {meal === 'Breakfast' && <Coffee className="h-3 w-3 mr-1" />}
                    {meal === 'Lunch' && <Utensils className="h-3 w-3 mr-1" />}
                    {meal === 'Dinner' && <UtensilsCrossed className="h-3 w-3 mr-1" />}
                    {meal}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Select
            value={selectedMealPlan || 'none'}
            onValueChange={(value) => setSelectedMealPlan(value === 'none' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select meal plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">
                <span className="text-muted-foreground">No Meal Plan</span>
              </SelectItem>
              {getActivePlans().map((plan) => (
                <SelectItem key={plan.code} value={plan.code}>
                  <span>{plan.name}</span>
                  <span className="text-muted-foreground ml-2">
                    ₹{parseFloat(plan.price_per_person || 0).toFixed(0)}/person/day
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Show selected plan details */}
          {selectedMealPlan && selectedMealPlan !== reservation.meal_plan && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <div className="font-medium text-foreground">
                New Plan: {getMealPlanName(selectedMealPlan)}
              </div>
              {getMealsIncluded(selectedMealPlan).length > 0 ? (
                <div className="flex gap-1 mt-2">
                  {getMealsIncluded(selectedMealPlan).map(meal => (
                    <Badge key={meal} variant="secondary" className="text-xs">
                      {meal === 'Breakfast' && <Coffee className="h-3 w-3 mr-1" />}
                      {meal === 'Lunch' && <Utensils className="h-3 w-3 mr-1" />}
                      {meal === 'Dinner' && <UtensilsCrossed className="h-3 w-3 mr-1" />}
                      {meal}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground mt-1">Room only - no meals included</p>
              )}
              <p className="text-muted-foreground mt-2 text-xs">
                Note: Pending meal charges will be reconciled after saving.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
