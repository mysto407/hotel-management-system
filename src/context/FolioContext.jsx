// src/context/FolioContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getFolios,
  getFoliosByReservation,
  getFolioById,
  getMasterFolio,
  createFolio,
  updateFolio,
  settleFolio,
  reopenFolio,
  getFolioTransactions,
  getTransactionsByReservation,
  createTransaction,
  updateTransaction,
  voidTransaction,
  deleteTransaction,
  postRoomCharges,
  postTaxes,
  transferTransaction,
  getTransferHistory,
  getAuditLog,
  getTransactionAuditLog,
  getPostingSchedules,
  createPostingSchedule,
  updatePostingSchedule,
  cancelPostingSchedule,
  calculateFolioTotals,
  getTransactionsByDateRange,
  getTransactionsByType,
  getRevenueBreakdown,
  searchTransactions
} from '../lib/supabase';
import { useAlert } from './AlertContext';
import { useAuth } from './AuthContext';

const FolioContext = createContext();

export const useFolio = () => {
  const context = useContext(FolioContext);
  if (!context) throw new Error('useFolio must be used within FolioProvider');
  return context;
};

export const FolioProvider = ({ children }) => {
  const [folios, setFolios] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolio, setSelectedFolio] = useState(null);
  const { error: showError, success: showSuccess } = useAlert();
  const { user } = useAuth();

  // Load all folios
  const loadFolios = async () => {
    setLoading(true);
    const { data, error } = await getFolios();
    if (error) {
      console.error('Error loading folios:', error);
      showError('Failed to load folios: ' + error.message);
    } else {
      setFolios(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFolios();
  }, []);

  // =====================================================
  // FOLIO OPERATIONS
  // =====================================================

  const loadFoliosByReservation = async (reservationId) => {
    const { data, error } = await getFoliosByReservation(reservationId);
    if (error) {
      console.error('Error loading folios:', error);
      showError('Failed to load folios: ' + error.message);
      return null;
    }
    return data;
  };

  const loadFolioById = async (folioId) => {
    const { data, error } = await getFolioById(folioId);
    if (error) {
      console.error('Error loading folio:', error);
      showError('Failed to load folio: ' + error.message);
      return null;
    }
    setSelectedFolio(data);
    return data;
  };

  const loadMasterFolio = async (reservationId) => {
    const { data, error } = await getMasterFolio(reservationId);
    if (error) {
      // Master folio might not exist yet
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error loading master folio:', error);
      showError('Failed to load master folio: ' + error.message);
      return null;
    }
    return data;
  };

  const createNewFolio = async (folioData) => {
    const { data, error } = await createFolio(folioData);
    if (error) {
      console.error('Error creating folio:', error);
      showError('Failed to create folio: ' + error.message);
      return null;
    }
    await loadFolios();
    showSuccess('Folio created successfully');
    return data;
  };

  const updateFolioData = async (id, folioData) => {
    const { data, error } = await updateFolio(id, folioData);
    if (error) {
      console.error('Error updating folio:', error);
      showError('Failed to update folio: ' + error.message);
      return null;
    }
    await loadFolios();
    showSuccess('Folio updated successfully');
    return data;
  };

  const settleFolioAndClose = async (id) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const { data, error } = await settleFolio(id, userId);
    if (error) {
      console.error('Error settling folio:', error);
      showError('Failed to settle folio: ' + error.message);
      return null;
    }
    await loadFolios();
    showSuccess('Folio settled successfully');
    return data;
  };

  const reopenSettledFolio = async (id) => {
    const { data, error } = await reopenFolio(id);
    if (error) {
      console.error('Error reopening folio:', error);
      showError('Failed to reopen folio: ' + error.message);
      return null;
    }
    await loadFolios();
    showSuccess('Folio reopened successfully');
    return data;
  };

  // Get or create master folio for a reservation
  const getOrCreateMasterFolio = async (reservationId, reservationData) => {
    // First try to get existing master folio
    let masterFolio = await loadMasterFolio(reservationId);

    // If it doesn't exist, create it
    if (!masterFolio) {
      const folioData = {
        reservation_id: reservationId,
        folio_type: 'master',
        folio_name: 'Master Folio',
        status: 'open',
        notes: `Master folio for reservation ${reservationId}`
      };

      masterFolio = await createNewFolio(folioData);
    }

    return masterFolio;
  };

  // =====================================================
  // TRANSACTION OPERATIONS
  // =====================================================

  const loadTransactions = async (folioId) => {
    const { data, error } = await getFolioTransactions(folioId);
    if (error) {
      console.error('Error loading transactions:', error);
      showError('Failed to load transactions: ' + error.message);
      return [];
    }
    setTransactions(data || []);
    return data;
  };

  const loadTransactionsByReservation = async (reservationId) => {
    const { data, error } = await getTransactionsByReservation(reservationId);
    if (error) {
      console.error('Error loading transactions:', error);
      showError('Failed to load transactions: ' + error.message);
      return [];
    }
    return data;
  };

  const addTransaction = async (transactionData) => {
    const userId = user?.id;
    const dataWithUser = {
      ...transactionData,
      created_by: userId,
      status: transactionData.status || 'posted'
    };

    const { data, error } = await createTransaction(dataWithUser);
    if (error) {
      console.error('Error creating transaction:', error);
      showError('Failed to create transaction: ' + error.message);
      return null;
    }

    // Reload transactions if a folio is selected
    if (selectedFolio) {
      await loadTransactions(selectedFolio.id);
    }

    showSuccess('Transaction posted successfully');
    return data;
  };

  const updateTransactionData = async (id, transactionData) => {
    const userId = user?.id;
    const dataWithUser = {
      ...transactionData,
      modified_by: userId,
      modified_at: new Date().toISOString()
    };

    const { data, error } = await updateTransaction(id, dataWithUser);
    if (error) {
      console.error('Error updating transaction:', error);
      showError('Failed to update transaction: ' + error.message);
      return null;
    }

    // Reload transactions if a folio is selected
    if (selectedFolio) {
      await loadTransactions(selectedFolio.id);
    }

    showSuccess('Transaction updated successfully');
    return data;
  };

  const voidTransactionById = async (transactionId, voidReason) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return false;
    }

    const { data, error } = await voidTransaction(transactionId, userId, voidReason);
    if (error) {
      console.error('Error voiding transaction:', error);
      showError('Failed to void transaction: ' + error.message);
      return false;
    }

    // Reload transactions if a folio is selected
    if (selectedFolio) {
      await loadTransactions(selectedFolio.id);
    }

    showSuccess('Transaction voided successfully');
    return true;
  };

  const removeTransaction = async (id) => {
    const { error } = await deleteTransaction(id);
    if (error) {
      console.error('Error deleting transaction:', error);
      showError('Failed to delete transaction: ' + error.message);
      return false;
    }

    // Reload transactions if a folio is selected
    if (selectedFolio) {
      await loadTransactions(selectedFolio.id);
    }

    showSuccess('Transaction deleted successfully');
    return true;
  };

  // =====================================================
  // SPECIALIZED TRANSACTION POSTING
  // =====================================================

  const postRoomChargesToFolio = async (folioId, reservationId, checkInDate, checkOutDate, roomRate) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const { data, error } = await postRoomCharges(folioId, reservationId, checkInDate, checkOutDate, roomRate, userId);
    if (error) {
      console.error('Error posting room charges:', error);
      showError('Failed to post room charges: ' + error.message);
      return null;
    }

    showSuccess('Room charges posted successfully');
    return data;
  };

  const postTaxesToFolio = async (folioId, reservationId, subtotal, taxRate = 0.18) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const { data, error } = await postTaxes(folioId, reservationId, subtotal, taxRate, userId);
    if (error) {
      console.error('Error posting taxes:', error);
      showError('Failed to post taxes: ' + error.message);
      return null;
    }

    showSuccess('Taxes posted successfully');
    return data;
  };

  const postPayment = async (folioId, reservationId, paymentData) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const transactionData = {
      folio_id: folioId,
      reservation_id: reservationId,
      transaction_type: 'payment',
      description: paymentData.description || `Payment via ${paymentData.payment_method}`,
      amount: paymentData.amount,
      quantity: 1,
      rate: paymentData.amount,
      category: 'payment',
      payment_method: paymentData.payment_method,
      payment_status: paymentData.payment_status || 'completed',
      reference_number: paymentData.reference_number,
      notes: paymentData.notes,
      status: 'posted',
      created_by: userId,
      // Card details
      card_last_four: paymentData.card_last_four,
      card_type: paymentData.card_type,
      // Bank details
      bank_name: paymentData.bank_name,
      account_number: paymentData.account_number,
      cheque_number: paymentData.cheque_number,
      cheque_date: paymentData.cheque_date,
      upi_id: paymentData.upi_id,
      // Gateway details
      gateway_transaction_id: paymentData.gateway_transaction_id,
      gateway_name: paymentData.gateway_name,
      gateway_response: paymentData.gateway_response,
      authorization_code: paymentData.authorization_code
    };

    return await addTransaction(transactionData);
  };

  const postRefund = async (folioId, reservationId, refundData) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const transactionData = {
      folio_id: folioId,
      reservation_id: reservationId,
      transaction_type: 'refund',
      description: refundData.description || 'Refund',
      amount: -Math.abs(refundData.amount), // Refunds are negative
      quantity: 1,
      rate: -Math.abs(refundData.amount),
      category: 'refund',
      payment_method: refundData.payment_method,
      reference_number: refundData.reference_number,
      notes: refundData.notes,
      status: 'posted',
      created_by: userId
    };

    return await addTransaction(transactionData);
  };

  const postDiscount = async (folioId, reservationId, discountData) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const transactionData = {
      folio_id: folioId,
      reservation_id: reservationId,
      transaction_type: 'discount',
      description: discountData.description || 'Discount',
      amount: -Math.abs(discountData.amount), // Discounts are negative
      quantity: 1,
      rate: -Math.abs(discountData.amount),
      category: 'discount',
      notes: discountData.notes,
      status: 'posted',
      created_by: userId
    };

    return await addTransaction(transactionData);
  };

  const postAdjustment = async (folioId, reservationId, adjustmentData) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const transactionData = {
      folio_id: folioId,
      reservation_id: reservationId,
      transaction_type: 'adjustment',
      description: adjustmentData.description || 'Adjustment',
      amount: adjustmentData.amount,
      quantity: 1,
      rate: adjustmentData.amount,
      category: 'adjustment',
      notes: adjustmentData.notes,
      status: 'posted',
      created_by: userId
    };

    return await addTransaction(transactionData);
  };

  // =====================================================
  // TRANSFER OPERATIONS
  // =====================================================

  const transferTransactionToFolio = async (transactionId, toFolioId, reason) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return false;
    }

    const { data, error } = await transferTransaction(transactionId, toFolioId, userId, reason);
    if (error) {
      console.error('Error transferring transaction:', error);
      showError('Failed to transfer transaction: ' + error.message);
      return false;
    }

    // Reload transactions
    if (selectedFolio) {
      await loadTransactions(selectedFolio.id);
    }

    showSuccess('Transaction transferred successfully');
    return true;
  };

  const loadTransferHistory = async (folioId) => {
    const { data, error } = await getTransferHistory(folioId);
    if (error) {
      console.error('Error loading transfer history:', error);
      showError('Failed to load transfer history: ' + error.message);
      return [];
    }
    return data;
  };

  // =====================================================
  // AUDIT AND HISTORY
  // =====================================================

  const loadAuditLog = async (entityType, entityId) => {
    const { data, error } = await getAuditLog(entityType, entityId);
    if (error) {
      console.error('Error loading audit log:', error);
      showError('Failed to load audit log: ' + error.message);
      return [];
    }
    return data;
  };

  const loadTransactionAuditLog = async (transactionId) => {
    const { data, error } = await getTransactionAuditLog(transactionId);
    if (error) {
      console.error('Error loading transaction audit log:', error);
      showError('Failed to load audit log: ' + error.message);
      return [];
    }
    return data;
  };

  // =====================================================
  // CALCULATIONS AND QUERIES
  // =====================================================

  const calculateTotals = async (folioId) => {
    const { data, error } = await calculateFolioTotals(folioId);
    if (error) {
      console.error('Error calculating totals:', error);
      return null;
    }
    return data;
  };

  const loadTransactionsByDateRange = async (folioId, startDate, endDate) => {
    const { data, error } = await getTransactionsByDateRange(folioId, startDate, endDate);
    if (error) {
      console.error('Error loading transactions:', error);
      showError('Failed to load transactions: ' + error.message);
      return [];
    }
    return data;
  };

  const loadTransactionsByType = async (folioId, transactionType) => {
    const { data, error } = await getTransactionsByType(folioId, transactionType);
    if (error) {
      console.error('Error loading transactions:', error);
      showError('Failed to load transactions: ' + error.message);
      return [];
    }
    return data;
  };

  const loadRevenueBreakdown = async (folioId) => {
    const { data, error } = await getRevenueBreakdown(folioId);
    if (error) {
      console.error('Error loading revenue breakdown:', error);
      showError('Failed to load revenue breakdown: ' + error.message);
      return {};
    }
    return data;
  };

  const searchFolioTransactions = async (searchTerm, filters) => {
    const { data, error } = await searchTransactions(searchTerm, filters);
    if (error) {
      console.error('Error searching transactions:', error);
      showError('Failed to search transactions: ' + error.message);
      return [];
    }
    return data;
  };

  // =====================================================
  // POSTING SCHEDULES
  // =====================================================

  const loadPostingSchedules = async (folioId) => {
    const { data, error } = await getPostingSchedules(folioId);
    if (error) {
      console.error('Error loading posting schedules:', error);
      showError('Failed to load posting schedules: ' + error.message);
      return [];
    }
    return data;
  };

  const addPostingSchedule = async (scheduleData) => {
    const userId = user?.id;
    if (!userId) {
      showError('User not authenticated');
      return null;
    }

    const dataWithUser = {
      ...scheduleData,
      created_by: userId
    };

    const { data, error } = await createPostingSchedule(dataWithUser);
    if (error) {
      console.error('Error creating posting schedule:', error);
      showError('Failed to create posting schedule: ' + error.message);
      return null;
    }

    showSuccess('Posting schedule created successfully');
    return data;
  };

  const updatePostingScheduleData = async (id, scheduleData) => {
    const { data, error } = await updatePostingSchedule(id, scheduleData);
    if (error) {
      console.error('Error updating posting schedule:', error);
      showError('Failed to update posting schedule: ' + error.message);
      return null;
    }

    showSuccess('Posting schedule updated successfully');
    return data;
  };

  const cancelSchedule = async (id) => {
    const { data, error } = await cancelPostingSchedule(id);
    if (error) {
      console.error('Error cancelling posting schedule:', error);
      showError('Failed to cancel posting schedule: ' + error.message);
      return null;
    }

    showSuccess('Posting schedule cancelled successfully');
    return data;
  };

  const value = {
    // State
    folios,
    transactions,
    loading,
    selectedFolio,
    setSelectedFolio,

    // Folio operations
    loadFolios,
    loadFoliosByReservation,
    loadFolioById,
    loadMasterFolio,
    createNewFolio,
    updateFolioData,
    settleFolioAndClose,
    reopenSettledFolio,
    getOrCreateMasterFolio,

    // Transaction operations
    loadTransactions,
    loadTransactionsByReservation,
    addTransaction,
    updateTransactionData,
    voidTransactionById,
    removeTransaction,

    // Specialized posting
    postRoomChargesToFolio,
    postTaxesToFolio,
    postPayment,
    postRefund,
    postDiscount,
    postAdjustment,

    // Transfer operations
    transferTransactionToFolio,
    loadTransferHistory,

    // Audit
    loadAuditLog,
    loadTransactionAuditLog,

    // Calculations
    calculateTotals,
    loadTransactionsByDateRange,
    loadTransactionsByType,
    loadRevenueBreakdown,
    searchFolioTransactions,

    // Posting schedules
    loadPostingSchedules,
    addPostingSchedule,
    updatePostingScheduleData,
    cancelSchedule
  };

  return (
    <FolioContext.Provider value={value}>
      {children}
    </FolioContext.Provider>
  );
};
