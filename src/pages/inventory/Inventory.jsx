// src/pages/inventory/Inventory.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, AlertTriangle, Package, TrendingDown, TrendingUp, RefreshCw } from 'lucide-react';
import { useInventory } from '../../context/InventoryContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '@/context/AlertContext';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const confirm = useConfirm();

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
    current_stock: 0,
    min_stock: 0,
    max_stock: 0,
    unit_price: 0,
    supplier: '',
  });

  const [transactionFormData, setTransactionFormData] = useState({
    item_id: '',
    type: 'Issue',
    quantity: 0,
    issued_to: '',
    supplier: '',
    notes: ''
  });

  // Filter items
  const filteredItems = items
    .filter(item => filterDepartment === 'all' || item.department === filterDepartment)
    .filter(item => filterCategory === 'all' || item.category === filterCategory)
    .filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .filter(item => !showLowStockOnly || item.current_stock < item.min_stock);

  const lowStockItems = getLowStockItems();

  const handleItemSubmit = async () => {
    if (editingItem) {
      await updateItem(editingItem.id, itemFormData);
    } else {
      await addItem(itemFormData);
    }
    resetItemForm();
  };

  const resetItemForm = () => {
    setItemFormData({
      name: '',
      category: 'Other',
      department: 'Housekeeping',
      unit: 'Pieces',
      current_stock: 0,
      min_stock: 0,
      max_stock: 0,
      unit_price: 0,
      supplier: '',
    });
    setEditingItem(null);
    setIsItemModalOpen(false);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name,
      category: item.category,
      department: item.department,
      unit: item.unit,
      current_stock: item.current_stock,
      min_stock: item.min_stock,
      max_stock: item.max_stock,
      unit_price: item.unit_price,
      supplier: item.supplier || '',
    });
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = async (itemId) => {
    const confirmed = await confirm({
      title: 'Delete Item',
      message: 'Are you sure you want to delete this item? This will also delete its transaction history.',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteItem(itemId);
    }
  };

  const handleTransactionSubmit = async () => {
    if (transactionFormData.item_id && transactionFormData.quantity > 0) {
      await addTransaction(transactionFormData, user.id);
      resetTransactionForm();
    } else {
      alert('Please select an item and enter a valid quantity');
    }
  };

  const resetTransactionForm = () => {
    setTransactionFormData({
      item_id: '',
      type: 'Issue',
      quantity: 0,
      issued_to: '',
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
    const percentage = (item.current_stock / item.max_stock) * 100;
    if (item.current_stock < item.min_stock) return 'critical';
    if (percentage < 50) return 'low';
    if (percentage < 80) return 'medium';
    return 'good';
  };

  const getStockStatusVariant = (status) => {
    switch(status) {
      case 'critical': return 'destructive';
      case 'low': return 'warning';
      case 'medium': return 'default';
      case 'good': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsTransactionModalOpen(true)} variant="secondary">
            <RefreshCw size={18} className="mr-2" /> New Transaction
          </Button>
          <Button onClick={() => setIsItemModalOpen(true)}>
            <Plus size={20} className="mr-2" /> Add Item
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{getTotalInventoryValue().toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Transactions</CardTitle>
            <RefreshCw className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <Alert variant="destructive" className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-3" />
            <div>
              <AlertTitle>Low Stock Alert</AlertTitle>
              <AlertDescription>
                {lowStockItems.length} items are below minimum stock level.
              </AlertDescription>
            </div>
          </div>
          <Button onClick={() => setShowLowStockOnly(true)} variant="destructive" size="sm">
            View Items
          </Button>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-1/3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search items or suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-4">
          <Select value={filterDepartment} onValueChange={setFilterDepartment}>
            <SelectTrigger className="w-full md:w-[180px] bg-white">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-full md:w-[180px] bg-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showLowStockOnly && (
          <Button onClick={() => setShowLowStockOnly(false)} variant="secondary">
            Show All Items
          </Button>
        )}
      </div>

      {/* Items Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Min / Max</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Stock Value</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.map(item => {
                const status = getStockStatus(item);
                const stockValue = item.current_stock * item.unit_price;
                
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">{item.supplier || 'N/A'}</div>
                    </TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.department}</TableCell>
                    <TableCell>
                      <span className="font-bold text-lg">{item.current_stock}</span>
                      <span className="text-sm text-muted-foreground ml-1">{item.unit}</span>
                    </TableCell>
                    <TableCell>{item.min_stock} / {item.max_stock}</TableCell>
                    <TableCell>₹{item.unit_price}</TableCell>
                    <TableCell>₹{stockValue.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={getStockStatusVariant(status)} className="capitalize">{status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          onClick={() => viewHistory(item)}
                          variant="ghost" size="icon" title="View History"
                        >
                          <RefreshCw size={16} className="text-muted-foreground" />
                        </Button>
                        <Button onClick={() => handleEditItem(item)} variant="ghost" size="icon" title="Edit">
                          <Edit2 size={16} className="text-blue-600" />
                        </Button>
                        <Button onClick={() => handleDeleteItem(item.id)} variant="ghost" size="icon" title="Delete">
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Department-wise Inventory Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {departments.map(dept => {
              const deptItems = getItemsByDepartment(dept);
              const deptValue = getDepartmentValue(dept);
              
              if (deptItems.length === 0) return null;
              
              return (
                <div key={dept} className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
                  <div>
                    <h4 className="font-semibold">{dept}</h4>
                    <p className="text-sm text-muted-foreground">{deptItems.length} items</p>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    ₹{deptValue.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map(transaction => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <div className="font-medium">{transaction.inventory_items?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{new Date(transaction.created_at).toLocaleDateString()}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          transaction.type === 'Issue' ? 'destructive' :
                          transaction.type === 'Receive' ? 'success' : 'secondary'
                        }
                        className="gap-1"
                      >
                        {transaction.type === 'Issue' && <TrendingDown size={14} />}
                        {transaction.type === 'Receive' && <TrendingUp size={14} />}
                        {transaction.type === 'Adjust' && <RefreshCw size={14} />}
                        {transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-bold">{transaction.quantity}</TableCell>
                    <TableCell>{transaction.users?.name || 'Unknown'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Item Modal */}
      <Dialog open={isItemModalOpen} onOpenChange={setIsItemModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                type="text"
                value={itemFormData.name}
                onChange={(e) => setItemFormData({...itemFormData, name: e.target.value})}
                placeholder="e.g., Bed Sheets"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category *</Label>
              <Select value={itemFormData.category} onValueChange={(value) => setItemFormData({...itemFormData, category: value})}>
                <SelectTrigger id="itemCategory">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemDepartment">Department *</Label>
              <Select value={itemFormData.department} onValueChange={(value) => setItemFormData({...itemFormData, department: value})}>
                <SelectTrigger id="itemDepartment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemUnit">Unit *</Label>
              <Select value={itemFormData.unit} onValueChange={(value) => setItemFormData({...itemFormData, unit: value})}>
                <SelectTrigger id="itemUnit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {units.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCurrentStock">Current Stock</Label>
              <Input
                id="itemCurrentStock"
                type="number"
                value={itemFormData.current_stock}
                onChange={(e) => setItemFormData({...itemFormData, current_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemMinStock">Minimum Stock *</Label>
              <Input
                id="itemMinStock"
                type="number"
                value={itemFormData.min_stock}
                onChange={(e) => setItemFormData({...itemFormData, min_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemMaxStock">Maximum Stock *</Label>
              <Input
                id="itemMaxStock"
                type="number"
                value={itemFormData.max_stock}
                onChange={(e) => setItemFormData({...itemFormData, max_stock: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemUnitPrice">Unit Price (₹) *</Label>
              <Input
                id="itemUnitPrice"
                type="number"
                value={itemFormData.unit_price}
                onChange={(e) => setItemFormData({...itemFormData, unit_price: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemSupplier">Supplier</Label>
              <Input
                id="itemSupplier"
                type="text"
                value={itemFormData.supplier}
                onChange={(e) => setItemFormData({...itemFormData, supplier: e.target.value})}
                placeholder="Supplier name"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetItemForm}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleItemSubmit}>
              <Save size={18} className="mr-2" /> Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Stock Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transItem">Select Item *</Label>
              <Select value={transactionFormData.item_id} onValueChange={(value) => setTransactionFormData({...transactionFormData, item_id: value})}>
                <SelectTrigger id="transItem">
                  <SelectValue placeholder="Select an item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Select an item</SelectItem>
                  {items.map(item => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} - Current: {item.current_stock} {item.unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transType">Transaction Type *</Label>
                <Select value={transactionFormData.type} onValueChange={(value) => setTransactionFormData({...transactionFormData, type: value})}>
                  <SelectTrigger id="transType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Issue">Issue (Decrease Stock)</SelectItem>
                    <SelectItem value="Receive">Receive (Increase Stock)</SelectItem>
                    <SelectItem value="Adjust">Adjust (Set Stock)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transQuantity">Quantity *</Label>
                <Input
                  id="transQuantity"
                  type="number"
                  value={transactionFormData.quantity}
                  onChange={(e) => setTransactionFormData({...transactionFormData, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
            {transactionFormData.type === 'Issue' && (
              <div className="space-y-2">
                <Label htmlFor="transIssuedTo">Issued To</Label>
                <Input
                  id="transIssuedTo"
                  type="text"
                  value={transactionFormData.issued_to}
                  onChange={(e) => setTransactionFormData({...transactionFormData, issued_to: e.target.value})}
                  placeholder="e.g., Room Service, Bar Staff"
                />
              </div>
            )}
            {transactionFormData.type === 'Receive' && (
              <div className="space-y-2">
                <Label htmlFor="transSupplier">Supplier</Label>
                <Input
                  id="transSupplier"
                  type="text"
                  value={transactionFormData.supplier}
                  onChange={(e) => setTransactionFormData({...transactionFormData, supplier: e.target.value})}
                  placeholder="Supplier name"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="transNotes">Notes</Label>
              <Textarea
                id="transNotes"
                value={transactionFormData.notes}
                onChange={(e) => setTransactionFormData({...transactionFormData, notes: e.target.value})}
                rows="2"
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetTransactionForm}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleTransactionSubmit}>
              <Save size={18} className="mr-2" /> Record Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Transaction History - {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="py-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <p><strong>Category:</strong> {selectedItem.category}</p>
                <p><strong>Department:</strong> {selectedItem.department}</p>
                <p><strong>Current Stock:</strong> {selectedItem.current_stock} {selectedItem.unit}</p>
                <p><strong>Min Stock:</strong> {selectedItem.min_stock}</p>
                <p><strong>Max Stock:</strong> {selectedItem.max_stock}</p>
                <p><strong>Unit Price:</strong> ₹{selectedItem.unit_price}</p>
              </div>

              <h4 className="font-semibold mb-2">Transactions</h4>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Performed By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getTransactionsByItem(selectedItem.id).map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              transaction.type === 'Issue' ? 'destructive' :
                              transaction.type === 'Receive' ? 'success' : 'secondary'
                            }
                          >
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.quantity}</TableCell>
                        <TableCell>
                          {transaction.issued_to && `Issued to: ${transaction.issued_to}`}
                          {transaction.supplier && `From: ${transaction.supplier}`}
                          {transaction.notes && <div className="text-xs text-muted-foreground italic mt-1">{transaction.notes}</div>}
                        </TableCell>
                        <TableCell>{transaction.users?.name || 'Unknown'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Inventory;