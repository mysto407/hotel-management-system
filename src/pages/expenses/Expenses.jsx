// src/pages/expenses/Expenses.jsx
import { useState, useEffect } from 'react';
import { Save, Download, Edit2, X, Check, FolderPlus, FileText, Plus, Trash2 } from 'lucide-react';
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
  const [hoveredColumn, setHoveredColumn] = useState(null);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Default columns - split into groups to allow custom columns between them
  const fixedColumns = [
    { id: 'date', name: 'Date', type: 'date', fixed: true, group: 'start' },
    { id: 'refNo', name: 'Ref No.', type: 'text', fixed: true, group: 'start' },
    { id: 'totalAmount', name: 'Total Amount', type: 'number', fixed: true, group: 'end' },
    { id: 'remarks', name: 'Remarks', type: 'text', fixed: true, group: 'end' }
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

  // Build allColumns with custom columns interspersed
  const allColumns = [
    ...fixedColumns.filter(col => col.group === 'start'),
    ...customColumns,
    ...fixedColumns.filter(col => col.group === 'end')
  ];

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

  // Add column after specific position
  const addColumnAfter = (afterIndex) => {
    const columnName = prompt('Enter column name:');
    if (columnName && columnName.trim()) {
      const newColumn = {
        id: `custom_${Date.now()}`,
        name: columnName.trim(),
        type: 'text',
        fixed: false
      };
      
      // Find how many fixed 'start' columns there are (Date, Ref No.)
      const startFixedCount = fixedColumns.filter(col => col.group === 'start').length;
      
      // Calculate where to insert in customColumns array
      // afterIndex is the position in allColumns
      // Custom columns start after the 'start' fixed columns
      const insertIndex = afterIndex - startFixedCount + 1;
      
      const updatedColumns = [...customColumns];
      if (insertIndex <= 0) {
        // Insert at beginning of custom columns (right after 'start' fixed)
        updatedColumns.unshift(newColumn);
      } else if (insertIndex >= updatedColumns.length) {
        // Insert at end of custom columns (right before 'end' fixed)
        updatedColumns.push(newColumn);
      } else {
        // Insert at specific position
        updatedColumns.splice(insertIndex, 0, newColumn);
      }
      
      setCustomColumns(updatedColumns);
      
      // Add empty values for existing rows
      const updatedRows = rows.map(row => ({
        ...row,
        customData: { ...row.customData, [newColumn.id]: '' }
      }));
      setRows(updatedRows);
      
      saveCurrentSheet(updatedColumns, updatedRows);
    }
  };

  // Remove custom column
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
      
      saveCurrentSheet(updatedColumns, updatedRows);
    }
  };

  // Add row after specific position
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Expenses Management</h1>
        {selectedCategory && selectedSheet && (
          <div className="action-buttons">
            <button onClick={exportToCSV} className="btn-primary">
              <Download size={18} /> Export CSV
            </button>
          </div>
        )}
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

      {/* Spreadsheet - Only show if category and sheet are selected */}
      {selectedCategory && selectedSheet && (
        <Card style={{ padding: '16px', overflow: 'auto' }}>
          {/* Sheet Name Header */}
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    padding: '4px 8px',
                    border: '2px solid #3b82f6',
                    borderRadius: '4px'
                  }}
                  autoFocus
                />
                <button onClick={saveName} className="btn-icon" style={{ color: '#10b981' }}>
                  <Check size={16} />
                </button>
                <button onClick={cancelEditName} className="btn-icon" style={{ color: '#ef4444' }}>
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  {sheetName}
                </h3>
                <button onClick={startEditingName} className="btn-icon" title="Edit name">
                  <Edit2 size={14} />
                </button>
              </>
            )}
          </div>

          {/* Spreadsheet Table */}
          <div style={{ 
            border: '1px solid #d1d5db', 
            borderRadius: '4px',
            overflow: 'auto',
            background: 'white'
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              fontFamily: 'monospace',
              fontSize: '13px'
            }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  <th style={{ 
                    padding: '0',
                    width: '40px',
                    minWidth: '40px',
                    border: '1px solid #d1d5db',
                    background: '#f3f4f6',
                    position: 'sticky',
                    left: 0,
                    zIndex: 11
                  }}></th>
                  {allColumns.map((col, colIndex) => (
                    <th 
                      key={col.id}
                      onMouseEnter={() => setHoveredColumn(colIndex)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      style={{ 
                        padding: '8px',
                        minWidth: col.id === 'remarks' ? '200px' : '120px',
                        border: '1px solid #d1d5db',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#374151',
                        background: hoveredColumn === colIndex ? '#f3f4f6' : '#f9fafb',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                        <span>{col.name}</span>
                        {hoveredColumn === colIndex && (
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {!col.fixed && (
                              <button
                                onClick={() => removeColumn(col.id)}
                                className="btn-icon"
                                style={{ padding: '2px', background: 'white', color: '#ef4444' }}
                                title="Delete column"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                            <button
                              onClick={() => addColumnAfter(colIndex)}
                              className="btn-icon"
                              style={{ padding: '2px', background: 'white' }}
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
                {rows.map((row, rowIndex) => (
                  <tr 
                    key={row.id}
                    onMouseEnter={() => setHoveredRow(rowIndex)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    <td style={{ 
                      padding: '4px',
                      textAlign: 'center',
                      border: '1px solid #d1d5db',
                      background: hoveredRow === rowIndex ? '#f3f4f6' : '#f9fafb',
                      fontWeight: '600',
                      color: '#6b7280',
                      fontSize: '11px',
                      position: 'sticky',
                      left: 0,
                      zIndex: 10
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span>{rowIndex + 1}</span>
                        {hoveredRow === rowIndex && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              onClick={() => addRowAfter(rowIndex)}
                              className="btn-icon"
                              style={{ padding: '2px', background: 'white' }}
                              title="Add row after"
                            >
                              <Plus size={10} />
                            </button>
                            {rows.length > 1 && (
                              <button
                                onClick={() => removeRow(row.id)}
                                className="btn-icon"
                                style={{ padding: '2px', background: 'white', color: '#ef4444' }}
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
                      <td key={col.id} style={{ 
                        padding: '0',
                        border: '1px solid #d1d5db'
                      }}>
                        <input
                          type={col.type}
                          value={getCellValue(row, col.id)}
                          onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px',
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            background: 'transparent'
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#fef3c7', fontWeight: '600' }}>
                  <td colSpan={3} style={{ 
                    padding: '8px', 
                    textAlign: 'right',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    color: '#78350f'
                  }}>
                    Total:
                  </td>
                  <td style={{ 
                    padding: '8px',
                    border: '1px solid #d1d5db',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#78350f'
                  }}>
                    ₹{calculateTotal().toFixed(2)}
                  </td>
                  <td colSpan={customColumns.length} style={{ 
                    border: '1px solid #d1d5db'
                  }}></td>
                </tr>
              </tfoot>
            </table>
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