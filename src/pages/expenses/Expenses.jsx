import { useState } from 'react';
import { Plus, Trash2, Save, Download, Upload, Edit2, X, Check } from 'lucide-react';

const Expenses = () => {
  const [sheetName, setSheetName] = useState('Monthly Expenses');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

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
      setCustomColumns([...customColumns, newColumn]);
      
      // Add empty values for existing rows
      setRows(rows.map(row => ({
        ...row,
        customData: { ...row.customData, [newColumn.id]: '' }
      })));
    }
  };

  // Remove custom column
  const removeColumn = (columnId) => {
    if (window.confirm('Are you sure you want to remove this column?')) {
      setCustomColumns(customColumns.filter(col => col.id !== columnId));
      
      // Remove data for this column from all rows
      setRows(rows.map(row => {
        const newCustomData = { ...row.customData };
        delete newCustomData[columnId];
        return { ...row, customData: newCustomData };
      }));
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
    
    setRows([...rows, newRow]);
  };

  // Remove row
  const removeRow = (rowId) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== rowId));
    }
  };

  // Update cell value
  const updateCell = (rowId, columnId, value) => {
    setRows(rows.map(row => {
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
    }));
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
    if (tempName.trim()) {
      setSheetName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const cancelEditName = () => {
    setIsEditingName(false);
    setTempName('');
  };

  // Calculate total
  const calculateTotal = () => {
    return rows.reduce((sum, row) => sum + (parseFloat(row.totalAmount) || 0), 0);
  };

  // Export to CSV
  const exportToCSV = () => {
    // Create CSV header
    const headers = allColumns.map(col => col.name).join(',');
    
    // Create CSV rows
    const csvRows = rows.map(row => {
      return allColumns.map(col => {
        const value = getCellValue(row, col.id);
        // Escape commas and quotes in values
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
    a.download = `${sheetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Save to localStorage
  const saveToStorage = () => {
    const data = {
      sheetName,
      customColumns,
      rows
    };
    
    // Get existing sheets
    const existingSheets = JSON.parse(localStorage.getItem('expenseSheets') || '[]');
    
    // Add or update current sheet
    const sheetIndex = existingSheets.findIndex(s => s.sheetName === sheetName);
    if (sheetIndex >= 0) {
      existingSheets[sheetIndex] = data;
    } else {
      existingSheets.push(data);
    }
    
    localStorage.setItem('expenseSheets', JSON.stringify(existingSheets));
    alert('Expenses saved successfully!');
  };

  return (
    <div style={{ padding: '24px', background: '#f3f4f6', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '24px', 
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          {isEditingName ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  padding: '4px 12px',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  outline: 'none'
                }}
                autoFocus
              />
              <button
                onClick={saveName}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Check size={18} />
              </button>
              <button
                onClick={cancelEditName}
                style={{
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                {sheetName}
              </h1>
              <button
                onClick={startEditingName}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Edit name"
              >
                <Edit2 size={18} />
              </button>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={saveToStorage}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: '500'
              }}
            >
              <Save size={18} /> Save
            </button>
            <button
              onClick={exportToCSV}
              style={{
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '15px',
                fontWeight: '500'
              }}
            >
              <Download size={18} /> Export CSV
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={addColumn}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            <Plus size={18} /> Add Column
          </button>
          <button
            onClick={addRow}
            style={{
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            <Plus size={18} /> Add Row
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        overflow: 'auto',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse',
          minWidth: '800px'
        }}>
          <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ 
                padding: '14px 16px', 
                textAlign: 'left', 
                fontSize: '13px', 
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                borderBottom: '2px solid #e5e7eb',
                width: '50px'
              }}>
                #
              </th>
              {allColumns.map(col => (
                <th key={col.id} style={{ 
                  padding: '14px 16px', 
                  textAlign: 'left', 
                  fontSize: '13px', 
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  borderBottom: '2px solid #e5e7eb',
                  minWidth: col.id === 'remarks' ? '200px' : '150px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{col.name}</span>
                    {!col.fixed && (
                      <button
                        onClick={() => removeColumn(col.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          color: '#ef4444',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Remove column"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ 
                padding: '14px 16px', 
                textAlign: 'center', 
                fontSize: '13px', 
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                borderBottom: '2px solid #e5e7eb',
                width: '80px'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.id} style={{ 
                borderBottom: '1px solid #e5e7eb',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <td style={{ 
                  padding: '12px 16px', 
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '600'
                }}>
                  {index + 1}
                </td>
                {allColumns.map(col => (
                  <td key={col.id} style={{ padding: '12px 16px' }}>
                    {col.type === 'date' ? (
                      <input
                        type="date"
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
                    ) : col.type === 'number' ? (
                      <input
                        type="number"
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
                    ) : (
                      <input
                        type="text"
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
                    )}
                  </td>
                ))}
                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    style={{
                      background: rows.length === 1 ? '#f3f4f6' : '#fee2e2',
                      color: rows.length === 1 ? '#9ca3af' : '#ef4444',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto'
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
              <td colSpan={3} style={{ 
                padding: '14px 16px', 
                textAlign: 'right',
                fontSize: '15px',
                color: '#1f2937',
                borderTop: '2px solid #e5e7eb'
              }}>
                Total:
              </td>
              <td style={{ 
                padding: '14px 16px',
                fontSize: '16px',
                color: '#1f2937',
                borderTop: '2px solid #e5e7eb'
              }}>
                ₹{calculateTotal().toFixed(2)}
              </td>
              <td colSpan={customColumns.length + 1} style={{ 
                borderTop: '2px solid #e5e7eb'
              }}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary */}
      <div style={{ 
        background: 'white', 
        borderRadius: '8px', 
        padding: '20px',
        marginTop: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
          Summary
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Rows</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>{rows.length}</p>
          </div>
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Columns</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#1f2937' }}>{allColumns.length}</p>
          </div>
          <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '6px' }}>
            <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Total Amount</p>
            <p style={{ fontSize: '24px', fontWeight: '700', color: '#10b981' }}>₹{calculateTotal().toFixed(2)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Expenses;