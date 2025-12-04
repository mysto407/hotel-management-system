import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { Loader2, CreditCard, Banknote, Smartphone, Building2, CircleDollarSign, Wallet, Link2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { createPaymentTransaction } from '@/lib/supabase'
import { formatCurrency } from '@/utils/currency'

// Payment method configurations
const PAYMENT_CONFIG = {
  cash: { icon: Banknote, color: 'text-green-600 bg-green-50', label: 'Cash' },
  card: { icon: CreditCard, color: 'text-blue-600 bg-blue-50', label: 'Card' },
  upi: { icon: Smartphone, color: 'text-purple-600 bg-purple-50', label: 'UPI' },
  bank_transfer: { icon: Building2, color: 'text-orange-600 bg-orange-50', label: 'Bank Transfer' },
  cheque: { icon: CircleDollarSign, color: 'text-teal-600 bg-teal-50', label: 'Cheque' },
  other: { icon: CircleDollarSign, color: 'text-gray-600 bg-gray-50', label: 'Other' },
  default: { icon: Wallet, color: 'text-gray-600 bg-gray-50', label: 'Payment' }
}

export default function AddPaymentModal({
  open,
  onOpenChange,
  reservationId,
  primaryReservation,
  groupedReservations = [],
  guests = [],
  folios = [],
  activeFolioId = null,
  balanceDue = 0,
  onSuccess
}) {
  const [loading, setLoading] = useState(false)
  const [assignedGuestId, setAssignedGuestId] = useState('')
  const [selectedFolioId, setSelectedFolioId] = useState(activeFolioId)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [useCurrentDateTime, setUseCurrentDateTime] = useState(true)
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [transactionTime, setTransactionTime] = useState(format(new Date(), 'HH:mm'))
  const [notes, setNotes] = useState('')

  // Build list of guests from reservation
  const reservationGuests = useMemo(() => {
    if (!primaryReservation || !guests.length) return []

    const guestList = []

    // Primary guest
    if (primaryReservation.guest_id) {
      const primaryGuest = guests.find(g => g.id === primaryReservation.guest_id)
      if (primaryGuest) {
        guestList.push({ ...primaryGuest, isPrimary: true })
      }
    }

    // Additional guests from all reservations in the group
    const allAdditionalGuestIds = new Set()
    groupedReservations.forEach(res => {
      const additionalIds = res.additional_guest_ids || []
      additionalIds.forEach(id => allAdditionalGuestIds.add(id))
    })

    allAdditionalGuestIds.forEach(guestId => {
      if (guestId !== primaryReservation.guest_id) {
        const guest = guests.find(g => g.id === guestId)
        if (guest) {
          guestList.push({ ...guest, isPrimary: false })
        }
      }
    })

    return guestList
  }, [primaryReservation, groupedReservations, guests])

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Default to primary guest
      const primaryGuestId = primaryReservation?.guest_id || ''
      setAssignedGuestId(primaryGuestId)
      setSelectedFolioId(activeFolioId || (folios.length > 0 ? folios[0].id : null))
      // Pre-fill with balance due if positive
      setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '')
      setPaymentMethod('cash')
      setUseCurrentDateTime(true)
      setTransactionDate(format(new Date(), 'yyyy-MM-dd'))
      setTransactionTime(format(new Date(), 'HH:mm'))
      setNotes('')
    }
  }, [open, balanceDue, activeFolioId, folios, primaryReservation])

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
      const methodConfig = PAYMENT_CONFIG[paymentMethod] || PAYMENT_CONFIG.default
      const description = methodConfig.label

      // Determine transaction datetime
      let transactionDateTime
      if (useCurrentDateTime) {
        transactionDateTime = new Date().toISOString()
      } else {
        transactionDateTime = new Date(`${transactionDate}T${transactionTime}`).toISOString()
      }

      const result = await createPaymentTransaction({
        reservation_id: reservationId,
        folio_id: selectedFolioId,
        amount: paymentAmount,
        payment_method: paymentMethod,
        description,
        notes,
        transaction_status: 'posted',
        transaction_date: transactionDateTime,
        // Include assigned guest for reference
        metadata: assignedGuestId ? { assigned_to_guest_id: assignedGuestId } : undefined
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

  // Get config for selected payment method
  const selectedConfig = PAYMENT_CONFIG[paymentMethod] || PAYMENT_CONFIG.default
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
            {/* Assign to Guest */}
            <div className="space-y-2">
              <Label htmlFor="assignedGuest">Assign to</Label>
              <Select value={assignedGuestId} onValueChange={setAssignedGuestId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select guest" />
                </SelectTrigger>
                <SelectContent>
                  {reservationGuests.map(guest => (
                    <SelectItem key={guest.id} value={guest.id}>
                      {guest.name}{guest.isPrimary ? ' (Primary)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Select Folio */}
            <div className="space-y-2">
              <Label htmlFor="folio">Select Folio</Label>
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

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setAmount(val)
                  }
                }}
                placeholder="0.00"
                className="text-lg h-12"
              />
            </div>

            {/* Payment Type with grouped options */}
            <div className="space-y-2">
              <Label htmlFor="paymentType">Payment Type</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Select payment type" />
                </SelectTrigger>
                <SelectContent>
                  {/* Process section - Coming Soon */}
                  <SelectGroup>
                    <SelectLabel className="text-muted-foreground text-xs uppercase tracking-wide">
                      Process (Coming Soon)
                    </SelectLabel>
                    <SelectItem value="pay_link" disabled className="opacity-50">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Pay by Link
                      </div>
                    </SelectItem>
                    <SelectItem value="add_card" disabled className="opacity-50">
                      <div className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Add Credit Card
                      </div>
                    </SelectItem>
                  </SelectGroup>

                  <SelectSeparator />

                  {/* Record Only section */}
                  <SelectGroup>
                    <SelectLabel className="text-xs uppercase tracking-wide">
                      Record Only
                    </SelectLabel>
                    <SelectItem value="cash">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-green-600" />
                        Cash
                      </div>
                    </SelectItem>
                    <SelectItem value="card">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        Card
                      </div>
                    </SelectItem>
                    <SelectItem value="upi">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-purple-600" />
                        UPI
                      </div>
                    </SelectItem>
                    <SelectItem value="bank_transfer">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-orange-600" />
                        Bank Transfer
                      </div>
                    </SelectItem>
                    <SelectItem value="cheque">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-teal-600" />
                        Cheque
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center gap-2">
                        <CircleDollarSign className="h-4 w-4 text-gray-600" />
                        Other
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Post with current date and time checkbox */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="useCurrentDateTime"
                  checked={useCurrentDateTime}
                  onCheckedChange={setUseCurrentDateTime}
                />
                <Label htmlFor="useCurrentDateTime" className="cursor-pointer">
                  Post with current date and time
                </Label>
              </div>

              {/* Date and time fields when checkbox is unchecked */}
              {!useCurrentDateTime && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div className="space-y-1">
                    <Label htmlFor="transactionDate" className="text-xs text-muted-foreground">Date</Label>
                    <Input
                      id="transactionDate"
                      type="date"
                      value={transactionDate}
                      onChange={(e) => setTransactionDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="transactionTime" className="text-xs text-muted-foreground">Time</Label>
                    <Input
                      id="transactionTime"
                      type="time"
                      value={transactionTime}
                      onChange={(e) => setTransactionTime(e.target.value)}
                    />
                  </div>
                </div>
              )}
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

          {/* Footer with summary and buttons */}
          <div className="border-t bg-muted/30 px-6 py-4 space-y-3 shrink-0">
            {/* Payment Summary */}
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
