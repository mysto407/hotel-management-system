// src/components/folio/AddTransactionDialog.jsx
import { useState, useEffect } from 'react'
import { Plus, X, DollarSign, Calendar as CalendarIcon } from 'lucide-react'
import { useFolio } from '../../context/FolioContext'
import { useAuth } from '../../context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { cn } from '@/lib/utils'

// Transaction type options
const TRANSACTION_TYPES = [
  { value: 'room_charge', label: 'Room Charge' },
  { value: 'addon_charge', label: 'Add-on Charge' },
  { value: 'fee', label: 'Fee' },
  { value: 'tax', label: 'Tax' },
  { value: 'discount', label: 'Discount' },
  { value: 'adjustment', label: 'Adjustment' },
]

// Category options
const CATEGORIES = [
  { value: 'room', label: 'Room' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'spa', label: 'Spa' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'bar', label: 'Bar' },
  { value: 'conference', label: 'Conference' },
  { value: 'other', label: 'Other' },
]

export default function AddTransactionDialog({ open, onOpenChange, folio, reservation, onSuccess }) {
  const { addTransaction } = useFolio()
  const { user } = useAuth()

  // Form state
  const [formData, setFormData] = useState({
    transaction_type: 'addon_charge',
    category: 'other',
    description: '',
    quantity: 1,
    rate: '',
    post_date: new Date(),
    tags: '',
    notes: '',
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCalendar, setShowCalendar] = useState(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      setFormData({
        transaction_type: 'addon_charge',
        category: 'other',
        description: '',
        quantity: 1,
        rate: '',
        post_date: new Date(),
        tags: '',
        notes: '',
      })
      setErrors({})
    }
  }, [open])

  // Calculate total amount
  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0
    const rate = parseFloat(formData.rate) || 0
    let total = quantity * rate

    // Make discount amounts negative
    if (formData.transaction_type === 'discount' && total > 0) {
      total = -Math.abs(total)
    }

    return total
  }

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }))
    }
  }

  // Validate form
  const validateForm = () => {
    const newErrors = {}

    if (!formData.transaction_type) {
      newErrors.transaction_type = 'Transaction type is required'
    }

    if (!formData.category) {
      newErrors.category = 'Category is required'
    }

    if (!formData.description || formData.description.trim() === '') {
      newErrors.description = 'Description is required'
    }

    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Quantity must be greater than 0'
    }

    if (!formData.rate || formData.rate === '') {
      newErrors.rate = 'Rate/Amount is required'
    }

    if (!formData.post_date) {
      newErrors.post_date = 'Post date is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    if (!folio || !reservation) {
      alert('Invalid folio or reservation data')
      return
    }

    setIsSubmitting(true)

    try {
      const total = calculateTotal()

      // Prepare transaction data
      const transactionData = {
        folio_id: folio.id,
        reservation_id: reservation.id,
        transaction_type: formData.transaction_type,
        category: formData.category,
        description: formData.description.trim(),
        quantity: parseFloat(formData.quantity),
        rate: parseFloat(formData.rate),
        amount: total,
        post_date: formData.post_date.toISOString().split('T')[0],
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : null,
        notes: formData.notes.trim() || null,
        status: 'posted',
      }

      // Post transaction
      const result = await addTransaction(transactionData)

      if (result) {
        // Success - close dialog and trigger callback
        onOpenChange(false)
        if (onSuccess) {
          onSuccess(result)
        }
      }
    } catch (error) {
      console.error('Error posting transaction:', error)
      alert('Failed to post transaction: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get transaction type label
  const getTransactionTypeLabel = () => {
    const type = TRANSACTION_TYPES.find(t => t.value === formData.transaction_type)
    return type ? type.label : 'Transaction'
  }

  const total = calculateTotal()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction to Folio</DialogTitle>
          <DialogDescription>
            Post charges, fees, discounts, or adjustments to {folio?.folio_name || 'the folio'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {/* Transaction Type */}
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type *</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => handleChange('transaction_type', value)}
            >
              <SelectTrigger id="transaction_type" className={errors.transaction_type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select transaction type" />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.transaction_type && (
              <p className="text-xs text-red-500">{errors.transaction_type}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => handleChange('category', value)}
            >
              <SelectTrigger id="category" className={errors.category ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              placeholder="Enter charge description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-xs text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Quantity and Rate in a grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-xs text-red-500">{errors.quantity}</p>
              )}
            </div>

            {/* Rate/Amount */}
            <div className="space-y-2">
              <Label htmlFor="rate">Rate/Amount *</Label>
              <Input
                id="rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.rate}
                onChange={(e) => handleChange('rate', e.target.value)}
                className={errors.rate ? 'border-red-500' : ''}
              />
              {errors.rate && (
                <p className="text-xs text-red-500">{errors.rate}</p>
              )}
            </div>
          </div>

          {/* Post Date */}
          <div className="space-y-2">
            <Label htmlFor="post_date">Post Date *</Label>
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.post_date && 'text-muted-foreground',
                    errors.post_date && 'border-red-500'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.post_date ? formatDate(formData.post_date.toISOString()) : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.post_date}
                  onSelect={(date) => {
                    handleChange('post_date', date || new Date())
                    setShowCalendar(false)
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.post_date && (
              <p className="text-xs text-red-500">{errors.post_date}</p>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (optional)</Label>
            <Input
              id="tags"
              placeholder="Enter tags separated by commas"
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Example: restaurant, breakfast, special-request
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview Card */}
          {formData.rate && formData.quantity && (
            <Alert>
              <DollarSign className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Transaction Preview</p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Type:</span> {getTransactionTypeLabel()}
                  </p>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Calculation:</span> {formData.quantity} × {formatCurrency(parseFloat(formData.rate))}
                  </p>
                  <p className="text-sm font-semibold">
                    <span className="text-muted-foreground">Total Amount:</span>{' '}
                    <span className={total < 0 ? 'text-green-600' : ''}>
                      {formatCurrency(total)}
                    </span>
                  </p>
                  {formData.transaction_type === 'discount' && total > 0 && (
                    <p className="text-xs text-amber-600">
                      Note: This will be posted as a negative amount (credit)
                    </p>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
        </form>

        <DialogFooter className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Posting...' : 'Post Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
