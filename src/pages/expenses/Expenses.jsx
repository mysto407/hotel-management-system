// src/pages/expenses/Expenses.jsx
import { useState, useEffect } from 'react';
import { Download, Edit2, X, Check, Plus, Trash2 } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useExpense } from '../../context/ExpensesContext';

const Expenses = () => {
  const {
    categories,
    loading,
    addCategory,
    removeCategory,
    loadSheets,
    addSheet,
    loadSheetData,
    saveSheetData
  } = useExpense();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [sheets, setSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [sheetName, setSheetName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Fixed columns - split into groups to allow custom columns between them
  const fixedColumns = [
    { id: 'date', name: 'Date', type: 'date', fixed: true, group: 'start' },
    { id: 'refNo', name: 'Ref No.', type: 'text', fixed: true, group: 'start' },
    { id: 'totalAmount', name: 'Total Amount', type: 'number', fixed: true, group: 'end' },
    { id: 'remarks', name: 'Remarks', type: 'text', fixed: true, group: 'end' }
  ];

  const [customColumns, setCustomColumns] = useState([]);
  const [rows, setRows] = useState([
    {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      totalAmount: 0,
      remarks: '',
      customData: {}
    }
  ]);

  // Build allColumns with custom columns interspersed
  const allColumns = [
    ...fixedColumns.filter(col => col.group === 'start'),
    ...customColumns,
    ...fixedColumns.filter(col => col.group === 'end')
  ];

  // Helper function to get month/year from date
  const getMonthYear = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper function to format month header
  const formatMonthHeader = (monthYear) => {
    if (!monthYear) return '';
    const [year, month] = monthYear.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Group rows by month
  const getGroupedRows = () => {
    const grouped = [];
    let currentMonth = null;

    rows.forEach((row, index) => {
      const rowMonth = getMonthYear(row.date);
      
      if (rowMonth !== currentMonth) {
        grouped.push({
          type: 'header',
          monthYear: rowMonth,
          displayText: formatMonthHeader(rowMonth) || 'No Date Set'
        });
        currentMonth = rowMonth;
      }
      
      grouped.push({
        type: 'data',
        data: row,
        originalIndex: index
      });
    });

    return grouped;
  };

  // Load sheets when category changes
  useEffect(() => {
    if (selectedCategory) {
      loadCategorySheets();
    } else {
      setSheets([]);
      setSelectedSheet(null);
    }
  }, [selectedCategory]);

  // Load sheet data when selected sheet changes
  useEffect(() => {
    if (selectedSheet) {
      loadSelectedSheetData();
    }
  }, [selectedSheet]);

  const loadCategorySheets = async () => {
    const categoryObj = categories.find(c => c.name === selectedCategory);
    if (categoryObj) {
      const loadedSheets = await loadSheets(categoryObj.id);
      setSheets(loadedSheets);
    }
  };

  const loadSelectedSheetData = async () => {
    if (selectedSheet && selectedSheet.id) {
      const data = await loadSheetData(selectedSheet.id);
      if (data) {
        setSheetName(selectedSheet.name);
        setCustomColumns(data.customColumns || []);
        setRows(data.rows && data.rows.length > 0 ? data.rows : [
          {
            id: Date.now(),
            date: new Date().toISOString().split('T')[0],
            refNo: '',
            totalAmount: 0,
            remarks: '',
            customData: {}
          }
        ]);
      }
    }
  };

  const handleAddCategory = async () => {
    if (newCategoryName.trim()) {
      const existingCategory = categories.find(c => c.name === newCategoryName.trim());
      if (existingCategory) {
        alert('Category already exists!');
        return;
      }
      
      const newCategory = await addCategory(newCategoryName.trim());
      if (newCategory) {
        setNewCategoryName('');
        setIsCategoryModalOpen(false);
      }
    }
  };

  const handleAddSheet = async () => {
    if (newSheetName.trim() && selectedCategory) {
      const categoryObj = categories.find(c => c.name === selectedCategory);
      if (categoryObj) {
        const existingSheet = sheets.find(s => s.name === newSheetName.trim());
        if (existingSheet) {
          alert('Sheet name already exists in this category!');
          return;
        }

        const newSheet = await addSheet(categoryObj.id, newSheetName.trim());
        if (newSheet) {
          setSheets([...sheets, newSheet]);
          setSelectedSheet(newSheet);
          setNewSheetName('');
          setIsSheetModalOpen(false);
        }
      }
    }
  };

  const handleDeleteCategory = async (categoryName) => {
    if (window.confirm(`Delete category "${categoryName}" and all its sheets?`)) {
      const categoryObj = categories.find(c => c.name === categoryName);
      if (categoryObj) {
        const success = await removeCategory(categoryObj.id);
        if (success && selectedCategory === categoryName) {
          setSelectedCategory('');
          setSelectedSheet(null);
        }
      }
    }
  };

  const addColumnAfter = (afterIndex) => {
    const columnName = prompt('Enter column name:');
    if (columnName && columnName.trim()) {
      const newColumn = {
        id: `custom_${Date.now()}`,
        name: columnName.trim(),
        type: 'text',
        fixed: false
      };
      
      const startFixedCount = fixedColumns.filter(col => col.group === 'start').length;
      const insertIndex = afterIndex - startFixedCount + 1;
      
      const updatedColumns = [...customColumns];
      if (insertIndex <= 0) {
        updatedColumns.unshift(newColumn);
      } else if (insertIndex >= updatedColumns.length) {
        updatedColumns.push(newColumn);
      } else {
        updatedColumns.splice(insertIndex, 0, newColumn);
      }
      
      setCustomColumns(updatedColumns);
      
      const updatedRows = rows.map(row => ({
        ...row,
        customData: { ...row.customData, [newColumn.id]: '' }
      }));
      setRows(updatedRows);
      
      if (selectedSheet) {
        saveSheetData(selectedSheet.id, updatedColumns, updatedRows);
      }
    }
  };

  const removeColumn = (columnId) => {
    if (window.confirm('Are you sure you want to remove this column?')) {
      const updatedColumns = customColumns.filter(col => col.id !== columnId);
      setCustomColumns(updatedColumns);
      
      const updatedRows = rows.map(row => {
        const newCustomData = { ...row.customData };
        delete newCustomData[columnId];
        return { ...row, customData: newCustomData };
      });
      setRows(updatedRows);
      
      if (selectedSheet) {
        saveSheetData(selectedSheet.id, updatedColumns, updatedRows);
      }
    }
  };

  const addRowAfter = (afterIndex) => {
    const newRow = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      totalAmount: 0,
      remarks: '',
      customData: {}
    };
    
    customColumns.forEach(col => {
      newRow.customData[col.id] = '';
    });
    
    const updatedRows = [...rows];
    updatedRows.splice(afterIndex + 1, 0, newRow);
    setRows(updatedRows);
    
    if (selectedSheet) {
      saveSheetData(selectedSheet.id, customColumns, updatedRows);
    }
  };

  const removeRow = (rowId) => {
    if (rows.length > 1) {
      const updatedRows = rows.filter(row => row.id !== rowId);
      setRows(updatedRows);
      
      if (selectedSheet) {
        saveSheetData(selectedSheet.id, customColumns, updatedRows);
      }
    }
  };

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
    
    // Auto-save with debounce would be better in production
    if (selectedSheet) {
      saveSheetData(selectedSheet.id, customColumns, updatedRows);
    }
  };

  const getCellValue = (row, columnId) => {
    if (columnId.startsWith('custom_')) {
      return row.customData[columnId] || '';
    }
    return row[columnId] || '';
  };

  const startEditingName = () => {
    setTempName(sheetName);
    setIsEditingName(true);
  };

  const saveName = async () => {
    if (tempName.trim() && selectedSheet) {
      // Update in backend would require a new function in context
      // For now, just update locally
      setSheetName(tempName.trim());
      setIsEditingName(false);
      
      // You might want to add an updateSheet function to context
      // await updateSheet(selectedSheet.id, { name: tempName.trim() });
    }
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setTempName('');
  };

  const calculateTotal = () => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.totalAmount) || 0), 0);
  };

  const exportToCSV = () => {
    if (!selectedCategory || !selectedSheet) {
      alert('Please select a category and sheet first!');
      return;
    }
    
    const headers = allColumns.map(col => col.name).join(',');
    const csvRows = rows.map(row => {
      return allColumns.map(col => {
        const value = getCellValue(row, col.id);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    });
    
    const csv = [sheetName, '', headers, ...csvRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedCategory}_${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading expenses...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header with Category Pills */}
      <div className="page-header">
        <div className="expenses-header-content">
          <h1 className="page-title expenses-title">Expenses Management</h1>
          
          <div className="category-pills">
            {categories.map(cat => (
              <div key={cat.id} style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setSelectedSheet(null);
                    setSheetName('');
                  }}
                  className={`category-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                >
                  📁 {cat.name}
                </button>
                {selectedCategory === cat.name && (
                  <button
                    onClick={() => handleDeleteCategory(cat.name)}
                    style={{
                      position: 'absolute',
                      top: '-8px',
                      right: '-8px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: '#ef4444',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title="Delete category"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="category-pill add-pill"
              title="Add new category"
            >
              <Plus size={16} /> Add Category
            </button>
          </div>
        </div>

        {selectedCategory && selectedSheet && (
          <div className="action-buttons">
            <button onClick={exportToCSV} className="btn-primary">
              <Download size={18} /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Sheet Tabs */}
      {selectedCategory && (
        <Card className="sheet-tabs-card">
          <div className="sheet-tabs-container">
            <span className="sheet-tabs-label">Sheets:</span>
            {sheets.map(sheet => (
              <button
                key={sheet.id}
                onClick={() => setSelectedSheet(sheet)}
                className={`sheet-tab ${selectedSheet?.id === sheet.id ? 'active' : ''}`}
              >
                📄 {sheet.name}
              </button>
            ))}
            <button
              onClick={() => setIsSheetModalOpen(true)}
              className="sheet-tab add-tab"
              title="Add new sheet"
            >
              <Plus size={16} /> Add Sheet
            </button>
          </div>
        </Card>
      )}

      {/* Spreadsheet */}
      {selectedCategory && selectedSheet && (
        <Card className="spreadsheet-card">
          {/* Sheet Name Header */}
          <div className="sheet-name-header">
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="sheet-name-input"
                  autoFocus
                />
                <button onClick={saveName} className="btn-icon sheet-name-btn save">
                  <Check size={16} />
                </button>
                <button onClick={cancelEditName} className="btn-icon sheet-name-btn cancel">
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <h3 className="sheet-name-title">{sheetName}</h3>
                <button onClick={startEditingName} className="btn-icon" title="Edit name">
                  <Edit2 size={14} />
                </button>
              </>
            )}
          </div>

          {/* Spreadsheet Table */}
          <div className="spreadsheet-container">
            <table className="spreadsheet-table">
              <thead>
                <tr>
                  <th className="spreadsheet-row-header"></th>
                  {allColumns.map((col, colIndex) => (
                    <th 
                      key={col.id}
                      onMouseEnter={() => setHoveredColumn(colIndex)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      className={`spreadsheet-col-header ${hoveredColumn === colIndex ? 'hovered' : ''}`}
                    >
                      <div className="spreadsheet-col-header-content">
                        <span>{col.name}</span>
                        {hoveredColumn === colIndex && (
                          <div className="spreadsheet-col-actions">
                            {!col.fixed && (
                              <button
                                onClick={() => removeColumn(col.id)}
                                className="btn-icon spreadsheet-action-btn delete"
                                title="Delete column"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => addColumnAfter(colIndex)}
                              className="btn-icon spreadsheet-action-btn"
                              title="Add column after"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getGroupedRows().map((item, idx) => {
                  if (item.type === 'header') {
                    return (
                      <tr key={`header-${item.monthYear}-${idx}`}>
                        <td colSpan={allColumns.length + 1} className="spreadsheet-month-header">
                          📅 {item.displayText}
                        </td>
                      </tr>
                    );
                  } else {
                    const row = item.data;
                    const rowIndex = item.originalIndex;
                    return (
                      <tr key={row.id}>
                        <td 
                          onMouseEnter={() => setHoveredRow(rowIndex)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className={`spreadsheet-row-number ${hoveredRow === rowIndex ? 'hovered' : ''}`}
                        >
                          <div className="spreadsheet-row-number-content">
                            <span>{rowIndex + 1}</span>
                            {hoveredRow === rowIndex && (
                              <div className="spreadsheet-row-actions">
                                <button
                                  onClick={() => addRowAfter(rowIndex)}
                                  className="btn-icon spreadsheet-action-btn"
                                  title="Add row after"
                                >
                                  <Plus size={10} />
                                </button>
                                {rows.length > 1 && (
                                  <button
                                    onClick={() => removeRow(row.id)}
                                    className="btn-icon spreadsheet-action-btn delete"
                                    title="Delete row"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        {allColumns.map(col => (
                          <td key={col.id} className="spreadsheet-cell">
                            <input
                              type={col.type}
                              value={getCellValue(row, col.id)}
                              onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                              className="spreadsheet-cell-input"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>

          {/* Total Row */}
          <div className="spreadsheet-total">
            <span className="spreadsheet-total-label">Total:</span>
            <span className="spreadsheet-total-value">₹{calculateTotal().toFixed(2)}</span>
          </div>
        </Card>
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
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
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
          <button onClick={handleAddCategory} className="btn-primary">
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
            onKeyPress={(e) => e.key === 'Enter' && handleAddSheet()}
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
          <button onClick={handleAddSheet} className="btn-primary">
            <Plus size={18} /> Add Sheet
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Expenses;