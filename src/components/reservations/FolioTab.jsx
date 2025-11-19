import { useState, useEffect, useMemo } from 'react'
import { Plus, Edit2, Trash2, Receipt, CreditCard, Tag, Download } from 'lucide-react'
import { useBilling } from '../../context/BillingContext'
import { getPaymentsByReservation, getDiscountApplicationsByReservation } from '../../lib/supabase'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'

export default function FolioTab({ reservationIds, primaryReservation }) {
  const { bills, addBillItem, removeBillItem, updateBillItemData, addPayment, removePayment, addBill } = useBilling()

  const [payments, setPayments] = useState([])
  const [discountApplications, setDiscountApplications] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showAddChargeModal, setShowAddChargeModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState(null)

  // Form states
  const [chargeForm, setChargeForm] = useState({
    description: '',
    quantity: 1,
    rate: 0,
    billType: 'Other Sales'
  })

  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    paymentMethod: 'Cash',
    notes: ''
  })

  const [discountForm, setDiscountForm] = useState({
    discountId: '',
    amount: 0
  })

  const billTypes = [
    'Room', 'Food', 'Spa', 'Conference', 'Laundry', 'Bar',
    'KOT', 'BOT', 'Extra Bed', 'Other Sales'
  ]

  const paymentMethods = ['Cash', 'Card', 'UPI', 'Bank Transfer', 'Cheque', 'Other']

  // Get all bills for these reservations
  const reservationBills = useMemo(() => {
    return bills.filter(bill => reservationIds.includes(bill.reservation_id))
  }, [bills, reservationIds])

  // Get all bill items from all bills
  const allCharges = useMemo(() => {
    const charges = []
    reservationBills.forEach(bill => {
      if (bill.bill_items && bill.bill_items.length > 0) {
        bill.bill_items.forEach(item => {
          charges.push({
            ...item,
            billId: bill.id,
            billType: bill.bill_type,
            date: item.created_at || bill.created_at
          })
        })
      }
    })
    return charges.sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [reservationBills])

  // Load payments and discounts
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)

      // Load payments for all reservations
      const allPayments = []
      for (const resId of reservationIds) {
        const { data } = await getPaymentsByReservation(resId)
        if (data) {
          allPayments.push(...data)
        }
      }
      setPayments(allPayments)

      // Load discount applications for all reservations
      const allDiscounts = []
      for (const resId of reservationIds) {
        const { data } = await getDiscountApplicationsByReservation(resId)
        if (data) {
          allDiscounts.push(...data)
        }
      }
      setDiscountApplications(allDiscounts)

      setLoading(false)
    }

    if (reservationIds && reservationIds.length > 0) {
      loadData()
    }
  }, [reservationIds, bills])

  // Calculate totals
  const totals = useMemo(() => {
    // Calculate charges subtotal
    const chargesSubtotal = allCharges.reduce((sum, charge) => {
      return sum + ((charge.quantity || 1) * (charge.rate || 0))
    }, 0)

    // Calculate room charges from reservation data
    const roomCharges = reservationBills.reduce((sum, bill) => {
      if (bill.bill_type === 'Room') {
        return sum + (bill.subtotal || 0)
      }
      return sum
    }, 0)

    // Total before discount
    const subtotalBeforeDiscount = chargesSubtotal + roomCharges

    // Calculate total discounts
    const totalDiscount = discountApplications.reduce((sum, app) => {
      return sum + (app.discount_amount || 0)
    }, 0)

    // Subtotal after discount
    const subtotal = subtotalBeforeDiscount - totalDiscount

    // Calculate tax (18% GST)
    const tax = subtotal * 0.18

    // Grand total
    const total = subtotal + tax

    // Total paid
    const totalPaid = payments.reduce((sum, payment) => {
      return sum + (payment.amount || 0)
    }, 0)

    // Balance due
    const balance = total - totalPaid

    return {
      subtotalBeforeDiscount,
      totalDiscount,
      subtotal,
      tax,
      total,
      totalPaid,
      balance,
      roomCharges,
      otherCharges: chargesSubtotal
    }
  }, [allCharges, reservationBills, payments, discountApplications])

  // Get or create main bill for adding charges
  const getMainBill = async () => {
    // Try to find an existing "Other Sales" bill
    let mainBill = reservationBills.find(b => b.bill_type === 'Other Sales' || b.bill_type === chargeForm.billType)

    // If no bill exists, create one
    if (!mainBill) {
      const newBillData = {
        reservation_id: primaryReservation.id,
        bill_type: chargeForm.billType,
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paid_amount: 0,
        balance: 0,
        payment_status: 'Pending',
        notes: 'Folio charges'
      }

      const createdBill = await addBill({ ...newBillData, items: [] })
      return createdBill
    }

    return mainBill
  }

  // Handle add/edit charge
  const handleSaveCharge = async () => {
    const bill = await getMainBill()
    if (!bill) return

    const itemData = {
      description: chargeForm.description,
      quantity: parseFloat(chargeForm.quantity) || 1,
      rate: parseFloat(chargeForm.rate) || 0,
      amount: (parseFloat(chargeForm.quantity) || 1) * (parseFloat(chargeForm.rate) || 0)
    }

    if (editingCharge) {
      await updateBillItemData(editingCharge.id, itemData)
    } else {
      await addBillItem(bill.id, itemData)
    }

    // Recalculate bill totals
    await updateBillTotals(bill.id)

    resetChargeForm()
  }

  // Update bill totals after adding/editing/removing items
  const updateBillTotals = async (billId) => {
    const bill = bills.find(b => b.id === billId)
    if (!bill) return

    const billItems = bill.bill_items || []
    const subtotal = billItems.reduce((sum, item) => sum + ((item.quantity || 1) * (item.rate || 0)), 0)
    const tax = subtotal * 0.18
    const total = subtotal + tax

    // Note: This would need to be implemented in BillingContext
    // For now, the totals will recalculate on next load
  }

  // Handle delete charge
  const handleDeleteCharge = async (charge) => {
    if (confirm('Are you sure you want to delete this charge?')) {
      await removeBillItem(charge.id)
      await updateBillTotals(charge.billId)
    }
  }

  // Handle post payment
  const handlePostPayment = async () => {
    const bill = await getMainBill()
    if (!bill) return

    const paymentData = {
      bill_id: bill.id,
      amount: parseFloat(paymentForm.amount) || 0,
      payment_method: paymentForm.paymentMethod,
      notes: paymentForm.notes,
      payment_date: new Date().toISOString()
    }

    await addPayment(paymentData)

    resetPaymentForm()

    // Reload payments
    const { data } = await getPaymentsByReservation(primaryReservation.id)
    if (data) setPayments(data)
  }

  // Handle delete payment
  const handleDeletePayment = async (payment) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      await removePayment(payment.id, payment.bill_id, payment.amount)

      // Reload payments
      const { data } = await getPaymentsByReservation(primaryReservation.id)
      if (data) setPayments(data)
    }
  }

  // Reset forms
  const resetChargeForm = () => {
    setChargeForm({
      description: '',
      quantity: 1,
      rate: 0,
      billType: 'Other Sales'
    })
    setEditingCharge(null)
    setShowAddChargeModal(false)
  }

  const resetPaymentForm = () => {
    setPaymentForm({
      amount: 0,
      paymentMethod: 'Cash',
      notes: ''
    })
    setShowPaymentModal(false)
  }

  // Edit charge
  const handleEditCharge = (charge) => {
    setEditingCharge(charge)
    setChargeForm({
      description: charge.description || '',
      quantity: charge.quantity || 1,
      rate: charge.rate || 0,
      billType: charge.billType || 'Other Sales'
    })
    setShowAddChargeModal(true)
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={() => setShowAddChargeModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Charge
        </Button>
        <Button onClick={() => setShowPaymentModal(true)} variant="outline" className="gap-2">
          <CreditCard className="h-4 w-4" />
          Post Payment
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Print Folio
        </Button>
      </div>

      {/* Charges Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Charges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allCharges.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No charges found
                  </TableCell>
                </TableRow>
              )}
              {allCharges.map((charge) => (
                <TableRow key={charge.id}>
                  <TableCell className="text-sm">
                    {new Date(charge.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{charge.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{charge.billType}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{charge.quantity}</TableCell>
                  <TableCell className="text-right">₹{charge.rate?.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">
                    ₹{((charge.quantity || 1) * (charge.rate || 0)).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditCharge(charge)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCharge(charge)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No payments recorded
                  </TableCell>
                </TableRow>
              )}
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-sm">
                    {new Date(payment.created_at || payment.payment_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {payment.notes || '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-emerald-600">
                    ₹{payment.amount?.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePayment(payment)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Discounts Table */}
      {discountApplications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Discounts Applied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead className="text-right">Original Amount</TableHead>
                  <TableHead className="text-right">Discount Amount</TableHead>
                  <TableHead className="text-right">Final Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discountApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="text-sm">
                      {new Date(app.applied_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{app.discounts?.name || 'Discount'}</TableCell>
                    <TableCell className="text-right">₹{app.original_amount?.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      -₹{app.discount_amount?.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ₹{app.final_amount?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Summary Card */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Folio Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Room Charges:</span>
              <span className="font-medium">₹{totals.roomCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Other Charges:</span>
              <span className="font-medium">₹{totals.otherCharges.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (Before Discount):</span>
              <span className="font-medium">₹{totals.subtotalBeforeDiscount.toFixed(2)}</span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Discounts:</span>
                <span className="font-medium text-red-600">-₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (18% GST):</span>
              <span className="font-medium">₹{totals.tax.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex justify-between text-base font-bold">
              <span>Grand Total:</span>
              <span>₹{totals.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base">
              <span className="text-emerald-600">Total Paid:</span>
              <span className="font-semibold text-emerald-600">₹{totals.totalPaid.toFixed(2)}</span>
            </div>
            <div className="h-px bg-border my-2"></div>
            <div className="flex justify-between text-lg font-bold">
              <span className={totals.balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                Balance Due:
              </span>
              <span className={totals.balance > 0 ? 'text-red-600' : 'text-emerald-600'}>
                ₹{totals.balance.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Charge Modal */}
      <Dialog open={showAddChargeModal} onOpenChange={setShowAddChargeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCharge ? 'Edit Charge' : 'Add Charge'}</DialogTitle>
            <DialogDescription>
              {editingCharge ? 'Update the charge details below.' : 'Add a new charge to the folio.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="billType">Charge Type</Label>
              <Select
                value={chargeForm.billType}
                onValueChange={(value) => setChargeForm({ ...chargeForm, billType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {billTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={chargeForm.description}
                onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })}
                placeholder="Enter charge description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={chargeForm.quantity}
                  onChange={(e) => setChargeForm({ ...chargeForm, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rate">Rate (₹)</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={chargeForm.rate}
                  onChange={(e) => setChargeForm({ ...chargeForm, rate: e.target.value })}
                />
              </div>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-bold">
                  ₹{((parseFloat(chargeForm.quantity) || 0) * (parseFloat(chargeForm.rate) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetChargeForm}>
              Cancel
            </Button>
            <Button onClick={handleSaveCharge}>
              {editingCharge ? 'Update Charge' : 'Add Charge'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post Payment Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Payment</DialogTitle>
            <DialogDescription>
              Record a payment for this reservation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Amount (₹)</Label>
              <Input
                id="paymentAmount"
                type="number"
                min="0"
                step="0.01"
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Balance Due: ₹{totals.balance.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select
                value={paymentForm.paymentMethod}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map(method => (
                    <SelectItem key={method} value={method}>{method}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
              <Textarea
                id="paymentNotes"
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                placeholder="Add any notes about this payment..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetPaymentForm}>
              Cancel
            </Button>
            <Button onClick={handlePostPayment}>
              Post Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
