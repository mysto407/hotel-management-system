// ==========================================
// FILE: src/context/InventoryContext.jsx
// ==========================================
import { createContext, useContext, useState } from 'react';

const InventoryContext = createContext();

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventory must be used within InventoryProvider');
  return context;
};

export const InventoryProvider = ({ children }) => {
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Bed Sheets',
      category: 'Linen',
      department: 'Housekeeping',
      unit: 'Pieces',
      currentStock: 45,
      minStock: 20,
      maxStock: 100,
      unitPrice: 500,
      supplier: 'Linen World',
      lastUpdated: '2025-10-15'
    },
    {
      id: 2,
      name: 'Towels',
      category: 'Linen',
      department: 'Housekeeping',
      unit: 'Pieces',
      currentStock: 12,
      minStock: 30,
      maxStock: 80,
      unitPrice: 150,
      supplier: 'Linen World',
      lastUpdated: '2025-10-14'
    },
    {
      id: 3,
      name: 'Rice',
      category: 'Food',
      department: 'Kitchen',
      unit: 'Kg',
      currentStock: 150,
      minStock: 50,
      maxStock: 300,
      unitPrice: 60,
      supplier: 'Food Suppliers Ltd',
      lastUpdated: '2025-10-16'
    },
    {
      id: 4,
      name: 'Whiskey',
      category: 'Alcohol',
      department: 'Bar',
      unit: 'Bottles',
      currentStock: 8,
      minStock: 10,
      maxStock: 50,
      unitPrice: 2500,
      supplier: 'Beverage Distributors',
      lastUpdated: '2025-10-13'
    },
    {
      id: 5,
      name: 'Shampoo',
      category: 'Toiletries',
      department: 'Housekeeping',
      unit: 'Bottles',
      currentStock: 25,
      minStock: 15,
      maxStock: 60,
      unitPrice: 120,
      supplier: 'Hotel Supplies Co',
      lastUpdated: '2025-10-15'
    },
    {
      id: 6,
      name: 'Massage Oil',
      category: 'Spa Products',
      department: 'Spa',
      unit: 'Bottles',
      currentStock: 18,
      minStock: 10,
      maxStock: 40,
      unitPrice: 800,
      supplier: 'Spa Essentials',
      lastUpdated: '2025-10-14'
    }
  ]);

  const [transactions, setTransactions] = useState([
    {
      id: 1,
      itemId: 2,
      itemName: 'Towels',
      type: 'Issue',
      quantity: 20,
      department: 'Housekeeping',
      issuedTo: 'Room Service',
      notes: 'For room 201-210',
      date: '2025-10-14',
      performedBy: 'Admin User'
    },
    {
      id: 2,
      itemId: 4,
      itemName: 'Whiskey',
      type: 'Issue',
      quantity: 5,
      department: 'Bar',
      issuedTo: 'Bar Staff',
      notes: 'Weekend stock',
      date: '2025-10-13',
      performedBy: 'Admin User'
    },
    {
      id: 3,
      itemId: 3,
      itemName: 'Rice',
      type: 'Receive',
      quantity: 100,
      department: 'Kitchen',
      supplier: 'Food Suppliers Ltd',
      notes: 'Monthly stock',
      date: '2025-10-16',
      performedBy: 'Admin User'
    }
  ]);

  const departments = ['Housekeeping', 'Kitchen', 'Bar', 'Spa', 'Restaurant', 'Laundry', 'Maintenance', 'Front Desk'];
  
  const categories = ['Linen', 'Toiletries', 'Food', 'Beverages', 'Alcohol', 'Cleaning Supplies', 'Spa Products', 'Office Supplies', 'Maintenance', 'Other'];

  const units = ['Pieces', 'Kg', 'Liters', 'Bottles', 'Boxes', 'Packets', 'Sets', 'Units'];

  const addItem = (item) => {
    const newItem = {
      ...item,
      id: Date.now(),
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setItems([...items, newItem]);
    return newItem;
  };

  const updateItem = (id, updatedItem) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, ...updatedItem, lastUpdated: new Date().toISOString().split('T')[0] }
        : item
    ));
  };

  const deleteItem = (id) => {
    setItems(items.filter(item => item.id !== id));
    setTransactions(transactions.filter(t => t.itemId !== id));
  };

  const addTransaction = (transaction, performedBy) => {
    const item = items.find(i => i.id === transaction.itemId);
    if (!item) return;

    const newTransaction = {
      ...transaction,
      id: Date.now(),
      itemName: item.name,
      department: item.department,
      date: new Date().toISOString().split('T')[0],
      performedBy
    };

    setTransactions([newTransaction, ...transactions]);

    // Update stock
    let newStock = item.currentStock;
    if (transaction.type === 'Receive') {
      newStock += transaction.quantity;
    } else if (transaction.type === 'Issue') {
      newStock -= transaction.quantity;
    } else if (transaction.type === 'Adjust') {
      newStock = transaction.quantity;
    }

    updateItem(item.id, { currentStock: newStock });
  };

  const getLowStockItems = () => {
    return items.filter(item => item.currentStock < item.minStock);
  };

  const getItemsByDepartment = (department) => {
    return items.filter(item => item.department === department);
  };

  const getTransactionsByItem = (itemId) => {
    return transactions.filter(t => t.itemId === itemId);
  };

  const getTotalInventoryValue = () => {
    return items.reduce((total, item) => total + (item.currentStock * item.unitPrice), 0);
  };

  const getDepartmentValue = (department) => {
    return items
      .filter(item => item.department === department)
      .reduce((total, item) => total + (item.currentStock * item.unitPrice), 0);
  };

  return (
    <InventoryContext.Provider value={{
      items,
      transactions,
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