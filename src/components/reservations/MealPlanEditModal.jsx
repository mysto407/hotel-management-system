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
import { useMealPlans } from '../../context/MealPlanContext'

export default function MealPlanEditModal({ open, onOpenChange, reservation, onSave }) {
  const { getMealPlanName, getActivePlans } = useMealPlans()
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

        <div className="py-4">
          <div className="mb-2 text-sm text-muted-foreground">
            Current: <span className="font-medium text-foreground">
              {getMealPlanName(reservation.meal_plan) || 'None'}
            </span>
          </div>

          <Select
            value={selectedMealPlan || 'none'}
            onValueChange={(value) => setSelectedMealPlan(value === 'none' ? '' : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select meal plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {getActivePlans().map((plan) => (
                <SelectItem key={plan.code} value={plan.code}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
