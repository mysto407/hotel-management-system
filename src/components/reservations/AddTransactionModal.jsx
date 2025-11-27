import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { Checkbox } from '../ui/checkbox'
import { useBilling } from '../../context/BillingContext'
import { getCurrenciesArray, formatCurrency, calculateBaseCurrencyAmount, DEFAULT_BASE_CURRENCY, getApproximateExchangeRate } from '../../utils/currency'
import { calculateAndApplyTaxes, getTaxConfigurations } from '../../lib/supabase'

export default function AddTransactionModal({ open, onOpenChange, reservationId, folioId, billId, onSuccess }) {
  const {
    addRoomCharge,
    addServiceCharge,
    addTax,
    addFee,
    addDiscountTransaction,
    recordPaymentTransaction,
    addRefund,
    addAdjustment,
    addWriteOff,
    addDeposit,
    SERVICE_CATEGORIES
  } = useBilling()

  const { getBaseCurrency } = useBilling()

  const [transactionType, setTransactionType] = useState('service_charge')
  const [baseCurrency, setBaseCurrency] = useState(DEFAULT_BASE_CURRENCY)
  const [formData, setFormData] = useState({
    amount: '',
    quantity: '1',
    rate: '',
    description: '',
    service_category: 'food',
    payment_method: 'Cash',
    card_last_four: '',
    payment_reference: '',
    tax_rate: '18',
    tax_name: 'GST',
    reference_number: '',
    notes: '',
    transaction_currency: DEFAULT_BASE_CURRENCY,
    exchange_rate: '1.0',
    // Gateway fields
    gateway_transaction_id: '',
    authorization_number: '',
    gateway_status: 'completed'
  })

  const [loading, setLoading] = useState(false)
  const currencies = getCurrenciesArray()

  // Load base currency from settings
  useEffect(() => {
    const loadBaseCurrency = async () => {
      const { data } = await getBaseCurrency()
      setBaseCurrency(data || DEFAULT_BASE_CURRENCY)
    }
    loadBaseCurrency()
  }, [])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData({
        amount: '',
        quantity: '1',
        rate: '',
        description: '',
        service_category: 'food',
        payment_method: 'Cash',
        card_last_four: '',
        payment_reference: '',
        tax_rate: '18',
        tax_name: 'GST',
        reference_number: '',
        notes: '',
        transaction_currency: baseCurrency,
        exchange_rate: '1.0',
        // Gateway fields
        gateway_transaction_id: '',
        authorization_number: '',
        gateway_status: 'completed'
      })
      setTransactionType('service_charge')
    }
  }, [open, baseCurrency])

  // Handle currency change and update exchange rate
  const handleCurrencyChange = (currency) => {
    const approximateRate = getApproximateExchangeRate(currency, baseCurrency)
    setFormData({
      ...formData,
      transaction_currency: currency,
      exchange_rate: approximateRate.toString()
    })
  }

  // Calculate amount based on quantity and rate
  const calculatedAmount = (parseFloat(formData.quantity) || 0) * (parseFloat(formData.rate) || 0)

  // Calculate base currency amount
  const transactionAmount = parseFloat(formData.amount) || calculatedAmount
  const baseCurrencyAmount = calculateBaseCurrencyAmount(transactionAmount, parseFloat(formData.exchange_rate))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseData = {
        reservation_id: reservationId,
        folio_id: folioId,
        bill_id: billId,
        description: formData.description,
        amount: transactionAmount,
        notes: formData.notes,
        reference_number: formData.reference_number || null,
        transaction_currency: formData.transaction_currency,
        exchange_rate: parseFloat(formData.exchange_rate),
        base_currency_amount: baseCurrencyAmount
      }

      let result = null

      switch (transactionType) {
        case 'room_charge':
          result = await addRoomCharge({
            ...baseData,
            quantity: parseFloat(formData.quantity) || 1,
            rate: parseFloat(formData.rate) || 0
          })
          break

        case 'service_charge':
          result = await addServiceCharge({
            ...baseData,
            service_category: formData.service_category,
            quantity: parseFloat(formData.quantity) || 1,
            rate: parseFloat(formData.rate) || 0
          })
          break

        case 'tax':
          result = await addTax({
            ...baseData,
            tax_rate: parseFloat(formData.tax_rate) || 0,
            tax_name: formData.tax_name
          })
          break

        case 'fee':
          result = await addFee(baseData)
          break

        case 'discount':
          result = await addDiscountTransaction({
            ...baseData,
            original_amount: parseFloat(formData.original_amount) || 0
          })
          break

        case 'payment':
          result = await recordPaymentTransaction({
            ...baseData,
            payment_method: formData.payment_method,
            payment_reference: formData.payment_reference || null,
            card_last_four: formData.card_last_four || null,
            // Gateway fields
            gateway_transaction_id: formData.gateway_transaction_id || null,
            authorization_number: formData.authorization_number || null,
            gateway_status: formData.gateway_status || 'completed'
          })
          break

        case 'refund':
          result = await addRefund({
            ...baseData,
            payment_method: formData.payment_method,
            payment_reference: formData.payment_reference || null
          })
          break

        case 'adjustment':
          result = await addAdjustment(baseData)
          break

        case 'write_off':
          result = await addWriteOff(baseData)
          break

        case 'deposit':
          result = await addDeposit({
            ...baseData,
            payment_method: formData.payment_method,
            payment_reference: formData.payment_reference || null
          })
          break

        default:
          console.error('Unknown transaction type:', transactionType)
      }

      if (result) {
        onSuccess?.()
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderTypeSpecificFields = () => {
    switch (transactionType) {
      case 'room_charge':
      case 'service_charge':
        return (
          <>
            {transactionType === 'service_charge' && (
              <div className="space-y-2">
                <Label>Service Category</Label>
                <Select
                  value={formData.service_category}
                  onValueChange={(value) => setFormData({ ...formData, service_category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SERVICE_CATEGORIES).map(([key, value]) => (
                      <SelectItem key={value} value={value}>
                        {key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Rate (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Calculated Amount:</span>
                <span className="font-bold">₹{calculatedAmount.toFixed(2)}</span>
              </div>
            </div>
          </>
        )

      case 'tax':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Name</Label>
                <Input
                  value={formData.tax_name}
                  onChange={(e) => setFormData({ ...formData, tax_name: e.target.value })}
                  placeholder="e.g., GST, VAT"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={formData.tax_rate}
                  onChange={(e) => setFormData({ ...formData, tax_rate: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Tax Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </>
        )

      case 'payment':
      case 'refund':
      case 'deposit':
        return (
          <>
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Card">Card</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.payment_method === 'Card' && (
              <div className="space-y-2">
                <Label>Card Last 4 Digits (Optional)</Label>
                <Input
                  maxLength="4"
                  value={formData.card_last_four}
                  onChange={(e) => setFormData({ ...formData, card_last_four: e.target.value.replace(/\D/g, '') })}
                  placeholder="1234"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Reference Number (Optional)</Label>
              <Input
                value={formData.payment_reference}
                onChange={(e) => setFormData({ ...formData, payment_reference: e.target.value })}
                placeholder="Transaction ID, Cheque #, etc."
              />
            </div>

            {/* Gateway Integration Fields */}
            {(formData.payment_method === 'Card' || formData.payment_method === 'UPI') && (
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3 mt-4">
                <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Gateway Integration (Optional)
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Gateway Transaction ID</Label>
                    <Input
                      value={formData.gateway_transaction_id}
                      onChange={(e) => setFormData({ ...formData, gateway_transaction_id: e.target.value })}
                      placeholder="e.g., pay_xxxxxxxxxxxx"
                    />
                    <div className="text-xs text-muted-foreground">
                      Transaction ID from payment gateway
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Authorization Number</Label>
                    <Input
                      value={formData.authorization_number}
                      onChange={(e) => setFormData({ ...formData, authorization_number: e.target.value })}
                      placeholder="e.g., 123456"
                    />
                    <div className="text-xs text-muted-foreground">
                      Authorization code from gateway
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gateway Status</Label>
                  <Select
                    value={formData.gateway_status}
                    onValueChange={(value) => setFormData({ ...formData, gateway_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="authorized">Authorized</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground">
                    Current status of the gateway transaction
                  </div>
                </div>
              </div>
            )}
          </>
        )

      case 'discount':
        return (
          <>
            <div className="space-y-2">
              <Label>Original Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.original_amount}
                onChange={(e) => setFormData({ ...formData, original_amount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Amount (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
          </>
        )

      default:
        return (
          <div className="space-y-2">
            <Label>Amount (₹)</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Transaction</DialogTitle>
          <DialogDescription>
            Create a new transaction for this reservation
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="room_charge">Room Charge</SelectItem>
                <SelectItem value="service_charge">Service Charge</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="fee">Fee</SelectItem>
                <SelectItem value="discount">Discount</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
                <SelectItem value="write_off">Write-off</SelectItem>
                <SelectItem value="deposit">Deposit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter transaction description"
              required
            />
          </div>

          {/* Currency Selection */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            <div className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Currency Information
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Transaction Currency</Label>
                <Select
                  value={formData.transaction_currency}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.code} - {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  Select the currency for this transaction
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exchange Rate</Label>
                <Input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={formData.exchange_rate}
                  onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                  required
                  disabled={formData.transaction_currency === baseCurrency}
                />
                <div className="text-xs text-muted-foreground">
                  1 {formData.transaction_currency} = {formData.exchange_rate} {baseCurrency}
                </div>
              </div>
            </div>
            {formData.transaction_currency !== baseCurrency && transactionAmount > 0 && (
              <div className="bg-white dark:bg-gray-800 p-3 rounded-md border">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Base Currency Amount:</span>
                  <span className="text-sm font-bold">
                    {formatCurrency(baseCurrencyAmount, baseCurrency, { showCode: true })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {renderTypeSpecificFields()}

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
