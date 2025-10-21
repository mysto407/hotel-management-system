// src/pages/expenses/Expenses.jsx
import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Download, Edit2, X, Check, FolderPlus, FileText } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';

const Expenses = () => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sheets, setSheets] = useState({});
  const [selectedSheet, setSelectedSheet] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSheetName, setNewSheetName] = useState('');

  // Default columns that are always present
  const defaultColumns = [
    { id: 'date', name: 'Date', type: 'date', fixed: true },
    { id: 'refNo', name: 'Ref No.', type: 'text', fixed: true },
    { id: 'totalAmount', name: 'Total Amount', type: 'number', fixed: true },
    { id: 'remarks', name: 'Remarks', type: 'text', fixed: true }
  ];

  const [customColumns, setCustomColumns] = useState([]);
  const [rows, setRows] = useState([
    {
      id: 1,
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      totalAmount: 0,
      remarks: '',
      customData: {}
    }
  ]);

  const allColumns = [...defaultColumns, ...customColumns];

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('expenseData');
    if (savedData) {
      const data = JSON.parse(savedData);
      setCategories(data.categories || []);
      setSheets(data.sheets || {});
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    const data = {
      categories,
      sheets
    };
    localStorage.setItem('expenseData', JSON.stringify(data));
  }, [categories, sheets]);

  // Load sheet data when selected
  useEffect(() => {
    if (selectedCategory && selectedSheet) {
      const sheetData = sheets[`${selectedCategory}_${selectedSheet}`];
      if (sheetData) {
        setSheetName(sheetData.name);
        setCustomColumns(sheetData.customColumns || []);
        setRows(sheetData.rows || [
          {
            id: 1,
            date: new Date().toISOString().split('T')[0],
            refNo: '',
            totalAmount: 0,
            remarks: '',
            customData: {}
          }
        ]);
      }
    }
  }, [selectedCategory, selectedSheet, sheets]);

  // Add new category
  const addCategory = () => {
    if (newCategoryName.trim() && !categories.includes(newCategoryName.trim())) {
      setCategories([...categories, newCategoryName.trim()]);
      setNewCategoryName('');
      setIsCategoryModalOpen(false);
    } else if (categories.includes(newCategoryName.trim())) {
      alert('Category already exists!');
    }
  };

  // Add new sheet
  const addSheet = () => {
    if (newSheetName.trim() && selectedCategory) {
      const sheetKey = `${selectedCategory}_${newSheetName.trim()}`;
      if (!sheets[sheetKey]) {
        const newSheet = {
          name: newSheetName.trim(),
          customColumns: [],
          rows: [
            {
              id: 1,
              date: new Date().toISOString().split('T')[0],
              refNo: '',
              totalAmount: 0,
              remarks: '',
              customData: {}
            }
          ]
        };
        setSheets({ ...sheets, [sheetKey]: newSheet });
        setSelectedSheet(newSheetName.trim());
        setNewSheetName('');
        setIsSheetModalOpen(false);
      } else {
        alert('Sheet name already exists in this category!');
      }
    }
  };

  // Get sheets for selected category
  const getSheetsForCategory = (category) => {
    return Object.keys(sheets)
      .filter(key => key.startsWith(`${category}_`))
      .map(key => key.replace(`${category}_`, ''));
  };

  // Add new custom column
  const addColumn = () => {
    const columnName = prompt('Enter column name:');
    if (columnName && columnName.trim()) {
      const newColumn = {
        id: `custom_${Date.now()}`,
        name: columnName.trim(),
        type: 'text',
        fixed: false
      };
      const updatedColumns = [...customColumns, newColumn];
      setCustomColumns(updatedColumns);
      
      // Add empty values for existing rows
      const updatedRows = rows.map(row => ({
        ...row,
        customData: { ...row.customData, [newColumn.id]: '' }
      }));
      setRows(updatedRows);
      
      // Save to sheets
      saveCurrentSheet(updatedColumns, updatedRows);
    }
  };

  // Remove custom column
  const removeColumn = (columnId) => {
    if (window.confirm('Are you sure you want to remove this column?')) {
      const updatedColumns = customColumns.filter(col => col.id !== columnId);
      setCustomColumns(updatedColumns);
      
      // Remove data for this column from all rows
      const updatedRows = rows.map(row => {
        const newCustomData = { ...row.customData };
        delete newCustomData[columnId];
        return { ...row, customData: newCustomData };
      });
      setRows(updatedRows);
      
      // Save to sheets
      saveCurrentSheet(updatedColumns, updatedRows);
    }
  };

  // Add new row
  const addRow = () => {
    const newRow = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      totalAmount: 0,
      remarks: '',
      customData: {}
    };
    
    // Initialize custom columns with empty values
    customColumns.forEach(col => {
      newRow.customData[col.id] = '';
    });
    
    const updatedRows = [...rows, newRow];
    setRows(updatedRows);
    saveCurrentSheet(customColumns, updatedRows);
  };

  // Remove row
  const removeRow = (rowId) => {
    if (rows.length > 1) {
      const updatedRows = rows.filter(row => row.id !== rowId);
      setRows(updatedRows);
      saveCurrentSheet(customColumns, updatedRows);
    }
  };

  // Update cell value
  const updateCell = (rowId, columnId, value) => {
    const updatedRows = rows.map(row => {
      if (row.id === rowId) {
        if (columnId.startsWith('custom_')) {
          return {
            ...row,
            customData: { ...row.customData, [columnId]: value }
          };
        } else {
          return { ...row, [columnId]: value };
        }
      }
      return row;
    });
    setRows(updatedRows);
    saveCurrentSheet(customColumns, updatedRows);
  };

  // Get cell value
  const getCellValue = (row, columnId) => {
    if (columnId.startsWith('custom_')) {
      return row.customData[columnId] || '';
    }
    return row[columnId] || '';
  };

  // Edit sheet name
  const startEditingName = () => {
    setTempName(sheetName);
    setIsEditingName(true);
  };

  const saveName = () => {
    if (tempName.trim() && selectedCategory && selectedSheet) {
      const oldKey = `${selectedCategory}_${selectedSheet}`;
      const newKey = `${selectedCategory}_${tempName.trim()}`;
      
      if (oldKey !== newKey && sheets[newKey]) {
        alert('A sheet with this name already exists in this category!');
        return;
      }
      
      const sheetData = sheets[oldKey];
      sheetData.name = tempName.trim();
      
      if (oldKey !== newKey) {
        const newSheets = { ...sheets };
        delete newSheets[oldKey];
        newSheets[newKey] = sheetData;
        setSheets(newSheets);
        setSelectedSheet(tempName.trim());
      } else {
        setSheets({ ...sheets, [oldKey]: sheetData });
      }
      
      setSheetName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setTempName('');
  };

  // Calculate total
  const calculateTotal = () => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.totalAmount) || 0), 0);
  };

  // Save current sheet
  const saveCurrentSheet = (cols = customColumns, rowsData = rows) => {
    if (selectedCategory && selectedSheet) {
      const sheetKey = `${selectedCategory}_${selectedSheet}`;
      setSheets({
        ...sheets,
        [sheetKey]: {
          name: sheetName,
          customColumns: cols,
          rows: rowsData
        }
      });
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (!selectedCategory || !selectedSheet) {
      alert('Please select a category and sheet first!');
      return;
    }
    
    // Create CSV header
    const headers = allColumns.map(col => col.name).join(',');
    
    // Create CSV rows
    const csvRows = rows.map(row => {
      return allColumns.map(col => {
        const value = getCellValue(row, col.id);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    // Combine all
    const csv = [sheetName, '', headers, ...csvRows].join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCategory}_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Expenses Management</h1>
      </div>

      {/* Category and Sheet Selection */}
      <Card>
        <div className="form-grid">
          <div className="form-group">
            <label>Category</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setSelectedSheet('');
                  setSheetName('');
                }}
                style={{ flex: 1 }}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsCategoryModalOpen(true)} 
                className="btn-secondary"
                title="Add new category"
              >
                <FolderPlus size={18} />
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Sheet Name</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={selectedSheet}
                onChange={(e) => setSelectedSheet(e.target.value)}
                disabled={!selectedCategory}
                style={{ flex: 1 }}
              >
                <option value="">Select Sheet</option>
                {selectedCategory && getSheetsForCategory(selectedCategory).map(sheet => (
                  <option key={sheet} value={sheet}>{sheet}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsSheetModalOpen(true)}
                className="btn-secondary"
                disabled={!selectedCategory}
                title="Add new sheet"
              >
                <FileText size={18} />
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Sheet Editor - Only show if category and sheet are selected */}
      {selectedCategory && selectedSheet && (
        <>
          <div className="page-header">
            {isEditingName ? (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="form-group input"
                  style={{ fontSize: '24px', fontWeight: '600', margin: 0, padding: '4px 12px' }}
                  autoFocus
                />
                <button onClick={saveName} className="btn-icon btn-success">
                  <Check size={18} />
                </button>
                <button onClick={cancelEditName} className="btn-icon btn-delete">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {sheetName}
                </h2>
                <button onClick={startEditingName} className="btn-icon" title="Edit name">
                  <Edit2 size={18} />
                </button>
              </div>
            )}
            
            <div className="action-buttons">
              <button onClick={exportToCSV} className="btn-primary">
                <Download size={18} /> Export CSV
              </button>
            </div>
          </div>

          <Card>
            <div className="action-buttons" style={{ marginBottom: '20px' }}>
              <button onClick={addColumn} className="btn-secondary">
                <Plus size={18} /> Add Column
              </button>
              <button onClick={addRow} className="btn-secondary">
                <Plus size={18} /> Add Row
              </button>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    {allColumns.map(col => (
                      <th key={col.id} style={{ minWidth: col.id === 'remarks' ? '200px' : '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{col.name}</span>
                          {!col.fixed && (
                            <button
                              onClick={() => removeColumn(col.id)}
                              className="btn-icon"
                              style={{ color: '#ef4444', padding: '2px' }}
                              title="Remove column"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th style={{ width: '80px', textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id}>
                      <td style={{ fontWeight: '600', color: '#6b7280' }}>{index + 1}</td>
                      {allColumns.map(col => (
                        <td key={col.id}>
                          <input
                            type={col.type}
                            value={getCellValue(row, col.id)}
                            onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              outline: 'none'
                            }}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => removeRow(row.id)}
                          disabled={rows.length === 1}
                          className="btn-icon btn-delete"
                          style={{ 
                            opacity: rows.length === 1 ? 0.5 : 1,
                            cursor: rows.length === 1 ? 'not-allowed' : 'pointer'
                          }}
                          title={rows.length === 1 ? 'Cannot delete last row' : 'Delete row'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot style={{ background: '#f9fafb', fontWeight: '600' }}>
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'right', fontSize: '15px', color: '#1f2937' }}>
                      Total:
                    </td>
                    <td style={{ fontSize: '16px', color: '#1f2937' }}>
                      ₹{calculateTotal().toFixed(2)}
                    </td>
                    <td colSpan={customColumns.length + 1}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Add Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false);
          setNewCategoryName('');
        }}
        title="Add New Category"
      >
        <div className="form-group">
          <label>Category Name</label>
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g., Office Expenses, Travel, Utilities"
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          />
        </div>
        <div className="modal-actions">
          <button 
            onClick={() => {
              setIsCategoryModalOpen(false);
              setNewCategoryName('');
            }} 
            className="btn-secondary"
          >
            Cancel
          </button>
          <button onClick={addCategory} className="btn-primary">
            <Plus size={18} /> Add Category
          </button>
        </div>
      </Modal>

      {/* Add Sheet Modal */}
      <Modal
        isOpen={isSheetModalOpen}
        onClose={() => {
          setIsSheetModalOpen(false);
          setNewSheetName('');
        }}
        title={`Add New Sheet to ${selectedCategory}`}
      >
        <div className="form-group">
          <label>Sheet Name</label>
          <input
            type="text"
            value={newSheetName}
            onChange={(e) => setNewSheetName(e.target.value)}
            placeholder="e.g., January 2025, Q1 Expenses"
            onKeyPress={(e) => e.key === 'Enter' && addSheet()}
          />
        </div>
        <div className="modal-actions">
          <button 
            onClick={() => {
              setIsSheetModalOpen(false);
              setNewSheetName('');
            }} 
            className="btn-secondary"
          >
            Cancel
          </button>
          <button onClick={addSheet} className="btn-primary">
            <Plus size={18} /> Add Sheet
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;