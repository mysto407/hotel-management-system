// src/context/InventoryContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import {
  getInventoryItems,
  createInventoryItem as createInventoryItemAPI,
  updateInventoryItem as updateInventoryItemAPI,
  deleteInventoryItem as deleteInventoryItemAPI,
  getInventoryTransactions,
  createInventoryTransaction as createInventoryTransactionAPI
} from '../lib/supabase';

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const departments = ['Housekeeping', 'Kitchen', 'Bar', 'Spa', 'Restaurant', 'Laundry', 'Maintenance', 'Front Desk'];
  const categories = ['Linen', 'Toiletries', 'Food', 'Beverages', 'Alcohol', 'Cleaning Supplies', 'Spa Products', 'Office Supplies', 'Maintenance', 'Other'];
  const units = ['Pieces', 'Kg', 'Liters', 'Bottles', 'Boxes', 'Packets', 'Sets', 'Units'];

  useEffect(() => {
    loadInventoryItems();
    loadTransactions();
  }, []);

  const loadInventoryItems = async () => {
    setLoading(true);
    const { data, error } = await getInventoryItems();
    if (error) {
      console.error('Error loading inventory items:', error);
    } else {
      setItems(data || []);
    }
    setLoading(false);
  };

  const loadTransactions = async () => {
    const { data, error } = await getInventoryTransactions();
    if (error) {
      console.error('Error loading transactions:', error);
    } else {
      setTransactions(data || []);
    }
  };

  const addItem = async (item) => {
    const { data, error } = await createInventoryItemAPI(item);
    if (error) {
      console.error('Error creating item:', error);
      alert('Failed to create item: ' + error.message);
      return null;
    }
    setItems([...items, data[0]]);
    return data[0];
  };

  const updateItem = async (id, updatedItem) => {
    const { error } = await updateInventoryItemAPI(id, updatedItem);
    if (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item: ' + error.message);
      return;
    }
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, ...updatedItem, updated_at: new Date().toISOString() }
        : item
    ));
  };

  const deleteItem = async (id) => {
    const { error } = await deleteInventoryItemAPI(id);
    if (error) {
      console.error('Error deleting item:', error);
      alert('Cannot delete item: ' + error.message);
      return;
    }
    setItems(items.filter(item => item.id !== id));
    setTransactions(transactions.filter(t => t.item_id !== id));
  };

  const addTransaction = async (transaction, performedBy) => {
    const item = items.find(i => i.id === transaction.item_id);
    if (!item) return;

    const transactionData = {
      ...transaction,
      performed_by: performedBy, // This should be the user's UUID from auth
      created_at: new Date().toISOString()
    };

    const { data, error } = await createInventoryTransactionAPI(transactionData);
    if (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to record transaction: ' + error.message);
      return;
    }

    // Update stock
    let newStock = item.current_stock;
    if (transaction.type === 'Receive') {
      newStock += transaction.quantity;
    } else if (transaction.type === 'Issue') {
      newStock -= transaction.quantity;
    } else if (transaction.type === 'Adjust') {
      newStock = transaction.quantity;
    }

    await updateItem(item.id, { current_stock: newStock });
    await loadTransactions(); // Reload to get with relations
  };

  const getLowStockItems = () => {
    return items.filter(item => item.current_stock < item.min_stock);
  };

  const getItemsByDepartment = (department) => {
    return items.filter(item => item.department === department);
  };

  const getTransactionsByItem = (itemId) => {
    return transactions.filter(t => t.item_id === itemId);
  };

  const getTotalInventoryValue = () => {
    return items.reduce((total, item) => total + (item.current_stock * item.unit_price), 0);
  };

  const getDepartmentValue = (department) => {
    return items
      .filter(item => item.department === department)
      .reduce((total, item) => total + (item.current_stock * item.unit_price), 0);
  };

  return (
    <InventoryContext.Provider value={{
      items,
      transactions,
      loading,
      departments,
      categories,
      units,
      addItem,
      updateItem,
      deleteItem,
      addTransaction,
      getLowStockItems,
      getItemsByDepartment,
      getTransactionsByItem,
      getTotalInventoryValue,
      getDepartmentValue
    }}>
      {children}
    </InventoryContext.Provider>
  );
};