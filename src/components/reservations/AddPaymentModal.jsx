import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, CreditCard, Banknote, Smartphone, Building2, CircleDollarSign, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createPaymentTransaction, getPaymentMethods } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

// Default payment methods with icons and colors
const DEFAULT_PAYMENT_METHODS = [
  { code: 'cash', name: 'Cash', icon: Banknote, color: 'text-green-600 bg-green-50' },
  { code: 'card', name: 'Card', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  { code: 'upi', name: 'UPI', icon: Smartphone, color: 'text-purple-600 bg-purple-50' },
  { code: 'bank_transfer', name: 'Bank', icon: Building2, color: 'text-orange-600 bg-orange-50' },
  { code: 'other', name: 'Other', icon: CircleDollarSign, color: 'text-gray-600 bg-gray-50' }
]

// Map payment method codes to icons and colors
const PAYMENT_CONFIG = {
  cash: { icon: Banknote, color: 'text-green-600 bg-green-50' },
  card: { icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
  upi: { icon: Smartphone, color: 'text-purple-600 bg-purple-50' },
  bank_transfer: { icon: Building2, color: 'text-orange-600 bg-orange-50' },
  other: { icon: CircleDollarSign, color: 'text-gray-600 bg-gray-50' },
  default: { icon: Wallet, color: 'text-gray-600 bg-gray-50' }
}

export default function AddPaymentModal({ open, onOpenChange, reservationId, folios = [], activeFolioId = null, balanceDue = 0, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amount, setAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedFolioId, setSelectedFolioId] = useState(activeFolioId)

  // Load payment methods from database
  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const { data, error } = await getPaymentMethods(true) // Only active methods
        if (!error && data && data.length > 0) {
          setPaymentMethods(data)
        }
      } catch (err) {
        console.error('Error loading payment methods:', err)
        // Keep default methods on error
      }
    }
    loadPaymentMethods()
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Set to first available payment method
      setPaymentMethod(paymentMethods[0]?.code || 'cash')
      // Pre-fill with balance due if positive
      setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '')
      setReferenceNumber('')
      setNotes('')
      setTransactionDate(format(new Date(), 'yyyy-MM-dd'))
      setSelectedFolioId(activeFolioId || (folios.length > 0 ? folios[0].id : null))
    }
  }, [open, balanceDue, paymentMethods, activeFolioId, folios])

  // Handle full payment button
  const handlePayFull = () => {
    if (balanceDue > 0) {
      setAmount(balanceDue.toFixed(2))
    }
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
      const paymentAmount = parseFloat(amount)

      // Get payment method display name
      const methodInfo = paymentMethods.find(m => m.code === paymentMethod)
      const description = `${methodInfo?.name || 'Payment'}${referenceNumber ? ` (Ref: ${referenceNumber})` : ''}`

      const result = await createPaymentTransaction({
        reservation_id: reservationId,
        folio_id: selectedFolioId,
        amount: paymentAmount, // Will be stored as negative in the function
        payment_method: paymentMethod,
        description,
        reference_number: referenceNumber,
        notes,
        transaction_status: 'posted', // Payments are always posted immediately
        transaction_date: new Date(transactionDate).toISOString()
      })

      if (result.error) throw result.error

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      console.error('Error creating payment:', err)
      alert('Failed to record payment: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Get config for a payment method code
  const getConfig = (code) => PAYMENT_CONFIG[code] || PAYMENT_CONFIG.default
  const selectedConfig = getConfig(paymentMethod)
  const SelectedIcon = selectedConfig.icon

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[480px] p-0 gap-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b bg-muted/30 shrink-0">
          <SheetTitle className="flex items-center gap-3 text-lg">
            <div className={cn("p-2 rounded-lg", selectedConfig.color)}>
              <SelectedIcon className="h-5 w-5" />
            </div>
            Record Payment
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
            {/* Balance Due Summary */}
            {balanceDue > 0 && (
              <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Balance Due</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(balanceDue)}
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={handlePayFull} className="border-red-300 text-red-600 hover:bg-red-50">
                    Pay Full Amount
                  </Button>
                </div>
              </div>
            )}

            {/* Payment Method Selection - Visual Buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <div className="grid grid-cols-5 gap-2">
                {DEFAULT_PAYMENT_METHODS.map(method => {
                  const Icon = method.icon
                  const isSelected = paymentMethod === method.code
                  return (
                    <button
                      key={method.code}
                      type="button"
                      onClick={() => setPaymentMethod(method.code)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      )}
                    >
                      <div className={cn("p-1.5 rounded-md", method.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className={cn(
                        "text-xs font-medium",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )}>
                        {method.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Folio Selector (only show if multiple folios) */}
            {folios.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="folio">Apply to Folio</Label>
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

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-lg h-12"
              />
            </div>

            {/* Reference Number (for card, UPI, bank transfer) */}
            {['card', 'upi', 'bank_transfer'].includes(paymentMethod) && (
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">
                  {paymentMethod === 'card' ? 'Last 4 Digits / Auth Code' :
                   paymentMethod === 'upi' ? 'UPI Transaction ID' :
                   'Transaction Reference'}
                </Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={
                    paymentMethod === 'card' ? 'XXXX / Auth code' :
                    paymentMethod === 'upi' ? 'UPI123456789' :
                    'Reference number'
                  }
                />
              </div>
            )}

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="transactionDate">Payment Date</Label>
              <Input
                id="transactionDate"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>

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
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 p-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-green-700 dark:text-green-300">Payment Amount</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(parseFloat(amount))}
                  </span>
                </div>
                {balanceDue > 0 && (
                  <div className="flex justify-between pt-1.5 border-t border-green-200 dark:border-green-800">
                    <span className="text-sm text-muted-foreground">Remaining Balance</span>
                    <span className={cn(
                      "font-semibold",
                      (balanceDue - parseFloat(amount)) <= 0
                        ? "text-green-600"
                        : "text-orange-600"
                    )}>
                      {formatCurrency(Math.max(0, balanceDue - parseFloat(amount)))}
                    </span>
                  </div>
                )}
              </div>
            )}

            <SheetFooter className="gap-2 sm:gap-2">
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
                className="bg-green-600 hover:bg-green-700"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Record Payment
              </Button>
            </SheetFooter>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
