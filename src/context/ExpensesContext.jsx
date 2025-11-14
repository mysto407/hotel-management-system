// src/context/ExpenseContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { useAlert } from './AlertContext';
import {
  getExpenseCategories,
  createExpenseCategory,
  deleteExpenseCategory,
  getExpenseSheets,
  createExpenseSheet,
  updateExpenseSheet,
  deleteExpenseSheet,
  getExpenseColumns,
  updateExpenseColumns,
  getExpenseRows,
  bulkUpdateExpenseRows
} from '../lib/supabase';

const ExpenseContext = createContext();

export const useExpense = () => {
  const context = useContext(ExpenseContext);
  if (!context) throw new Error('useExpense must be used within ExpenseProvider');
  return context;
};

export const ExpenseProvider = ({ children }) => {
  const { error: showError } = useAlert();
  const [categories, setCategories] = useState([]);
  const [sheets, setSheets] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    const { data, error } = await getExpenseCategories();
    if (error) {
      console.error('Error loading categories:', error);
    } else {
      setCategories(data || []);
    }
    setLoading(false);
  };

  const addCategory = async (name) => {
    const { data, error } = await createExpenseCategory(name);
    if (error) {
      console.error('Error creating category:', error);
      showError('Failed to create category: ' + error.message);
      return null;
    }
    setCategories([...categories, data[0]]);
    return data[0];
  };

  const removeCategory = async (id) => {
    const { error } = await deleteExpenseCategory(id);
    if (error) {
      console.error('Error deleting category:', error);
      showError('Cannot delete category: ' + error.message);
      return false;
    }
    setCategories(categories.filter(c => c.id !== id));
    return true;
  };

  const loadSheets = async (categoryId) => {
    const { data, error } = await getExpenseSheets(categoryId);
    if (error) {
      console.error('Error loading sheets:', error);
      return [];
    }
    return data || [];
  };

  const addSheet = async (categoryId, name) => {
    const { data, error } = await createExpenseSheet(categoryId, name);
    if (error) {
      console.error('Error creating sheet:', error);
      showError('Failed to create sheet: ' + error.message);
      return null;
    }
    return data[0];
  };

  const loadSheetData = async (sheetId) => {
    // Load columns
    const { data: columnsData, error: colError } = await getExpenseColumns(sheetId);
    if (colError) {
      console.error('Error loading columns:', colError);
      return null;
    }

    // Load rows
    const { data: rowsData, error: rowError } = await getExpenseRows(sheetId);
    if (rowError) {
      console.error('Error loading rows:', rowError);
      return null;
    }

    // Convert to frontend format
    const customColumns = columnsData.map(col => ({
      id: col.column_id,
      name: col.column_name,
      type: col.column_type,
      fixed: false
    }));

    const rows = rowsData.map(row => ({
      id: row.id,
      date: row.date,
      refNo: row.ref_no,
      totalAmount: parseFloat(row.total_amount) || 0,
      remarks: row.remarks,
      customData: row.custom_data || {}
    }));

    return { customColumns, rows };
  };

  const saveSheetData = async (sheetId, customColumns, rows) => {
    // Save columns
    const { error: colError } = await updateExpenseColumns(sheetId, customColumns);
    if (colError) {
      console.error('Error saving columns:', colError);
      showError('Failed to save columns: ' + colError.message);
      return false;
    }

    // Save rows
    const { error: rowError } = await bulkUpdateExpenseRows(sheetId, rows);
    if (rowError) {
      console.error('Error saving rows:', rowError);
      showError('Failed to save rows: ' + rowError.message);
      return false;
    }

    return true;
  };

  return (
    <ExpenseContext.Provider value={{
      categories,
      loading,
      addCategory,
      removeCategory,
      loadSheets,
      addSheet,
      loadSheetData,
      saveSheetData
    }}>
      {children}
    </ExpenseContext.Provider>
  );
};