// src/pages/Discounts.jsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Power, Eye, Tag, Calendar, Percent, DollarSign } from 'lucide-react';
import { useDiscounts } from '../context/DiscountContext';
import { useRooms } from '../context/RoomContext';
import { useConfirm, useAlert } from '../context/AlertContext';
import { formatDiscount, getDiscountBadgeColor } from '../utils/discountCalculations';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from '@/lib/utils';

const Discounts = () => {
  const {
    discounts,
    loading,
    addDiscount,
    updateDiscount,
    deleteDiscount,
    toggleDiscountStatus,
    getDiscountStats
  } = useDiscounts();

  const { roomTypes } = useRooms();
  const confirmDialog = useConfirm();
  const { error: showError } = useAlert();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    value: '0',
    applies_to: 'room_rates',
    enabled: true,
    valid_from: '',
    valid_to: '',
    applicable_room_types: [],
    promo_code: '',
    minimum_nights: '0',
    maximum_uses: '',
    priority: '0',
    can_combine: false
  });

  const stats = getDiscountStats();

  const handleOpenModal = (discount = null) => {
    if (discount) {
      setEditingDiscount(discount);
      setFormData({
        name: discount.name || '',
        description: discount.description || '',
        discount_type: discount.discount_type || 'percentage',
        value: discount.value?.toString() || '0',
        applies_to: discount.applies_to || 'room_rates',
        enabled: discount.enabled !== undefined ? discount.enabled : true,
        valid_from: discount.valid_from || '',
        valid_to: discount.valid_to || '',
        applicable_room_types: discount.applicable_room_types || [],
        promo_code: discount.promo_code || '',
        minimum_nights: discount.minimum_nights?.toString() || '0',
        maximum_uses: discount.maximum_uses?.toString() || '',
        priority: discount.priority?.toString() || '0',
        can_combine: discount.can_combine || false
      });
    } else {
      setEditingDiscount(null);
      setFormData({
        name: '',
        description: '',
        discount_type: 'percentage',
        value: '0',
        applies_to: 'room_rates',
        enabled: true,
        valid_from: '',
        valid_to: '',
        applicable_room_types: [],
        promo_code: '',
        minimum_nights: '0',
        maximum_uses: '',
        priority: '0',
        can_combine: false
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDiscount(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRoomTypeToggle = (roomTypeId) => {
    setFormData(prev => {
      const currentTypes = prev.applicable_room_types || [];
      const newTypes = currentTypes.includes(roomTypeId)
        ? currentTypes.filter(id => id !== roomTypeId)
        : [...currentTypes, roomTypeId];
      return { ...prev, applicable_room_types: newTypes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      showError('Please enter a discount name');
      return;
    }

    if (parseFloat(formData.value) <= 0) {
      showError('Discount value must be greater than 0');
      return;
    }

    if (formData.discount_type === 'percentage' && parseFloat(formData.value) > 100) {
      showError('Percentage discount cannot exceed 100%');
      return;
    }

    if (formData.discount_type === 'promo_code' && !formData.promo_code.trim()) {
      showError('Please enter a promo code');
      return;
    }

    try {
      if (editingDiscount) {
        const result = await updateDiscount(editingDiscount.id, formData);
        if (result) {
          handleCloseModal();
        }
      } else {
        const result = await addDiscount(formData);
        if (result) {
          handleCloseModal();
        }
      }
    } catch (error) {
      console.error('Error saving discount:', error);
    }
  };

  const handleDelete = async (discount) => {
    const confirmed = await confirmDialog({
      title: 'Delete Discount',
      message: `Are you sure you want to delete "${discount.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'destructive'
    });

    if (confirmed) {
      await deleteDiscount(discount.id);
    }
  };

  const handleToggleStatus = async (discount) => {
    await toggleDiscountStatus(discount.id, !discount.enabled);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getDiscountTypeLabel = (type) => {
    const labels = {
      percentage: 'Percentage',
      fixed_amount: 'Fixed Amount',
      promo_code: 'Promo Code',
      seasonal: 'Seasonal',
      long_stay: 'Long Stay'
    };
    return labels[type] || type;
  };

  const getAppliesToLabel = (appliesTo) => {
    const labels = {
      room_rates: 'Room Rates',
      addons: 'Add-ons',
      total_bill: 'Total Bill'
    };
    return labels[appliesTo] || appliesTo;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">Loading discounts...</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discounts</h1>
          <p className="mt-1 text-muted-foreground">
            Manage discount codes, promotions, and special offers
          </p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Discount
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Discounts</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Power className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive</CardTitle>
            <Power className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inactive}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Used</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Discounts</CardTitle>
          <CardDescription>
            View and manage all discount configurations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {discounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Tag className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">No discounts yet</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Create your first discount to start offering promotions to guests
              </p>
              <Button onClick={() => handleOpenModal()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Discount
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Applies To</TableHead>
                    <TableHead>Valid Period</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {discounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{discount.name}</div>
                          {discount.promo_code && (
                            <Badge variant="outline" className="mt-1">
                              {discount.promo_code}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getDiscountBadgeColor(discount.discount_type)}>
                          {getDiscountTypeLabel(discount.discount_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatDiscount(discount)}
                      </TableCell>
                      <TableCell>
                        {getAppliesToLabel(discount.applies_to)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{formatDate(discount.valid_from)}</div>
                          <div className="text-muted-foreground">
                            to {formatDate(discount.valid_to)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {discount.current_uses || 0}
                          {discount.maximum_uses && ` / ${discount.maximum_uses}`}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={discount.enabled ? 'default' : 'secondary'}>
                          {discount.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(discount)}
                            title={discount.enabled ? 'Disable' : 'Enable'}
                          >
                            <Power className={cn(
                              "h-4 w-4",
                              discount.enabled ? "text-green-600" : "text-muted-foreground"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(discount)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(discount)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Discount Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingDiscount ? 'Edit Discount' : 'Add New Discount'}
            </DialogTitle>
            <DialogDescription>
              {editingDiscount
                ? 'Update discount details and configuration'
                : 'Create a new discount for your hotel bookings'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Discount Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Early Bird Special"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the discount"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value) => handleInputChange('discount_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                      <SelectItem value="promo_code">Promo Code</SelectItem>
                      <SelectItem value="seasonal">Seasonal</SelectItem>
                      <SelectItem value="long_stay">Long Stay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value">
                    Value * {formData.discount_type === 'percentage' ? '(%)' : '(₹)'}
                  </Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    min="0"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    value={formData.value}
                    onChange={(e) => handleInputChange('value', e.target.value)}
                    required
                  />
                </div>
              </div>

              {formData.discount_type === 'promo_code' && (
                <div>
                  <Label htmlFor="promo_code">Promo Code *</Label>
                  <Input
                    id="promo_code"
                    value={formData.promo_code}
                    onChange={(e) => handleInputChange('promo_code', e.target.value.toUpperCase())}
                    placeholder="e.g., SAVE20"
                    required={formData.discount_type === 'promo_code'}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="applies_to">Applies To</Label>
                <Select
                  value={formData.applies_to}
                  onValueChange={(value) => handleInputChange('applies_to', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room_rates">Room Rates</SelectItem>
                    <SelectItem value="addons">Add-ons</SelectItem>
                    <SelectItem value="total_bill">Total Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Validity Period */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Validity Period</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="valid_from">Valid From</Label>
                  <Input
                    id="valid_from"
                    type="date"
                    value={formData.valid_from}
                    onChange={(e) => handleInputChange('valid_from', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="valid_to">Valid To</Label>
                  <Input
                    id="valid_to"
                    type="date"
                    value={formData.valid_to}
                    onChange={(e) => handleInputChange('valid_to', e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Restrictions */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium">Restrictions</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minimum_nights">Minimum Nights</Label>
                  <Input
                    id="minimum_nights"
                    type="number"
                    min="0"
                    value={formData.minimum_nights}
                    onChange={(e) => handleInputChange('minimum_nights', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="maximum_uses">Maximum Uses</Label>
                  <Input
                    id="maximum_uses"
                    type="number"
                    min="0"
                    value={formData.maximum_uses}
                    onChange={(e) => handleInputChange('maximum_uses', e.target.value)}
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="priority">Priority (Higher = Applied First)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  value={formData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                />
              </div>

              {/* Room Types */}
              {roomTypes.length > 0 && (
                <div>
                  <Label>Applicable Room Types (Leave empty for all)</Label>
                  <div className="mt-2 space-y-2 rounded-md border p-3">
                    {roomTypes.map((roomType) => (
                      <div key={roomType.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`room-type-${roomType.id}`}
                          checked={formData.applicable_room_types.includes(roomType.id)}
                          onCheckedChange={() => handleRoomTypeToggle(roomType.id)}
                        />
                        <label
                          htmlFor={`room-type-${roomType.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {roomType.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="can_combine"
                  checked={formData.can_combine}
                  onCheckedChange={(checked) => handleInputChange('can_combine', checked)}
                />
                <label
                  htmlFor="can_combine"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Can be combined with other discounts
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enabled"
                  checked={formData.enabled}
                  onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                />
                <label
                  htmlFor="enabled"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable discount immediately
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDiscount ? 'Update Discount' : 'Create Discount'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Discounts;
