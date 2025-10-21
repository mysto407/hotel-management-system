// src/pages/expenses/Expenses.jsx
import { useState } from 'react';
import { Plus, Trash2, Save, Download, Edit2, X, Check } from 'lucide-react';
import { Card } from '../../components/common/Card';

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
    <div>
      <div className="page-header">
        {isEditingName ? (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="form-group input"
              style={{ fontSize: '28px', fontWeight: '700', margin: 0, padding: '4px 12px' }}
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
            <h1 className="page-title">{sheetName}</h1>
            <button onClick={startEditingName} className="btn-icon" title="Edit name">
              <Edit2 size={18} />
            </button>
          </div>
        )}
        
        <div className="action-buttons">
          <button onClick={saveToStorage} className="btn-primary">
            <Save size={18} /> Save
          </button>
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

      <Card title="Summary">
        <div className="stats-grid">
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Rows</p>
              <p className="stat-value">{rows.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Columns</p>
              <p className="stat-value">{allColumns.length}</p>
            </div>
          </div>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Amount</p>
              <p className="stat-value" style={{ color: '#10b981' }}>₹{calculateTotal().toFixed(2)}</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Expenses;