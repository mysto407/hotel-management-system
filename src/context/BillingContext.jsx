// src/context/BillingContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getBills,
  createBill as createBillAPI,
  updateBill as updateBillAPI,
  deleteBill as deleteBillAPI,
  createPayment
} from '../lib/supabase';
import { useAlert } from './AlertContext';

const BillingContext = createContext();

export const useBilling = () => {
  const context = useContext(BillingContext);
  if (!context) throw new Error('useBilling must be used within BillingProvider');
  return context;
};

export const BillingProvider = ({ children }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const { error: showError } = useAlert();

  useEffect(() => {
    loadBills();
  }, []);

  const loadBills = async () => {
    setLoading(true);
    const { data, error } = await getBills();
    if (error) {
      console.error('Error loading bills:', error);
    } else {
      setBills(data || []);
    }
    setLoading(false);
  };

  const addBill = async (billData) => {
    const { items, ...bill } = billData;

    const { data, error } = await createBillAPI(bill, items);
    if (error) {
      console.error('Error creating bill:', error);
      showError('Failed to create bill: ' + error.message);
      return null;
    }

    await loadBills(); // Reload to get with relations
    return data;
  };

  const updateBill = async (id, updatedBill) => {
    const { error } = await updateBillAPI(id, updatedBill);
    if (error) {
      console.error('Error updating bill:', error);
      showError('Failed to update bill: ' + error.message);
      return;
    }
    await loadBills();
  };

  const deleteBill = async (id) => {
    const { error } = await deleteBillAPI(id);
    if (error) {
      console.error('Error deleting bill:', error);
      showError('Cannot delete bill: ' + error.message);
      return;
    }
    setBills(bills.filter(b => b.id !== id));
  };

  const recordPayment = async (billId, amount) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    // Create payment record
    const payment = {
      bill_id: billId,
      amount: amount,
      payment_method: 'Cash', // Default, can be modified
      created_at: new Date().toISOString()
    };

    const { error: paymentError } = await createPayment(payment);
    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      showError('Failed to record payment: ' + paymentError.message);
      return;
    }

    // Update bill amounts
    const newPaidAmount = bill.paid_amount + amount;
    const newBalance = bill.total - newPaidAmount;
    const newStatus = newBalance === 0 ? 'Paid' : newBalance === bill.total ? 'Pending' : 'Partial';

    await updateBill(billId, {
      paid_amount: newPaidAmount,
      balance: newBalance,
      payment_status: newStatus
    });
  };

  const getBillsByReservation = (reservationId) => {
    return bills.filter(b => b.reservation_id === reservationId);
  };

  const getMasterBill = (reservationId) => {
    const reservationBills = getBillsByReservation(reservationId);
    if (reservationBills.length === 0) return null;

    const totalSubtotal = reservationBills.reduce((sum, bill) => sum + bill.subtotal, 0);
    const totalTax = reservationBills.reduce((sum, bill) => sum + bill.tax, 0);
    const totalDiscount = reservationBills.reduce((sum, bill) => sum + bill.discount, 0);
    const grandTotal = reservationBills.reduce((sum, bill) => sum + bill.total, 0);
    const totalPaid = reservationBills.reduce((sum, bill) => sum + bill.paid_amount, 0);
    const totalBalance = grandTotal - totalPaid;

    // Get guest and room info from first bill
    const firstBill = reservationBills[0];
    const guestName = firstBill.reservations?.guests?.name || 'Unknown';
    const roomNumber = firstBill.reservations?.rooms?.room_number || 'Unknown';

    return {
      reservationId,
      guestName,
      roomNumber,
      bills: reservationBills,
      subtotal: totalSubtotal,
      tax: totalTax,
      discount: totalDiscount,
      grandTotal,
      totalPaid,
      balance: totalBalance,
      paymentStatus: totalBalance === 0 ? 'Paid' : totalBalance === grandTotal ? 'Pending' : 'Partial'
    };
  };

  return (
    <BillingContext.Provider value={{
      bills,
      loading,
      addBill,
      updateBill,
      deleteBill,
      recordPayment,
      getBillsByReservation,
      getMasterBill
    }}>
      {children}
    </BillingContext.Provider>
  );
};