// src/context/BillingContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getBills,
  createBill as createBillAPI,
  updateBill as updateBillAPI,
  deleteBill as deleteBillAPI,
  createPayment,
  createBillItem,
  updateBillItem,
  deleteBillItem,
  getPayments,
  getPaymentsByReservation,
  updatePayment,
  deletePayment,
  getDiscountApplicationsByReservation,
  createDiscountApplication,
  deleteDiscountApplication,
  // New transaction system imports
  getTransactionsByReservation,
  getReservationTransactionSummary,
  getReservationBalance,
  createRoomCharge,
  createServiceCharge,
  createTax,
  createFee,
  createDiscountTransaction,
  createPaymentTransaction,
  createRefund,
  createAdjustment,
  createWriteOff,
  createDeposit,
  createDepositUsage,
  reverseTransaction,
  voidTransaction,
  updateTransaction,
  deleteTransaction,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  SERVICE_CATEGORIES
} from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();

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

  // Bill Item management
  const addBillItem = async (billId, itemData) => {
    const billItem = {
      bill_id: billId,
      ...itemData
    };

    const { data, error } = await createBillItem(billItem);
    if (error) {
      console.error('Error adding bill item:', error);
      showError('Failed to add charge: ' + error.message);
      return null;
    }

    await loadBills();
    return data;
  };

  const updateBillItemData = async (itemId, itemData) => {
    const { error } = await updateBillItem(itemId, itemData);
    if (error) {
      console.error('Error updating bill item:', error);
      showError('Failed to update charge: ' + error.message);
      return;
    }
    await loadBills();
  };

  const removeBillItem = async (itemId) => {
    const { error } = await deleteBillItem(itemId);
    if (error) {
      console.error('Error deleting bill item:', error);
      showError('Failed to delete charge: ' + error.message);
      return;
    }
    await loadBills();
  };

  // Payment management
  const addPayment = async (paymentData) => {
    const { data, error } = await createPayment(paymentData);
    if (error) {
      console.error('Error adding payment:', error);
      showError('Failed to add payment: ' + error.message);
      return null;
    }

    // Update bill with new payment info
    const bill = bills.find(b => b.id === paymentData.bill_id);
    if (bill) {
      const newPaidAmount = (bill.paid_amount || 0) + paymentData.amount;
      const newBalance = bill.total - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'Paid' : newBalance === bill.total ? 'Pending' : 'Partial';

      await updateBill(bill.id, {
        paid_amount: newPaidAmount,
        balance: newBalance,
        payment_status: newStatus
      });
    }

    return data;
  };

  const updatePaymentData = async (paymentId, paymentData) => {
    const { error } = await updatePayment(paymentId, paymentData);
    if (error) {
      console.error('Error updating payment:', error);
      showError('Failed to update payment: ' + error.message);
      return;
    }
    await loadBills();
  };

  const removePayment = async (paymentId, billId, amount) => {
    const { error } = await deletePayment(paymentId);
    if (error) {
      console.error('Error deleting payment:', error);
      showError('Failed to delete payment: ' + error.message);
      return;
    }

    // Update bill with removed payment
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      const newPaidAmount = (bill.paid_amount || 0) - amount;
      const newBalance = bill.total - newPaidAmount;
      const newStatus = newBalance <= 0 ? 'Paid' : newBalance === bill.total ? 'Pending' : 'Partial';

      await updateBill(bill.id, {
        paid_amount: newPaidAmount,
        balance: newBalance,
        payment_status: newStatus
      });
    }
  };

  // Discount management
  const applyDiscount = async (discountData) => {
    const { data, error } = await createDiscountApplication(discountData);
    if (error) {
      console.error('Error applying discount:', error);
      showError('Failed to apply discount: ' + error.message);
      return null;
    }
    await loadBills();
    return data;
  };

  const removeDiscountApplication = async (applicationId) => {
    const { error } = await deleteDiscountApplication(applicationId);
    if (error) {
      console.error('Error removing discount:', error);
      showError('Failed to remove discount: ' + error.message);
      return;
    }
    await loadBills();
  };

  // ============================================================================
  // Enhanced Transaction System Methods
  // ============================================================================

  // Get all transactions for a reservation
  const getTransactions = async (reservationId, options = {}) => {
    const { data, error } = await getTransactionsByReservation(reservationId, options);
    if (error) {
      console.error('Error loading transactions:', error);
      showError('Failed to load transactions: ' + error.message);
      return [];
    }
    return data || [];
  };

  // Get transaction summary for a reservation
  const getTransactionSummary = async (reservationId) => {
    const { data, error } = await getReservationTransactionSummary(reservationId);
    if (error) {
      console.error('Error loading transaction summary:', error);
      return null;
    }
    return data;
  };

  // Get balance for a reservation
  const getBalance = async (reservationId) => {
    const { data, error } = await getReservationBalance(reservationId);
    if (error) {
      console.error('Error loading balance:', error);
      return 0;
    }
    return data || 0;
  };

  // Add room charge
  const addRoomCharge = async (transactionData) => {
    const { data, error } = await createRoomCharge({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding room charge:', error);
      showError('Failed to add room charge: ' + error.message);
      return null;
    }
    return data;
  };

  // Add service charge
  const addServiceCharge = async (transactionData) => {
    const { data, error } = await createServiceCharge({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding service charge:', error);
      showError('Failed to add service charge: ' + error.message);
      return null;
    }
    return data;
  };

  // Add tax
  const addTax = async (transactionData) => {
    const { data, error } = await createTax({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding tax:', error);
      showError('Failed to add tax: ' + error.message);
      return null;
    }
    return data;
  };

  // Add fee
  const addFee = async (transactionData) => {
    const { data, error } = await createFee({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding fee:', error);
      showError('Failed to add fee: ' + error.message);
      return null;
    }
    return data;
  };

  // Add discount as transaction
  const addDiscountTransaction = async (transactionData) => {
    const { data, error } = await createDiscountTransaction({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding discount:', error);
      showError('Failed to add discount: ' + error.message);
      return null;
    }
    return data;
  };

  // Record payment as transaction
  const recordPaymentTransaction = async (transactionData) => {
    const { data, error } = await createPaymentTransaction({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error recording payment:', error);
      showError('Failed to record payment: ' + error.message);
      return null;
    }
    return data;
  };

  // Add refund
  const addRefund = async (transactionData) => {
    const { data, error } = await createRefund({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding refund:', error);
      showError('Failed to add refund: ' + error.message);
      return null;
    }
    return data;
  };

  // Add adjustment
  const addAdjustment = async (transactionData) => {
    const { data, error } = await createAdjustment({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding adjustment:', error);
      showError('Failed to add adjustment: ' + error.message);
      return null;
    }
    return data;
  };

  // Add write-off
  const addWriteOff = async (transactionData) => {
    const { data, error } = await createWriteOff({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding write-off:', error);
      showError('Failed to add write-off: ' + error.message);
      return null;
    }
    return data;
  };

  // Add deposit
  const addDeposit = async (transactionData) => {
    const { data, error } = await createDeposit({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error adding deposit:', error);
      showError('Failed to add deposit: ' + error.message);
      return null;
    }
    return data;
  };

  // Use deposit
  const useDeposit = async (transactionData) => {
    const { data, error } = await createDepositUsage({
      ...transactionData,
      created_by: user?.id
    });
    if (error) {
      console.error('Error using deposit:', error);
      showError('Failed to use deposit: ' + error.message);
      return null;
    }
    return data;
  };

  // Reverse a transaction
  const reverseTransactionById = async (transactionId, reason) => {
    const { data, error } = await reverseTransaction(transactionId, reason, user?.id);
    if (error) {
      console.error('Error reversing transaction:', error);
      showError('Failed to reverse transaction: ' + error.message);
      return null;
    }
    return data;
  };

  // Void a transaction
  const voidTransactionById = async (transactionId, reason) => {
    const { data, error } = await voidTransaction(transactionId, reason, user?.id);
    if (error) {
      console.error('Error voiding transaction:', error);
      showError('Failed to void transaction: ' + error.message);
      return null;
    }
    return data;
  };

  // Update a transaction
  const updateTransactionById = async (transactionId, updates) => {
    const { data, error } = await updateTransaction(transactionId, updates);
    if (error) {
      console.error('Error updating transaction:', error);
      showError('Failed to update transaction: ' + error.message);
      return null;
    }
    return data;
  };

  // Delete a transaction
  const deleteTransactionById = async (transactionId) => {
    const { error } = await deleteTransaction(transactionId);
    if (error) {
      console.error('Error deleting transaction:', error);
      showError('Failed to delete transaction: ' + error.message);
      return;
    }
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
      getMasterBill,
      addBillItem,
      updateBillItemData,
      removeBillItem,
      addPayment,
      updatePaymentData,
      removePayment,
      applyDiscount,
      removeDiscountApplication,
      // Enhanced transaction methods
      getTransactions,
      getTransactionSummary,
      getBalance,
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
      useDeposit,
      reverseTransactionById,
      voidTransactionById,
      updateTransactionById,
      deleteTransactionById,
      // Constants
      TRANSACTION_TYPES,
      TRANSACTION_STATUS,
      SERVICE_CATEGORIES
    }}>
      {children}
    </BillingContext.Provider>
  );
};