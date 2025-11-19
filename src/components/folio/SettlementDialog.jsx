// src/components/folio/SettlementDialog.jsx
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Checkbox } from '../ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { useFolio } from '../../context/FolioContext'
import { useAuth } from '../../context/AuthContext'
import { useReservations } from '../../context/ReservationContext'
import {
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Download,
  Printer,
  Mail,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  ChevronRight,
  FileText,
} from 'lucide-react'

export default function SettlementDialog({ open, onOpenChange, folio, reservation, totals, onSuccess }) {
  const { settleFolioAndClose, postPayment } = useFolio()
  const { user } = useAuth()
  const { checkOut } = useReservations()

  const [currentStep, setCurrentStep] = useState('review')
  const [loading, setLoading] = useState(false)

  // Settlement options
  const [updateReservationStatus, setUpdateReservationStatus] = useState(true)
  const [emailToGuest, setEmailToGuest] = useState(false)

  // Payment collection state
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Card payment details
  const [cardLastFour, setCardLastFour] = useState('')
  const [cardType, setCardType] = useState('')

  // Bank details
  const [bankName, setBankName] = useState('')
  const [chequeNumber, setChequeNumber] = useState('')
  const [chequeDate, setChequeDate] = useState('')
  const [upiId, setUpiId] = useState('')

  // Settlement result
  const [settlementResult, setSettlementResult] = useState(null)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('review')
      setLoading(false)
      setUpdateReservationStatus(true)
      setEmailToGuest(false)
      setPaymentMethod('cash')
      setPaymentAmount('')
      setReferenceNumber('')
      setNotes('')
      setCardLastFour('')
      setCardType('')
      setBankName('')
      setChequeNumber('')
      setChequeDate('')
      setUpiId('')
      setSettlementResult(null)

      // Pre-fill payment amount with outstanding balance
      if (totals && totals.balance > 0) {
        setPaymentAmount(totals.balance.toFixed(2))
      }
    }
  }, [open, totals])

  if (!folio || !reservation || !totals) {
    return null
  }

  const guestName = reservation.guests?.name || 'Guest'
  const roomNumber = reservation.rooms?.room_number || 'N/A'
  const checkInDate = reservation.check_in_date ? format(new Date(reservation.check_in_date), 'MMM dd, yyyy') : 'N/A'
  const checkOutDate = reservation.check_out_date ? format(new Date(reservation.check_out_date), 'MMM dd, yyyy') : 'N/A'

  const hasOutstandingBalance = totals.balance > 0
  const canSettle = !hasOutstandingBalance || currentStep === 'complete'

  const handleCollectPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount')
      return
    }

    setLoading(true)
    try {
      const paymentData = {
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        notes: notes,
        payment_status: 'completed',
        // Card details
        card_last_four: paymentMethod === 'card' ? cardLastFour : null,
        card_type: paymentMethod === 'card' ? cardType : null,
        // Bank details
        bank_name: paymentMethod === 'bank_transfer' ? bankName : null,
        cheque_number: paymentMethod === 'cheque' ? chequeNumber : null,
        cheque_date: paymentMethod === 'cheque' ? chequeDate : null,
        upi_id: paymentMethod === 'upi' ? upiId : null,
      }

      const result = await postPayment(folio.id, reservation.id, paymentData)

      if (result) {
        // Move to confirm step after successful payment
        setCurrentStep('confirm')
        // Reload totals would happen in parent component
        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Failed to process payment')
    } finally {
      setLoading(false)
    }
  }

  const handleSettle = async () => {
    setLoading(true)
    try {
      const result = await settleFolioAndClose(folio.id)

      if (result) {
        // Update reservation status if checkbox selected
        if (updateReservationStatus && reservation.id) {
          await checkOut(reservation.id)
        }

        // Store settlement result
        setSettlementResult({
          folioNumber: folio.folio_number,
          invoiceNumber: `INV-${folio.folio_number}`,
          settlementDate: new Date().toISOString(),
          totalAmount: totals.total_charges + totals.total_fees + totals.total_taxes,
          amountPaid: totals.total_payments,
          balance: totals.balance,
        })

        // Move to complete step
        setCurrentStep('complete')

        // TODO: Implement email sending if checkbox selected
        if (emailToGuest && reservation.guests?.email) {
          console.log('TODO: Send email to', reservation.guests.email)
        }

        if (onSuccess) {
          onSuccess()
        }
      }
    } catch (error) {
      console.error('Settlement error:', error)
      alert('Failed to settle folio')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadInvoice = () => {
    // TODO: Implement PDF generation
    console.log('Download invoice', settlementResult)
    alert('Invoice download feature coming soon')
  }

  const handlePrintInvoice = () => {
    // TODO: Implement print functionality
    console.log('Print invoice', settlementResult)
    window.print()
  }

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Guest & Reservation Info */}
      <div className="rounded-lg border p-4 bg-muted/50">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Guest Name</p>
            <p className="font-semibold">{guestName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Room Number</p>
            <p className="font-semibold">{roomNumber}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Check-in</p>
            <p className="font-medium">{checkInDate}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Check-out</p>
            <p className="font-medium">{checkOutDate}</p>
          </div>
        </div>
      </div>

      {/* Folio Summary */}
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">Folio Summary</h3>

        <div className="space-y-2 rounded-lg border p-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Room Charges</span>
            <span className="font-medium">₹{totals.total_charges.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Additional Fees</span>
            <span className="font-medium">₹{totals.total_fees.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Taxes (18% GST)</span>
            <span className="font-medium">₹{totals.total_taxes.toFixed(2)}</span>
          </div>
          {totals.total_discounts > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discounts</span>
              <span className="font-medium">-₹{totals.total_discounts.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between text-lg font-bold">
            <span>Total Amount</span>
            <span>₹{(totals.total_charges + totals.total_fees + totals.total_taxes).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
            <span className="font-medium">Total Payments</span>
            <span className="font-bold">₹{totals.total_payments.toFixed(2)}</span>
          </div>
          <div className={`border-t pt-2 flex justify-between text-xl font-bold ${
            totals.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            <span>Balance Due</span>
            <span>₹{totals.balance.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Outstanding balance warning */}
      {hasOutstandingBalance && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Outstanding Balance</AlertTitle>
          <AlertDescription>
            There is an outstanding balance of ₹{totals.balance.toFixed(2)}. Please collect payment before settling the folio.
          </AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        {hasOutstandingBalance ? (
          <Button onClick={() => setCurrentStep('payment')}>
            Collect Payment <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => setCurrentStep('confirm')}>
            Proceed to Settlement <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )

  const renderPaymentStep = () => (
    <div className="space-y-6">
      <Alert>
        <CreditCard className="h-4 w-4" />
        <AlertTitle>Collect Outstanding Payment</AlertTitle>
        <AlertDescription>
          Outstanding balance: ₹{totals.balance.toFixed(2)}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="paymentAmount">Payment Amount</Label>
          <Input
            id="paymentAmount"
            type="number"
            step="0.01"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="paymentMethod">Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger id="paymentMethod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Cash
                </div>
              </SelectItem>
              <SelectItem value="card">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Credit/Debit Card
                </div>
              </SelectItem>
              <SelectItem value="upi">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  UPI
                </div>
              </SelectItem>
              <SelectItem value="bank_transfer">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Bank Transfer
                </div>
              </SelectItem>
              <SelectItem value="cheque">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Cheque
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Card-specific fields */}
        {paymentMethod === 'card' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="cardType">Card Type</Label>
              <Select value={cardType} onValueChange={setCardType}>
                <SelectTrigger id="cardType">
                  <SelectValue placeholder="Select card type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="mastercard">Mastercard</SelectItem>
                  <SelectItem value="amex">American Express</SelectItem>
                  <SelectItem value="rupay">RuPay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cardLastFour">Last 4 Digits</Label>
              <Input
                id="cardLastFour"
                maxLength={4}
                value={cardLastFour}
                onChange={(e) => setCardLastFour(e.target.value)}
                placeholder="1234"
              />
            </div>
          </>
        )}

        {/* UPI-specific fields */}
        {paymentMethod === 'upi' && (
          <div className="space-y-2">
            <Label htmlFor="upiId">UPI ID</Label>
            <Input
              id="upiId"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="user@upi"
            />
          </div>
        )}

        {/* Bank transfer fields */}
        {paymentMethod === 'bank_transfer' && (
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank name"
            />
          </div>
        )}

        {/* Cheque fields */}
        {paymentMethod === 'cheque' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="chequeNumber">Cheque Number</Label>
              <Input
                id="chequeNumber"
                value={chequeNumber}
                onChange={(e) => setChequeNumber(e.target.value)}
                placeholder="123456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chequeDate">Cheque Date</Label>
              <Input
                id="chequeDate"
                type="date"
                value={chequeDate}
                onChange={(e) => setChequeDate(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
          <Input
            id="referenceNumber"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="Transaction reference"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Input
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setCurrentStep('review')} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleCollectPayment} disabled={loading}>
          {loading ? 'Processing...' : 'Collect Payment'}
        </Button>
      </div>
    </div>
  )

  const renderConfirmStep = () => (
    <div className="space-y-6">
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>Ready to Settle</AlertTitle>
        <AlertDescription>
          {totals.balance > 0
            ? `Note: There is still an outstanding balance of ₹${totals.balance.toFixed(2)}`
            : 'All payments have been collected. Ready to settle folio.'}
        </AlertDescription>
      </Alert>

      {/* Settlement summary */}
      <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
        <h3 className="font-semibold">Settlement Summary</h3>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Folio Number</span>
          <span className="font-medium">{folio.folio_number}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Guest</span>
          <span className="font-medium">{guestName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Amount</span>
          <span className="font-medium">₹{(totals.total_charges + totals.total_fees + totals.total_taxes).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Paid</span>
          <span className="font-medium text-emerald-600">₹{totals.total_payments.toFixed(2)}</span>
        </div>
        <div className={`flex justify-between text-sm font-bold ${
          totals.balance > 0 ? 'text-red-600' : 'text-emerald-600'
        }`}>
          <span>Final Balance</span>
          <span>₹{totals.balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Settlement options */}
      <div className="space-y-4">
        <h3 className="font-semibold">Settlement Options</h3>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="updateReservationStatus"
            checked={updateReservationStatus}
            onCheckedChange={setUpdateReservationStatus}
          />
          <label
            htmlFor="updateReservationStatus"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Update reservation status to "Checked-out"
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="emailToGuest"
            checked={emailToGuest}
            onCheckedChange={setEmailToGuest}
          />
          <label
            htmlFor="emailToGuest"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Email folio to guest {reservation.guests?.email && `(${reservation.guests.email})`}
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(hasOutstandingBalance ? 'payment' : 'review')}
          disabled={loading}
        >
          Back
        </Button>
        <Button onClick={handleSettle} disabled={loading}>
          {loading ? 'Settling...' : 'Settle Folio & Close'}
        </Button>
      </div>
    </div>
  )

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center py-6">
        <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-950 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-2xl font-bold mb-2">Settlement Successful!</h3>
        <p className="text-muted-foreground">
          Folio has been settled and closed successfully.
        </p>
      </div>

      {settlementResult && (
        <div className="rounded-lg border p-4 bg-muted/50 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice Number</span>
            <span className="font-medium">{settlementResult.invoiceNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Folio Number</span>
            <span className="font-medium">{settlementResult.folioNumber}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Settlement Date</span>
            <span className="font-medium">
              {format(new Date(settlementResult.settlementDate), 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Amount</span>
            <span className="font-medium">₹{settlementResult.totalAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount Paid</span>
            <span className="font-medium text-emerald-600">₹{settlementResult.amountPaid.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Button variant="outline" onClick={handleDownloadInvoice}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button variant="outline" onClick={handlePrintInvoice}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" disabled>
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </div>
    </div>
  )

  const getStepTitle = () => {
    switch (currentStep) {
      case 'review':
        return 'Review Folio'
      case 'payment':
        return 'Collect Payment'
      case 'confirm':
        return 'Confirm Settlement'
      case 'complete':
        return 'Settlement Complete'
      default:
        return 'Settle Folio'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {currentStep === 'review' && 'Review the folio details before settlement'}
            {currentStep === 'payment' && 'Collect outstanding payment from guest'}
            {currentStep === 'confirm' && 'Confirm settlement and choose options'}
            {currentStep === 'complete' && 'Folio has been successfully settled'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress indicator */}
        {currentStep !== 'complete' && (
          <div className="flex items-center justify-center gap-2 py-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'review' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              1
            </div>
            <div className="h-0.5 w-12 bg-muted" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'payment' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              2
            </div>
            <div className="h-0.5 w-12 bg-muted" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep === 'confirm' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              3
            </div>
          </div>
        )}

        {/* Step content */}
        <div className="py-4">
          {currentStep === 'review' && renderReviewStep()}
          {currentStep === 'payment' && renderPaymentStep()}
          {currentStep === 'confirm' && renderConfirmStep()}
          {currentStep === 'complete' && renderCompleteStep()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
