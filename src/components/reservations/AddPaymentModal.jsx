import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Loader2, CreditCard, Banknote, Smartphone, Building2, CircleDollarSign, Wallet } from 'lucide-react'
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
import { createPaymentTransaction, getPaymentMethods } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

// Default payment methods (fallback if DB is empty)
const DEFAULT_PAYMENT_METHODS = [
  { code: 'cash', name: 'Cash' },
  { code: 'card', name: 'Credit/Debit Card' },
  { code: 'upi', name: 'UPI' },
  { code: 'bank_transfer', name: 'Bank Transfer' },
  { code: 'other', name: 'Other' }
]

// Map payment method codes to icons
const PAYMENT_ICONS = {
  cash: Banknote,
  card: CreditCard,
  upi: Smartphone,
  bank_transfer: Building2,
  other: CircleDollarSign,
  default: Wallet
}

export default function AddPaymentModal({ open, onOpenChange, reservationId, balanceDue = 0, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState(DEFAULT_PAYMENT_METHODS)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [amount, setAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'))

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
    }
  }, [open, balanceDue, paymentMethods])

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
        reservationId,
        amount: paymentAmount, // Will be stored as negative in the function
        paymentMethod,
        description,
        referenceNumber,
        notes,
        status: 'posted', // Payments are always posted immediately
        transactionDate: new Date(transactionDate).toISOString()
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

  // Get icon for a payment method code
  const getIcon = (code) => PAYMENT_ICONS[code] || PAYMENT_ICONS.default
  const SelectedIcon = getIcon(paymentMethod)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            Record a payment from the guest
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Balance Due Summary */}
          {balanceDue > 0 && (
            <div className="bg-muted p-3 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Balance Due</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">
                  {formatCurrency(balanceDue)}
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handlePayFull}>
                Pay Full
              </Button>
            </div>
          )}

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <SelectedIcon className="h-4 w-4" />
                  <SelectValue placeholder="Select payment method" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map(method => {
                  const Icon = getIcon(method.code)
                  return (
                    <SelectItem key={method.code} value={method.code}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.name}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

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
              className="text-lg"
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
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>

          {/* Payment Summary */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex justify-between items-center">
                <span className="text-green-800 dark:text-green-200">Payment Amount:</span>
                <span className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(parseFloat(amount))}
                </span>
              </div>
              {balanceDue > 0 && (
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-green-200 dark:border-green-800 text-sm">
                  <span className="text-green-700 dark:text-green-300">Remaining Balance:</span>
                  <span className={`font-medium ${(balanceDue - parseFloat(amount)) <= 0 ? 'text-green-600' : 'text-orange-600'}`}>
                    {formatCurrency(Math.max(0, balanceDue - parseFloat(amount)))}
                  </span>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !amount || parseFloat(amount) <= 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
