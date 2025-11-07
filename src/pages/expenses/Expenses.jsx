// src/pages/expenses/Expenses.jsx
import { useState, useEffect, useRef } from 'react';
import { Download, Edit2, X, Check, Plus, Trash2, FileText, FilePlus, Sheet } from 'lucide-react';
import { useExpense } from '../../context/ExpensesContext';
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
  const saveTimeoutRef = useRef(null);

  const fixedColumns = [
    { id: 'date', name: 'Date', type: 'date', fixed: true, group: 'start' },
    { id: 'refNo', name: 'Ref No.', type: 'text', fixed: true, group: 'start' },
    { id: 'totalAmount', name: 'Total Amount', type: 'number', fixed: true, group: 'end' },
    { id: 'remarks', name: 'Remarks', type: 'text', fixed: true, group: 'end' }
  ];

  const [customColumns, setCustomColumns] = useState([]);
  const [rows, setRows] = useState([
    {
      id: `temp_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      refNo: '',
      totalAmount: 0,
      remarks: '',
      customData: {}
    }
  ]);

  const allColumns = [
    ...fixedColumns.filter(col => col.group === 'start'),
    ...customColumns,
    ...fixedColumns.filter(col => col.group === 'end')
  ];

  const getMonthYear = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthHeader = (monthYear) => {
    if (!monthYear) return '';
    const [year, month] = monthYear.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

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

  useEffect(() => {
    if (selectedCategory) {
      loadCategorySheets();
    } else {
      setSheets([]);
      setSelectedSheet(null);
    }
  }, [selectedCategory, categories]); // Added categories dependency

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
            id: `temp_${Date.now()}`,
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
      id: `temp_${Date.now()}`,
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
    
    if (selectedSheet) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        saveSheetData(selectedSheet.id, customColumns, updatedRows);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading expenses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Category Pills */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-3xl font-bold">Expenses</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => (
              <div key={cat.id} className="relative group">
                <Button
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setSelectedSheet(null);
                    setSheetName('');
                  }}
                  variant={selectedCategory === cat.name ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full"
                >
                  <FileText size={16} className="mr-2" />
                  {cat.name}
                </Button>
                <Button
                  onClick={() => handleDeleteCategory(cat.name)}
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full hidden group-hover:flex"
                  title="Delete category"
                >
                  <X size={12} />
                </Button>
              </div>
            ))}
            <Button
              onClick={() => setIsCategoryModalOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-full border-dashed"
              title="Add new category"
            >
              <Plus size={16} className="mr-2" /> Add Category
            </Button>
          </div>
        </div>

        {selectedCategory && selectedSheet && (
          <Button onClick={exportToCSV}>
            <Download size={18} className="mr-2" /> Export CSV
          </Button>
        )}
      </div>

      {/* Sheet Tabs */}
      {selectedCategory && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-muted-foreground mr-2">Sheets:</span>
              {sheets.map(sheet => (
                <Button
                  key={sheet.id}
                  onClick={() => setSelectedSheet(sheet)}
                  variant={selectedSheet?.id === sheet.id ? 'secondary' : 'ghost'}
                  size="sm"
                >
                  <Sheet size={16} className="mr-2" />
                  {sheet.name}
                </Button>
              ))}
              <Button
                onClick={() => setIsSheetModalOpen(true)}
                variant="outline"
                size="sm"
                className="border-dashed"
                title="Add new sheet"
              >
                <Plus size={16} className="mr-2" /> Add Sheet
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spreadsheet */}
      {selectedCategory && selectedSheet && (
        <Card>
          {/* Sheet Name Header */}
          <CardHeader>
            <div className="flex items-center gap-3">
              {isEditingName ? (
                <>
                  <Input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    className="h-9 text-lg font-semibold"
                    autoFocus
                  />
                  <Button onClick={saveName} size="icon" variant="ghost" className="text-green-600">
                    <Check size={16} />
                  </Button>
                  <Button onClick={cancelEditName} size="icon" variant="ghost" className="text-red-600">
                    <X size={16} />
                  </Button>
                </>
              ) : (
                <>
                  <CardTitle className="text-xl">{sheetName}</CardTitle>
                  <Button onClick={startEditingName} variant="ghost" size="icon" title="Edit name">
                    <Edit2 size={16} />
                  </Button>
                </>
              )}
            </div>
          </CardHeader>

          {/* Spreadsheet Table */}
          <CardContent className="overflow-x-auto">
            <Table className="relative border-collapse border border-border">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-gray-100 w-12 min-w-12 border-r border-b"></TableHead>
                  {allColumns.map((col, colIndex) => (
                    <TableHead 
                      key={col.id}
                      onMouseEnter={() => setHoveredColumn(colIndex)}
                      onMouseLeave={() => setHoveredColumn(null)}
                      className="min-w-[120px] border-b relative group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span>{col.name}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex">
                          {!col.fixed && (
                            <Button
                              onClick={() => removeColumn(col.id)}
                              variant="ghost" size="icon"
                              className="h-6 w-6 text-red-600"
                              title="Delete column"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                          <Button
                            onClick={() => addColumnAfter(colIndex)}
                            variant="ghost" size="icon"
                            className="h-6 w-6"
                            title="Add column after"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {getGroupedRows().map((item, idx) => {
                  if (item.type === 'header') {
                    return (
                      <TableRow key={`header-${item.monthYear}-${idx}`}>
                        <TableCell colSpan={allColumns.length + 1} className="p-2 bg-blue-600 text-white font-semibold sticky left-0 z-10">
                          {item.displayText}
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    const row = item.data;
                    const rowIndex = item.originalIndex;
                    return (
                      <TableRow key={row.id}>
                        <TableCell 
                          onMouseEnter={() => setHoveredRow(rowIndex)}
                          onMouseLeave={() => setHoveredRow(null)}
                          className="sticky left-0 z-10 bg-gray-100 p-0 w-12 min-w-12 border-r group"
                        >
                          <div className="flex flex-col items-center justify-center h-full text-xs text-muted-foreground font-mono relative py-2">
                            <span>{rowIndex + 1}</span>
                            <div className="absolute top-0 right-0 flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                onClick={() => addRowAfter(rowIndex)}
                                variant="ghost" size="icon"
                                className="h-5 w-5"
                                title="Add row after"
                              >
                                <Plus size={10} />
                              </Button>
                              {rows.length > 1 && (
                                <Button
                                  onClick={() => removeRow(row.id)}
                                  variant="ghost" size="icon"
                                  className="h-5 w-5 text-red-600"
                                  title="Delete row"
                                >
                                  <Trash2 size={10} />
                                </Button>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        {allColumns.map(col => (
                          <TableCell key={col.id} className="p-0 border-l">
                            <Input
                              type={col.type}
                              value={getCellValue(row, col.id)}
                              onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                              className="w-full h-full border-none rounded-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  }
                })}
              </TableBody>
            </Table>
          </CardContent>

          {/* Total Row */}
          <CardContent>
            <div className="flex justify-end items-center mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
              <span className="text-lg font-semibold text-yellow-800">Total:</span>
              <span className="text-xl font-bold text-yellow-900 ml-4">
                ₹{calculateTotal().toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Category Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="catName">Category Name</Label>
            <Input
              id="catName"
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Office Expenses, Travel"
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setNewCategoryName('')}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleAddCategory}>
              <Plus size={18} className="mr-2" /> Add Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Sheet Modal */}
      <Dialog open={isSheetModalOpen} onOpenChange={setIsSheetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Sheet to {selectedCategory}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="sheetName">Sheet Name</Label>
            <Input
              id="sheetName"
              type="text"
              value={newSheetName}
              onChange={(e) => setNewSheetName(e.target.value)}
              placeholder="e.g., January 2025, Q1 Expenses"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSheet()}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => setNewSheetName('')}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleAddSheet}>
              <Plus size={18} className="mr-2" /> Add Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Expenses;