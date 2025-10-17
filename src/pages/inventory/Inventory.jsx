// ==========================================
// FILE: src/pages/inventory/Inventory.jsx
// ==========================================
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, AlertTriangle, Package, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Card } from '../../components/common/Card';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';

const Inventory = () => {
  const { 
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
  } = useInventory();

  const { user } = useAuth();

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const [itemFormData, setItemFormData] = useState({
    name: '',
    category: 'Other',
    department: 'Housekeeping',
    unit: 'Pieces',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitPrice: 0,
    supplier: '',
  });

  const [transactionFormData, setTransactionFormData] = useState({
    itemId: '',
    type: 'Issue',
    quantity: 0,
    issuedTo: '',
    supplier: '',
    notes: ''
  });

  // Filter items
  const filteredItems = items
    .filter(item => filterDepartment === 'all' || item.department === filterDepartment)
    .filter(item => filterCategory === 'all' || item.category === filterCategory)
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(item => !showLowStockOnly || item.currentStock < item.minStock);

  const lowStockItems = getLowStockItems();

  const handleItemSubmit = () => {
    if (editingItem) {
      updateItem(editingItem.id, itemFormData);
    } else {
      addItem(itemFormData);
    }
    resetItemForm();
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      category: 'Other',
      department: 'Housekeeping',
      unit: 'Pieces',
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      unitPrice: 0,
      supplier: '',
    });
    setEditingItem(null);
    setIsItemModalOpen(false);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemFormData(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (itemId) => {
    if (window.confirm('Are you sure you want to delete this item? This will also delete its transaction history.')) {
      deleteItem(itemId);
    }
  };

  const handleTransactionSubmit = () => {
    if (transactionFormData.itemId && transactionFormData.quantity > 0) {
      addTransaction(transactionFormData, user.name);
      resetTransactionForm();
    } else {
      alert('Please select an item and enter a valid quantity');
    }
  };

  const resetTransactionForm = () => {
    setTransactionFormData({
      itemId: '',
      type: 'Issue',
      quantity: 0,
      issuedTo: '',
      supplier: '',
      notes: ''
    });
    setIsTransactionModalOpen(false);
  };

  const viewHistory = (item) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
  };

  const getStockStatus = (item) => {
    const percentage = (item.currentStock / item.maxStock) * 100;
    if (item.currentStock < item.minStock) return 'critical';
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'good';
  };

  const getStockStatusColor = (status) => {
    switch(status) {
      case 'critical': return '#ef4444';
      case 'low': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'good': return '#10b981';
      default: return '#6b7280';
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <div className="action-buttons">
          <button onClick={() => setIsTransactionModalOpen(true)} className="btn-secondary">
            <RefreshCw size={18} /> New Transaction
          </button>
          <button onClick={() => setIsItemModalOpen(true)} className="btn-primary">
            <Plus size={20} /> Add Item
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid">
        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Items</p>
              <p className="stat-value">{items.length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#3b82f6' }}>
              <Package color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Low Stock Alerts</p>
              <p className="stat-value" style={{ color: '#ef4444' }}>{lowStockItems.length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#ef4444' }}>
              <AlertTriangle color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Total Inventory Value</p>
              <p className="stat-value">₹{getTotalInventoryValue().toFixed(2)}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#10b981' }}>
              <TrendingUp color="white" size={24} />
            </div>
          </div>
        </Card>

        <Card>
          <div className="stat-card">
            <div>
              <p className="stat-label">Recent Transactions</p>
              <p className="stat-value">{transactions.length}</p>
            </div>
            <div className="stat-icon" style={{ backgroundColor: '#f59e0b' }}>
              <RefreshCw color="white" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Card>
          <div className="low-stock-banner">
            <AlertTriangle size={24} color="#ef4444" />
            <div>
              <h4>Low Stock Alert</h4>
              <p>{lowStockItems.length} items are below minimum stock level</p>
            </div>
            <button 
              onClick={() => setShowLowStockOnly(true)}
              className="btn-secondary"
              style={{ fontSize: '14px', padding: '6px 12px' }}
            >
              View Items
            </button>
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search items or suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        {showLowStockOnly && (
          <button 
            onClick={() => setShowLowStockOnly(false)}
            className="btn-secondary"
            style={{ fontSize: '14px' }}
          >
            Show All Items
          </button>
        )}
      </div>

      {/* Items Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item Name</th>
              <th>Category</th>
              <th>Department</th>
              <th>Current Stock</th>
              <th>Min / Max</th>
              <th>Unit Price</th>
              <th>Stock Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const status = getStockStatus(item);
              const stockValue = item.currentStock * item.unitPrice;
              
              return (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    <br />
                    <small style={{ color: '#6b7280' }}>{item.supplier}</small>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.department}</td>
                  <td>
                    <strong style={{ fontSize: '16px' }}>{item.currentStock}</strong> {item.unit}
                  </td>
                  <td>{item.minStock} / {item.maxStock}</td>
                  <td>₹{item.unitPrice}</td>
                  <td>₹{stockValue.toFixed(2)}</td>
                  <td>
                    <div className="stock-status-indicator">
                      <div 
                        className="stock-dot" 
                        style={{ backgroundColor: getStockStatusColor(status) }}
                      />
                      <span style={{ textTransform: 'capitalize' }}>{status}</span>
                    </div>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        onClick={() => viewHistory(item)}
                        className="btn-icon"
                        title="View History"
                        style={{ color: '#6b7280' }}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button onClick={() => handleEditItem(item)} className="btn-icon btn-edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="btn-icon btn-delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Department-wise Breakdown */}
      <Card title="Department-wise Inventory Value">
        <div className="department-breakdown">
          {departments.map(dept => {
            const deptItems = getItemsByDepartment(dept);
            const deptValue = getDepartmentValue(dept);
            
            if (deptItems.length === 0) return null;
            
            return (
              <div key={dept} className="department-item">
                <div>
                  <h4>{dept}</h4>
                  <p>{deptItems.length} items</p>
                </div>
                <div className="department-value">
                  ₹{deptValue.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Recent Transactions */}
      <Card title="Recent Transactions">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Department</th>
                <th>Performed By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 10).map(transaction => (
                <tr key={transaction.id}>
                  <td>{transaction.date}</td>
                  <td><strong>{transaction.itemName}</strong></td>
                  <td>
                    <span className={`transaction-badge transaction-${transaction.type.toLowerCase()}`}>
                      {transaction.type === 'Issue' && <TrendingDown size={14} />}
                      {transaction.type === 'Receive' && <TrendingUp size={14} />}
                      {transaction.type === 'Adjust' && <RefreshCw size={14} />}
                      {transaction.type}
                    </span>
                  </td>
                  <td>{transaction.quantity}</td>
                  <td>{transaction.department}</td>
                  <td>{transaction.performedBy}</td>
                  <td>{transaction.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={resetItemForm}
        title={editingItem ? 'Edit Item' : 'Add New Item'}
        size="large"
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              value={itemFormData.name}
              onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
              placeholder="e.g., Bed Sheets"
            />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <select
              value={itemFormData.category}
              onChange={(e) => setItemFormData({...itemFormData, category: e.target.value})}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Department *</label>
            <select
              value={itemFormData.department}
              onChange={(e) => setItemFormData({...itemFormData, department: e.target.value})}
            >
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Unit *</label>
            <select
              value={itemFormData.unit}
              onChange={(e) => setItemFormData({...itemFormData, unit: e.target.value})}
            >
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Current Stock</label>
            <input
              type="number"
              value={itemFormData.currentStock}
              onChange={(e) => setItemFormData({...itemFormData, currentStock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="form-group">
            <label>Minimum Stock *</label>
            <input
              type="number"
              value={itemFormData.minStock}
              onChange={(e) => setItemFormData({...itemFormData, minStock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="form-group">
            <label>Maximum Stock *</label>
            <input
              type="number"
              value={itemFormData.maxStock}
              onChange={(e) => setItemFormData({...itemFormData, maxStock: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="form-group">
            <label>Unit Price (₹) *</label>
            <input
              type="number"
              value={itemFormData.unitPrice}
              onChange={(e) => setItemFormData({...itemFormData, unitPrice: parseFloat(e.target.value) || 0})}
            />
          </div>
          <div className="form-group full-width">
            <label>Supplier</label>
            <input
              type="text"
              value={itemFormData.supplier}
              onChange={(e) => setItemFormData({...itemFormData, supplier: e.target.value})}
              placeholder="Supplier name"
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetItemForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleItemSubmit} className="btn-primary">
            <Save size={18} /> Save Item
          </button>
        </div>
      </Modal>

      {/* Transaction Modal */}
      <Modal
        isOpen={isTransactionModalOpen}
        onClose={resetTransactionForm}
        title="New Stock Transaction"
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Select Item *</label>
            <select
              value={transactionFormData.itemId}
              onChange={(e) => setTransactionFormData({...transactionFormData, itemId: parseInt(e.target.value)})}
            >
              <option value="">Select an item</option>
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} - Current: {item.currentStock} {item.unit}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Transaction Type *</label>
            <select
              value={transactionFormData.type}
              onChange={(e) => setTransactionFormData({...transactionFormData, type: e.target.value})}
            >
              <option value="Issue">Issue (Decrease Stock)</option>
              <option value="Receive">Receive (Increase Stock)</option>
              <option value="Adjust">Adjust (Set Stock)</option>
            </select>
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input
              type="number"
              value={transactionFormData.quantity}
              onChange={(e) => setTransactionFormData({...transactionFormData, quantity: parseFloat(e.target.value) || 0})}
            />
          </div>
          {transactionFormData.type === 'Issue' && (
            <div className="form-group full-width">
              <label>Issued To</label>
              <input
                type="text"
                value={transactionFormData.issuedTo}
                onChange={(e) => setTransactionFormData({...transactionFormData, issuedTo: e.target.value})}
                placeholder="e.g., Room Service, Bar Staff"
              />
            </div>
          )}
          {transactionFormData.type === 'Receive' && (
            <div className="form-group full-width">
              <label>Supplier</label>
              <input
                type="text"
                value={transactionFormData.supplier}
                onChange={(e) => setTransactionFormData({...transactionFormData, supplier: e.target.value})}
                placeholder="Supplier name"
              />
            </div>
          )}
          <div className="form-group full-width">
            <label>Notes</label>
            <textarea
              value={transactionFormData.notes}
              onChange={(e) => setTransactionFormData({...transactionFormData, notes: e.target.value})}
              rows="2"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetTransactionForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleTransactionSubmit} className="btn-primary">
            <Save size={18} /> Record Transaction
          </button>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Transaction History - ${selectedItem?.name}`}
        size="large"
      >
        {selectedItem && (
          <div>
            <div className="item-summary">
              <div>
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Department:</strong> {selectedItem.department}</p>
                <p><strong>Current Stock:</strong> {selectedItem.currentStock} {selectedItem.unit}</p>
              </div>
              <div>
                <p><strong>Min Stock:</strong> {selectedItem.minStock}</p>
                <p><strong>Max Stock:</strong> {selectedItem.maxStock}</p>
                <p><strong>Unit Price:</strong> ₹{selectedItem.unitPrice}</p>
              </div>
            </div>

            <h4 style={{ marginTop: '20px', marginBottom: '12px' }}>Transactions</h4>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Quantity</th>
                    <th>Details</th>
                    <th>Performed By</th>
                  </tr>
                </thead>
                <tbody>
                  {getTransactionsByItem(selectedItem.id).map(transaction => (
                    <tr key={transaction.id}>
                      <td>{transaction.date}</td>
                      <td>
                        <span className={`transaction-badge transaction-${transaction.type.toLowerCase()}`}>
                          {transaction.type}
                        </span>
                      </td>
                      <td>{transaction.quantity}</td>
                      <td>
                        {transaction.issuedTo && `Issued to: ${transaction.issuedTo}`}
                        {transaction.supplier && `From: ${transaction.supplier}`}
                        {transaction.notes && <br />}
                        <small style={{ color: '#6b7280' }}>{transaction.notes}</small>
                      </td>
                      <td>{transaction.performedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Inventory;