import { useState, useEffect } from 'react'
import { format, isAfter, startOfDay } from 'date-fns'
import { Loader2, Plus, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  createRoomCharge,
  createServiceCharge,
  createTax,
  createFee,
  createDiscountTransaction,
  getTotalTaxRate,
  SERVICE_CATEGORIES
} from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

const CHARGE_TYPES = [
  { value: 'room_charge', label: 'Room Charge' },
  { value: 'service_charge', label: 'Service Charge' },
  { value: 'tax', label: 'Tax' },
  { value: 'fee', label: 'Fee' },
  { value: 'discount', label: 'Discount' }
]

export default function AddChargeModal({ open, onOpenChange, reservationId, folios = [], activeFolioId = null, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [chargeType, setChargeType] = useState('service_charge')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [serviceCategory, setServiceCategory] = useState('')
  const [notes, setNotes] = useState('')
  const [applyTax, setApplyTax] = useState(false)
  const [taxRate, setTaxRate] = useState(18)
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedFolioId, setSelectedFolioId] = useState(activeFolioId)

  // Load tax rate
  useEffect(() => {
    const loadTaxRate = async () => {
      try {
        const { rate } = await getTotalTaxRate(chargeType)
        setTaxRate(rate || 18)
      } catch (err) {
        console.error('Error loading tax rate:', err)
      }
    }
    loadTaxRate()
  }, [chargeType])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setChargeType('service_charge')
      setDescription('')
      setAmount('')
      setQuantity('1')
      setServiceCategory('')
      setNotes('')
      setApplyTax(false)
      setTransactionDate(format(new Date(), 'yyyy-MM-dd'))
      setSelectedFolioId(activeFolioId || (folios.length > 0 ? folios[0].id : null))
    }
  }, [open, activeFolioId, folios])

  // Calculate total
  const calculateTotal = () => {
    const baseAmount = parseFloat(amount || 0) * parseFloat(quantity || 1)
    if (applyTax && taxRate > 0) {
      return baseAmount * (1 + taxRate / 100)
    }
    return baseAmount
  }

  // Calculate tax amount
  const calculateTaxAmount = () => {
    const baseAmount = parseFloat(amount || 0) * parseFloat(quantity || 1)
    if (applyTax && taxRate > 0) {
      return baseAmount * (taxRate / 100)
    }
    return 0
  }

  // Determine status based on date
  const getStatusForDate = (dateStr) => {
    const selectedDate = startOfDay(new Date(dateStr))
    const today = startOfDay(new Date())

    // Future date = pending, Today or past = posted
    return isAfter(selectedDate, today) ? 'pending' : 'posted'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!reservationId) {
      alert('No reservation selected')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setLoading(true)
    try {
      const baseAmount = parseFloat(amount) * parseFloat(quantity || 1)
      const status = getStatusForDate(transactionDate)

      const baseData = {
        reservation_id: reservationId,
        folio_id: selectedFolioId,
        amount: chargeType === 'discount' ? -Math.abs(baseAmount) : baseAmount,
        description: description || CHARGE_TYPES.find(t => t.value === chargeType)?.label,
        notes,
        transaction_status: status,
        transaction_date: new Date(transactionDate).toISOString()
      }

      let result

      switch (chargeType) {
        case 'room_charge':
          result = await createRoomCharge({
            ...baseData,
            quantity: parseFloat(quantity || 1),
            rate: parseFloat(amount)
          })
          break
        case 'service_charge':
          result = await createServiceCharge({
            ...baseData,
            serviceCategory: serviceCategory || 'other',
            quantity: parseFloat(quantity || 1),
            rate: parseFloat(amount)
          })
          break
        case 'tax':
          result = await createTax({
            ...baseData,
            taxRate: parseFloat(amount), // For tax type, amount is the rate
            taxName: description || 'Tax'
          })
          break
        case 'fee':
          result = await createFee({
            ...baseData
          })
          break
        case 'discount':
          result = await createDiscountTransaction({
            ...baseData,
            amount: -Math.abs(baseAmount) // Ensure negative for discounts
          })
          break
        default:
          throw new Error('Invalid charge type')
      }

      if (result.error) throw result.error

      // If apply tax is checked and charge type supports it, create tax transaction
      if (applyTax && ['room_charge', 'service_charge', 'fee'].includes(chargeType)) {
        const taxAmount = calculateTaxAmount()
        if (taxAmount > 0) {
          await createTax({
            reservation_id: reservationId,
            folio_id: selectedFolioId,
            amount: taxAmount,
            description: `GST ${taxRate}% on ${description || chargeType}`,
            tax_rate: taxRate,
            tax_name: 'GST',
            notes: `Tax on charge: ${description}`,
            transaction_status: status,
            transaction_date: new Date(transactionDate).toISOString(),
            parent_transaction_id: result.data?.[0]?.id // Link to parent charge
          })
        }
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating charge:', err)
      alert('Failed to create charge: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Charge
          </DialogTitle>
          <DialogDescription>
            Add a new charge to the guest's folio
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Folio Selector (only show if multiple folios) */}
          {folios.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="folio">Add to Folio</Label>
              <Select value={selectedFolioId || ''} onValueChange={setSelectedFolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folio" />
                </SelectTrigger>
                <SelectContent>
                  {folios.map(folio => (
                    <SelectItem key={folio.id} value={folio.id}>
                      {folio.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Charge Type */}
          <div className="space-y-2">
            <Label htmlFor="chargeType">Charge Type</Label>
            <Select value={chargeType} onValueChange={setChargeType}>
              <SelectTrigger>
                <SelectValue placeholder="Select charge type" />
              </SelectTrigger>
              <SelectContent>
                {CHARGE_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service Category (for service charges) */}
          {chargeType === 'service_charge' && (
            <div className="space-y-2">
              <Label htmlFor="serviceCategory">Category</Label>
              <Select value={serviceCategory} onValueChange={setServiceCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICE_CATEGORIES).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={chargeType === 'tax' ? 'Tax name (e.g., GST 18%)' : 'Enter description'}
            />
          </div>

          {/* Amount and Quantity Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                {chargeType === 'tax' ? 'Tax Rate (%)' : 'Amount (₹)'}
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            {chargeType !== 'tax' && chargeType !== 'discount' && (
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="1"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                />
              </div>
            )}
          </div>

          {/* Transaction Date */}
          <div className="space-y-2">
            <Label htmlFor="transactionDate">Transaction Date</Label>
            <Input
              id="transactionDate"
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Status: {getStatusForDate(transactionDate) === 'pending' ? 'Pending (future date)' : 'Posted (today/past)'}
            </p>
          </div>

          {/* Apply Tax Checkbox */}
          {['room_charge', 'service_charge', 'fee'].includes(chargeType) && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="applyTax"
                checked={applyTax}
                onCheckedChange={setApplyTax}
              />
              <Label htmlFor="applyTax" className="text-sm font-normal cursor-pointer">
                Apply GST ({taxRate}%)
              </Label>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Summary */}
          {amount && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(parseFloat(amount || 0) * parseFloat(quantity || 1))}</span>
              </div>
              {applyTax && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>GST ({taxRate}%):</span>
                  <span>{formatCurrency(calculateTaxAmount())}</span>
                </div>
              )}
              <div className="flex justify-between font-medium border-t pt-1 mt-1">
                <span>Total:</span>
                <span>{formatCurrency(calculateTotal())}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amount}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Charge
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
