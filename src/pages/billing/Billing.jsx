// src/pages/billing/Billing.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, DollarSign, FileText, Printer, Receipt } from 'lucide-react';
import { useBilling } from '../../context/BillingContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useConfirm, useAlert } from '@/context/AlertContext';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const Billing = () => {
  const { bills, addBill, updateBill, deleteBill, recordPayment, getBillsByReservation, getMasterBill } = useBilling();
  const { reservations } = useReservations();
  const { rooms } = useRooms();
  const confirm = useConfirm();
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMasterBillModalOpen, setIsMasterBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    reservation_id: '',
    bill_type: 'Room',
    items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    paid_amount: 0,
    balance: 0,
    payment_status: 'Pending',
    notes: ''
  });

  const [paymentAmount, setPaymentAmount] = useState(0);

  const billTypes = [
    'Room', 'Food', 'Spa', 'Conference', 'Laundry', 'Bar', 
    'KOT', 'BOT', 'Extra Bed', 'Other Sales', 'Cancellation Charges'
  ];

  const handleReservationChange = (reservationId) => {
    setFormData({ ...formData, reservation_id: reservationId });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0, amount: 0 }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.discount);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = (parseFloat(newItems[index].quantity) || 0) * (parseFloat(newItems[index].rate) || 0);
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems, formData.discount);
  };
  
  const handleDiscountChange = (discountValue) => {
    const discount = parseFloat(discountValue) || 0;
    setFormData(prev => ({ ...prev, discount }));
    calculateTotals(formData.items, discount);
  };

  const calculateTotals = (items, discount) => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax - discount;
    const balance = total - formData.paid_amount;
    
    setFormData(prev => ({
      ...prev,
      items,
      subtotal,
      tax,
      total,
      balance,
      payment_status: balance <= 0 ? 'Paid' : balance === total ? 'Pending' : 'Partial'
    }));
  };

  const handleSubmit = async () => {
    const billData = {
      reservation_id: formData.reservation_id,
      bill_type: formData.bill_type,
      subtotal: formData.subtotal,
      tax: formData.tax,
      discount: formData.discount,
      total: formData.total,
      paid_amount: formData.paid_amount,
      balance: formData.balance,
      payment_status: formData.payment_status,
      notes: formData.notes,
    };
  
    if (editingBill) {
      // UpdateBill doesn't handle items update in context, this is a limitation
      await updateBill(editingBill.id, billData);
    } else {
      // addBill (via createBillAPI) handles items
      await addBill({ ...billData, items: formData.items });
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      reservation_id: '', bill_type: 'Room',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0, tax: 0, discount: 0, total: 0,
      paid_amount: 0, balance: 0, payment_status: 'Pending', notes: ''
    });
    setEditingBill(null);
    setIsModalOpen(false);
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setFormData({
      reservation_id: bill.reservation_id,
      bill_type: bill.bill_type,
      items: bill.bill_items || [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: bill.subtotal,
      tax: bill.tax,
      discount: bill.discount,
      total: bill.total,
      paid_amount: bill.paid_amount,
      balance: bill.balance,
      payment_status: bill.payment_status,
      notes: bill.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (billId) => {
    const confirmed = await confirm({
      title: 'Delete Bill',
      message: 'Are you sure you want to delete this bill?',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteBill(billId);
    }
  };

  const handlePayment = (bill) => {
    setSelectedBill(bill);
    setPaymentAmount(0);
    setIsPaymentModalOpen(true);
  };

  const processPayment = () => {
    const amount = parseFloat(paymentAmount);
    if (amount > 0 && amount <= selectedBill.balance) {
      recordPayment(selectedBill.id, amount);
      setIsPaymentModalOpen(false);
      setSelectedBill(null);
      setPaymentAmount(0);
    } else {
      showError('Invalid payment amount. Must be greater than 0 and less than or equal to the balance.');
    }
  };

  const viewMasterBill = (reservationId) => {
    const masterBill = getMasterBill(reservationId);
    setSelectedReservation(masterBill);
    setIsMasterBillModalOpen(true);
  };

  const printBill = (bill) => {
    // This is a simple print, replace with a dedicated print component for formatted output
    showInfo("Printing is not fully implemented. This would open a print dialog.");
    // window.print(); // <-- This would print the whole page
  };

  const filteredBills = bills
  .filter(b => filterStatus === 'all' || b.payment_status === filterStatus)
  .filter(b => 
    b.reservations?.guests?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.reservations?.rooms?.room_number?.includes(searchTerm) ||
    b.bill_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getPaymentStatusVariant = (status) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Partial': return 'warning';
      case 'Pending': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Billing</h1>
        <Button onClick={() => { setEditingBill(null); setIsModalOpen(true); }}>
          <Plus size={20} className="mr-2" /> Create Bill
        </Button>
      </div>

      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by guest, room, or bill type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Bills</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill #</TableHead>
                <TableHead>Guest Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Bill Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map(bill => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">#{bill.id}</TableCell>
                  <TableCell>{bill.reservations?.guests?.name || 'Unknown'}</TableCell>
                  <TableCell>{bill.reservations?.rooms?.room_number || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{bill.bill_type}</Badge>
                  </TableCell>
                  <TableCell>{new Date(bill.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>₹{bill.total.toFixed(2)}</TableCell>
                  <TableCell>₹{bill.paid_amount.toFixed(2)}</TableCell>
                  <TableCell>₹{bill.balance.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusVariant(bill.payment_status)}>
                      {bill.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {bill.balance > 0 && (
                        <Button
                          onClick={() => handlePayment(bill)}
                          variant="ghost" size="icon" title="Record Payment"
                        >
                          <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </Button>
                      )}
                      <Button
                        onClick={() => printBill(bill)}
                        variant="ghost" size="icon" title="Print"
                      >
                        <Printer size={16} className="text-muted-foreground" />
                      </Button>
                      <Button onClick={() => handleEdit(bill)} variant="ghost" size="icon" title="Edit">
                        <Edit2 size={16} className="text-primary" />
                      </Button>
                      <Button onClick={() => handleDelete(bill.id)} variant="ghost" size="icon" title="Delete">
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Master Bills</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reservations.filter(r => r.status === 'Checked-in' || r.status === 'Checked-out').map(reservation => {
            const masterBill = getMasterBill(reservation.id);
            if (!masterBill) return null;
            
            return (
              <Card key={reservation.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{masterBill.guestName}</CardTitle>
                  <p className="text-sm text-muted-foreground">Room: {masterBill.roomNumber}</p>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-3xl font-bold">₹{masterBill.grandTotal.toFixed(2)}</p>
                  <p className="text-sm font-medium">
                    Balance: <span className="text-destructive font-bold">₹{masterBill.balance.toFixed(2)}</span>
                  </p>
                  <Button
                    onClick={() => viewMasterBill(reservation.id)}
                    className="w-full"
                  >
                    <Receipt size={16} className="mr-2" /> View Master Bill
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Bill Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Bill' : 'Create Bill'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reservation *</Label>
                <Select
                  value={formData.reservation_id}
                  onValueChange={handleReservationChange}
                  disabled={!!editingBill}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Reservation" />
                  </SelectTrigger>
                  <SelectContent>
                    {reservations.filter(r => r.status === 'Checked-in' || r.status === 'Checked-out').map(r => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.guests?.name || 'Unknown'} - Room {rooms.find(room => room.id === r.room_id)?.room_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bill Type *</Label>
                <Select
                  value={formData.bill_type}
                  onValueChange={(value) => setFormData({...formData, bill_type: value})}
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
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-semibold">Items</h4>
                <Button onClick={addItem} size="sm">
                  <Plus size={16} className="mr-2" /> Add Item
                </Button>
              </div>
              
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      type="number"
                      placeholder="Rate"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', e.target.value)}
                      className="w-24"
                    />
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={item.amount.toFixed(2)}
                      readOnly
                      className="w-28 bg-muted/30"
                    />
                    {formData.items.length > 1 && (
                      <Button
                        onClick={() => removeItem(index)}
                        variant="ghost" size="icon"
                      >
                        <Trash2 size={16} className="text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/30 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{formData.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tax (18% GST):</span>
                <span>₹{formData.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <Label htmlFor="discount" className="text-muted-foreground">Discount:</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount}
                  onChange={(e) => handleDiscountChange(e.target.value)}
                  className="w-28 h-8 text-right"
                  placeholder="0.00"
                />
              </div>
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t">
                <span>Total:</span>
                <span>₹{formData.total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2 mt-4">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows="2"
                placeholder="Additional notes..."
              />
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              <Save size={18} className="mr-2" /> Save Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="py-4 space-y-4">
              <Alert>
                <AlertTitle className="font-semibold">{selectedBill.reservations?.guests?.name}</AlertTitle>
                <AlertDescription>
                  <p>Bill Type: {selectedBill.bill_type}</p>
                  <p>Total: ₹{selectedBill.total.toFixed(2)}</p>
                  <p>Paid: ₹{selectedBill.paid_amount.toFixed(2)}</p>
                  <strong className="block mt-2 text-base">
                    Balance Due: ₹{selectedBill.balance.toFixed(2)}
                  </strong>
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="payment_amount">Payment Amount *</Label>
                <Input
                  id="payment_amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                  max={selectedBill.balance}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum: ₹{selectedBill.balance.toFixed(2)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={processPayment}>
              <DollarSign size={18} className="mr-2" /> Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Master Bill Modal */}
      <Dialog open={isMasterBillModalOpen} onOpenChange={setIsMasterBillModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Master Bill</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="py-4">
              <div className="text-center mb-4 p-4 bg-muted/30 rounded-lg">
                <h2 className="text-xl font-bold">{selectedReservation.guestName}</h2>
                <p className="text-muted-foreground">Room: {selectedReservation.roomNumber}</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedReservation.bills.map(bill => (
                    <TableRow key={bill.id}>
                      <TableCell>{bill.bill_type}</TableCell>
                      <TableCell>₹{bill.total.toFixed(2)}</TableCell>
                      <TableCell>₹{bill.paid_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{bill.balance.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-medium">₹{selectedReservation.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span className="font-medium">₹{selectedReservation.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Discount:</span>
                  <span className="font-medium">- ₹{selectedReservation.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>₹{selectedReservation.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  <span>Total Paid:</span>
                  <span>₹{selectedReservation.totalPaid.toFixed(2)}</span>
                </div>
                <div className={cn(
                  "flex justify-between text-lg font-bold",
                  selectedReservation.balance > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  <span>Balance Due:</span>
                  <span>₹{selectedReservation.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => window.print()} variant="default">
              <Printer size={18} className="mr-2" /> Print Master Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Billing;