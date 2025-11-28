import { useState, useEffect } from 'react'
import { format, isAfter, startOfDay } from 'date-fns'
import { Loader2, Plus, Receipt, Percent, Tag, CreditCard, BadgeMinus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils'
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
  { value: 'room_charge', label: 'Room Charge', icon: Receipt, color: 'text-blue-600 bg-blue-50' },
  { value: 'service_charge', label: 'Service', icon: Tag, color: 'text-purple-600 bg-purple-50' },
  { value: 'fee', label: 'Fee', icon: CreditCard, color: 'text-orange-600 bg-orange-50' },
  { value: 'tax', label: 'Tax', icon: Percent, color: 'text-green-600 bg-green-50' },
  { value: 'discount', label: 'Discount', icon: BadgeMinus, color: 'text-red-600 bg-red-50' }
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

  const selectedType = CHARGE_TYPES.find(t => t.value === chargeType)
  const TypeIcon = selectedType?.icon || Plus

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 flex flex-col" style={{ maxHeight: 'calc(100vh - 48px)' }}>
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-muted/30 shrink-0">
          <DialogTitle className="flex items-center gap-3 text-lg">
            <div className={cn("p-2 rounded-lg", selectedType?.color || "bg-gray-100")}>
              <TypeIcon className="h-5 w-5" />
            </div>
            Add New Charge
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Charge Type Selection - Visual Buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Charge Type</Label>
              <div className="grid grid-cols-5 gap-2">
                {CHARGE_TYPES.map(type => {
                  const Icon = type.icon
                  const isSelected = chargeType === type.value
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setChargeType(type.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-md", type.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {type.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Folio Selector (only show if multiple folios) */}
            {folios.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="folio">Target Folio</Label>
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

            {/* Service Category (for service charges) */}
            {chargeType === 'service_charge' && (
              <div className="space-y-2">
                <Label htmlFor="serviceCategory">Service Category</Label>
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
                placeholder={chargeType === 'tax' ? 'e.g., GST 18%' : 'Enter charge description'}
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
              {(chargeType === 'tax' || chargeType === 'discount') && (
                <div className="space-y-2">
                  <Label htmlFor="transactionDate">Date</Label>
                  <Input
                    id="transactionDate"
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Transaction Date (for other types) */}
            {chargeType !== 'tax' && chargeType !== 'discount' && (
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date</Label>
                <Input
                  id="transactionDate"
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {getStatusForDate(transactionDate) === 'pending'
                    ? '📅 Future date - will be marked as Pending'
                    : '✓ Will be Posted immediately'}
                </p>
              </div>
            )}

            {/* Apply Tax Checkbox */}
            {['room_charge', 'service_charge', 'fee'].includes(chargeType) && (
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/50">
                <Checkbox
                  id="applyTax"
                  checked={applyTax}
                  onCheckedChange={setApplyTax}
                />
                <div className="flex-1">
                  <Label htmlFor="applyTax" className="font-medium cursor-pointer">
                    Apply GST ({taxRate}%)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Tax will be added as a separate line item
                  </p>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Summary Footer */}
          <div className="border-t bg-muted/30 px-6 py-3 space-y-3 shrink-0">
            {amount && parseFloat(amount) > 0 && (
              <div className="bg-background rounded-lg border p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(parseFloat(amount || 0) * parseFloat(quantity || 1))}</span>
                </div>
                {applyTax && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">GST ({taxRate}%)</span>
                    <span>{formatCurrency(calculateTaxAmount())}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1.5 border-t">
                  <span>Total</span>
                  <span className={chargeType === 'discount' ? 'text-red-600' : 'text-green-600'}>
                    {chargeType === 'discount' ? '-' : ''}{formatCurrency(Math.abs(calculateTotal()))}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Charge
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
