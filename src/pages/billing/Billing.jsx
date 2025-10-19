// ==========================================
// FILE: src/pages/billing/Billing.jsx
// ==========================================
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, DollarSign, FileText, Printer, Receipt } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { useBilling } from '../../context/BillingContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';

const Billing = () => {
  const { bills, addBill, updateBill, deleteBill, recordPayment, getBillsByReservation, getMasterBill } = useBilling();
  const { reservations } = useReservations();
  const { rooms } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMasterBillModalOpen, setIsMasterBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');


const [formData, setFormData] = useState({
  reservation_id: '',        // Changed from reservationId
  bill_type: 'Room',         // Changed from billType
  items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
  subtotal: 0,
  tax: 0,
  discount: 0,
  total: 0,
  paid_amount: 0,           // Changed from paidAmount
  balance: 0,
  payment_status: 'Pending', // Changed from paymentStatus
  notes: ''
});

  const [paymentAmount, setPaymentAmount] = useState(0);

  const billTypes = [
    'Room', 'Food', 'Spa', 'Conference', 'Laundry', 'Bar', 
    'KOT', 'BOT', 'Extra Bed', 'Other Sales', 'Cancellation Charges'
  ];

  const handleReservationChange = (reservationId) => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (reservation) {
      const room = rooms.find(r => r.id === reservation.room_id);
      setFormData({
        ...formData,
        reservation_id: reservation.id,  // Changed from reservationId
        guestName: reservation.guests?.name || 'Unknown',
        roomNumber: room?.room_number || ''
      });
    }
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
    calculateTotals(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    if (field === 'quantity' || field === 'rate') {
      newItems[index].amount = newItems[index].quantity * newItems[index].rate;
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotals(newItems);
  };

  const calculateTotals = (items) => {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax - formData.discount;
    const balance = total - formData.paidAmount;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      tax,
      total,
      balance,
      paymentStatus: balance === 0 ? 'Paid' : balance === total ? 'Pending' : 'Partial'
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
      items: formData.items  // Will be handled by context
    };
  
    if (editingBill) {
      await updateBill(editingBill.id, billData);
    } else {
      await addBill(billData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      reservationId: '',
      guestName: '',
      roomNumber: '',
      billType: 'Room',
      items: [{ description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      paidAmount: 0,
      balance: 0,
      paymentStatus: 'Pending',
      notes: ''
    });
    setEditingBill(null);
    setIsModalOpen(false);
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setFormData(bill);
    setIsModalOpen(true);
  };

  const handleDelete = (billId) => {
    if (window.confirm('Are you sure you want to delete this bill?')) {
      deleteBill(billId);
    }
  };

  const handlePayment = (bill) => {
    setSelectedBill(bill);
    setPaymentAmount(0);
    setIsPaymentModalOpen(true);
  };

  const processPayment = () => {
    if (paymentAmount > 0 && paymentAmount <= selectedBill.balance) {
      recordPayment(selectedBill.id, parseFloat(paymentAmount));
      setIsPaymentModalOpen(false);
      setSelectedBill(null);
      setPaymentAmount(0);
    } else {
      alert('Invalid payment amount');
    }
  };

  const viewMasterBill = (reservationId) => {
    const masterBill = getMasterBill(reservationId);
    setSelectedReservation(masterBill);
    setIsMasterBillModalOpen(true);
  };

  const printBill = (bill) => {
    window.print();
  };

  const filteredBills = bills
  .filter(b => filterStatus === 'all' || b.payment_status === filterStatus)
  .filter(b => 
    b.reservations?.guests?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.reservations?.rooms?.room_number?.includes(searchTerm) ||
    b.bill_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Billing</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> Create Bill
        </button>
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by guest, room, or bill type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Bills</option>
            <option value="Pending">Pending</option>
            <option value="Partial">Partial</option>
            <option value="Paid">Paid</option>
          </select>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Guest Name</th>
              <th>Room</th>
              <th>Bill Type</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
  {filteredBills.map(bill => (
    <tr key={bill.id}>
      <td><strong>#{bill.id}</strong></td>
      <td>{bill.reservations?.guests?.name || 'Unknown'}</td>
      <td>{bill.reservations?.rooms?.room_number || 'N/A'}</td>
      <td>
        <span className="bill-type-badge">{bill.bill_type}</span>
      </td>
      <td>{bill.created_at?.split('T')[0]}</td>
      <td>₹{bill.total.toFixed(2)}</td>
      <td>₹{bill.paid_amount.toFixed(2)}</td>
      <td>₹{bill.balance.toFixed(2)}</td>
      <td>
        <span className={`status-badge ${
          bill.payment_status === 'Paid' ? 'status-available' :
          bill.payment_status === 'Partial' ? 'status-maintenance' :
          'status-blocked'
        }`}>
          {bill.payment_status}
        </span>
      </td>
                <td>
                  <div className="action-buttons">
                    {bill.balance > 0 && (
                      <button
                        onClick={() => handlePayment(bill)}
                        className="btn-icon btn-success"
                        title="Record Payment"
                      >
                        <DollarSign size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => printBill(bill)}
                      className="btn-icon"
                      title="Print"
                      style={{ color: '#6b7280' }}
                    >
                      <Printer size={16} />
                    </button>
                    <button onClick={() => handleEdit(bill)} className="btn-icon btn-edit">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleDelete(bill.id)} className="btn-icon btn-delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>Master Bills</h2>
        <div className="stats-grid">
          {reservations.filter(r => r.status === 'Checked-in' || r.status === 'Checked-out').map(reservation => {
            const masterBill = getMasterBill(reservation.id);
            if (!masterBill) return null;
            
            return (
              <Card key={reservation.id}>
                <div>
                  <p style={{ color: '#6b7280', fontSize: '14px' }}>{reservation.guestName}</p>
                  <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937', margin: '8px 0' }}>
                    ₹{masterBill.grandTotal.toFixed(2)}
                  </p>
                  <p style={{ fontSize: '13px', color: '#6b7280' }}>
                    Balance: ₹{masterBill.balance.toFixed(2)}
                  </p>
                  <button
                    onClick={() => viewMasterBill(reservation.id)}
                    className="btn-primary"
                    style={{ marginTop: '12px', fontSize: '14px', padding: '8px 16px' }}
                  >
                    <Receipt size={16} /> View Master Bill
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Create/Edit Bill Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingBill ? 'Edit Bill' : 'Create Bill'}
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Reservation *</label>
            <select
  value={formData.reservation_id}
  onChange={(e) => handleReservationChange(e.target.value)}
  disabled={editingBill}
>
  <option value="">Select Reservation</option>
  {reservations.filter(r => r.status === 'Checked-in' || r.status === 'Checked-out').map(r => (
    <option key={r.id} value={r.id}>
      {r.guests?.name || 'Unknown'} - Room {rooms.find(room => room.id === r.room_id)?.room_number}
    </option>
  ))}
</select>
          </div>
          <div className="form-group">
            <label>Bill Type *</label>
            <select
  value={formData.bill_type}
  onChange={(e) => setFormData({...formData, bill_type: e.target.value})}
>
  {billTypes.map(type => (
    <option key={type} value={type}>{type}</option>
  ))}
</select>
          </div>
        </div>

        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: '600' }}>Items</h4>
            <button onClick={addItem} className="btn-primary" style={{ fontSize: '14px', padding: '6px 12px' }}>
              <Plus size={16} /> Add Item
            </button>
          </div>
          
          {formData.items.map((item, index) => (
            <div key={index} className="bill-item-row">
              <input
                type="text"
                placeholder="Description"
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                style={{ flex: 2 }}
              />
              <input
                type="number"
                placeholder="Qty"
                value={item.quantity}
                onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                style={{ width: '80px' }}
              />
              <input
                type="number"
                placeholder="Rate"
                value={item.rate}
                onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                style={{ width: '100px' }}
              />
              <input
                type="number"
                placeholder="Amount"
                value={item.amount}
                readOnly
                style={{ width: '120px', background: '#f3f4f6' }}
              />
              {formData.items.length > 1 && (
                <button
                  onClick={() => removeItem(index)}
                  className="btn-icon btn-delete"
                  style={{ marginLeft: '8px' }}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="bill-totals">
          <div className="bill-total-row">
            <span>Subtotal:</span>
            <span>₹{formData.subtotal.toFixed(2)}</span>
          </div>
          <div className="bill-total-row">
            <span>Tax (18% GST):</span>
            <span>₹{formData.tax.toFixed(2)}</span>
          </div>
          <div className="bill-total-row">
            <span>Discount:</span>
            <input
              type="number"
              value={formData.discount}
              onChange={(e) => {
                const discount = parseFloat(e.target.value) || 0;
                setFormData({...formData, discount});
                calculateTotals(formData.items);
              }}
              style={{ width: '120px', textAlign: 'right' }}
            />
          </div>
          <div className="bill-total-row" style={{ fontWeight: '700', fontSize: '18px', borderTop: '2px solid #e5e7eb', paddingTop: '12px' }}>
            <span>Total:</span>
            <span>₹{formData.total.toFixed(2)}</span>
          </div>
        </div>

        <div className="form-group full-width" style={{ marginTop: '16px' }}>
          <label>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            rows="2"
            placeholder="Additional notes..."
          />
        </div>

        <div className="modal-actions">
          <button onClick={resetForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={18} /> Save Bill
          </button>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
      >
        {selectedBill && (
          <div>
            <div style={{ marginBottom: '20px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
              <p><strong>Guest:</strong> {selectedBill.guestName}</p>
              <p><strong>Bill Type:</strong> {selectedBill.billType}</p>
              <p><strong>Total Amount:</strong> ₹{selectedBill.total.toFixed(2)}</p>
              <p><strong>Already Paid:</strong> ₹{selectedBill.paidAmount.toFixed(2)}</p>
              <p style={{ fontSize: '18px', fontWeight: '700', marginTop: '8px' }}>
                <strong>Balance Due:</strong> ₹{selectedBill.balance.toFixed(2)}
              </p>
            </div>

            <div className="form-group">
              <label>Payment Amount *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                max={selectedBill.balance}
              />
              <small style={{ color: '#6b7280', marginTop: '4px' }}>
                Maximum: ₹{selectedBill.balance.toFixed(2)}
              </small>
            </div>

            <div className="modal-actions">
              <button onClick={() => setIsPaymentModalOpen(false)} className="btn-secondary">
                Cancel
              </button>
              <button onClick={processPayment} className="btn-primary">
                <DollarSign size={18} /> Record Payment
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Master Bill Modal */}
      <Modal
        isOpen={isMasterBillModalOpen}
        onClose={() => setIsMasterBillModalOpen(false)}
        title="Master Bill"
        size="large"
      >
        {selectedReservation && (
          <div className="master-bill">
            <div className="master-bill-header">
              <h2>{selectedReservation.guestName}</h2>
              <p>Room: {selectedReservation.roomNumber}</p>
            </div>

            <table className="data-table" style={{ marginTop: '20px' }}>
              <thead>
                <tr>
                  <th>Bill Type</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {selectedReservation.bills.map(bill => (
                  <tr key={bill.id}>
                    <td>{bill.billType}</td>
                    <td>{bill.createdAt}</td>
                    <td>₹{bill.total.toFixed(2)}</td>
                    <td>₹{bill.paidAmount.toFixed(2)}</td>
                    <td>₹{bill.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="master-bill-totals">
              <div className="bill-total-row">
                <span>Subtotal:</span>
                <span>₹{selectedReservation.subtotal.toFixed(2)}</span>
              </div>
              <div className="bill-total-row">
                <span>Tax:</span>
                <span>₹{selectedReservation.tax.toFixed(2)}</span>
              </div>
              <div className="bill-total-row">
                <span>Discount:</span>
                <span>₹{selectedReservation.discount.toFixed(2)}</span>
              </div>
              <div className="bill-total-row" style={{ fontWeight: '700', fontSize: '20px', borderTop: '2px solid #e5e7eb', paddingTop: '12px' }}>
                <span>Grand Total:</span>
                <span>₹{selectedReservation.grandTotal.toFixed(2)}</span>
              </div>
              <div className="bill-total-row" style={{ color: '#10b981' }}>
                <span>Total Paid:</span>
                <span>₹{selectedReservation.totalPaid.toFixed(2)}</span>
              </div>
              <div className="bill-total-row" style={{ fontWeight: '700', fontSize: '18px', color: selectedReservation.balance > 0 ? '#ef4444' : '#10b981' }}>
                <span>Balance Due:</span>
                <span>₹{selectedReservation.balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={() => window.print()} className="btn-primary">
                <Printer size={18} /> Print Master Bill
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Billing;