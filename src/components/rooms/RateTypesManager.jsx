// src/components/rooms/RateTypesManager.jsx
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Star, Check, Package, Gift, Zap } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  getAllRatePlanAddons,
  createRatePlanAddon,
  updateRatePlanAddon,
  deleteRatePlanAddon
} from '../../lib/supabase';

const RateTypesManager = ({ roomType }) => {
  const {
    getRateTypesByRoomType,
    addRateType,
    updateRateType,
    deleteRateType,
    setDefaultRate
  } = useRooms();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRateType, setEditingRateType] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [formData, setFormData] = useState({
    rate_name: '',
    rate_code: '',
    base_price: '',
    description: '',
    inclusions: '',
    min_nights: '1',
    max_nights: '',
    cancellation_policy: '',
    advance_booking_days: '0',
    is_active: true,
    is_default: false,
    valid_from: '',
    valid_to: '',
    // Extra person fee fields
    base_occupancy: '2',
    extra_adult_fee: '0',
    extra_child_fee: '0',
    extra_fee_unit: 'per_night'
  });

  // Add-ons state
  const [addons, setAddons] = useState([]);
  const [loadingAddons, setLoadingAddons] = useState(false);
  const [addonFormData, setAddonFormData] = useState({
    name: '',
    description: '',
    price: '',
    charge_type: 'informational',
    unit: 'per_stay',
    is_taxable: true,
    is_active: true
  });
  const [editingAddon, setEditingAddon] = useState(null);
  const [showAddonForm, setShowAddonForm] = useState(false);

  const rateTypes = getRateTypesByRoomType(roomType.id);

  // Load add-ons when editing a rate type
  useEffect(() => {
    if (editingRateType?.id && isModalOpen) {
      loadAddons(editingRateType.id);
    } else {
      setAddons([]);
    }
  }, [editingRateType?.id, isModalOpen]);

  const loadAddons = async (rateTypeId) => {
    setLoadingAddons(true);
    try {
      const { data, error } = await getAllRatePlanAddons(rateTypeId);
      if (error) {
        console.error('Error loading add-ons:', error);
      } else {
        setAddons(data || []);
      }
    } catch (err) {
      console.error('Error loading add-ons:', err);
    } finally {
      setLoadingAddons(false);
    }
  };

  const handleSubmit = async () => {
    const rateTypeData = {
      room_type_id: roomType.id,
      rate_name: formData.rate_name,
      rate_code: formData.rate_code.toUpperCase(),
      base_price: formData.base_price,
      description: formData.description,
      inclusions: formData.inclusions,
      min_nights: formData.min_nights,
      max_nights: formData.max_nights || null,
      cancellation_policy: formData.cancellation_policy,
      advance_booking_days: formData.advance_booking_days,
      is_active: formData.is_active,
      is_default: formData.is_default,
      valid_from: formData.valid_from || null,
      valid_to: formData.valid_to || null,
      // Extra person fee fields
      base_occupancy: parseInt(formData.base_occupancy) || 2,
      extra_adult_fee: parseFloat(formData.extra_adult_fee) || 0,
      extra_child_fee: parseFloat(formData.extra_child_fee) || 0,
      extra_fee_unit: formData.extra_fee_unit
    };

    let success = false;
    if (editingRateType) {
      success = await updateRateType(editingRateType.id, rateTypeData);
    } else {
      const result = await addRateType(rateTypeData);
      success = !!result;
    }

    if (success) {
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      rate_name: '',
      rate_code: '',
      base_price: '',
      description: '',
      inclusions: '',
      min_nights: '1',
      max_nights: '',
      cancellation_policy: '',
      advance_booking_days: '0',
      is_active: true,
      is_default: false,
      valid_from: '',
      valid_to: '',
      // Extra person fee fields
      base_occupancy: '2',
      extra_adult_fee: '0',
      extra_child_fee: '0',
      extra_fee_unit: 'per_night'
    });
    setEditingRateType(null);
    setIsModalOpen(false);
    setActiveTab('details');
    setAddons([]);
    resetAddonForm();
  };

  // Add-on form functions
  const resetAddonForm = () => {
    setAddonFormData({
      name: '',
      description: '',
      price: '',
      charge_type: 'informational',
      unit: 'per_stay',
      is_taxable: true,
      is_active: true
    });
    setEditingAddon(null);
    setShowAddonForm(false);
  };

  const handleAddonSubmit = async () => {
    if (!editingRateType?.id) return;

    const addonData = {
      rate_type_id: editingRateType.id,
      name: addonFormData.name,
      description: addonFormData.description || null,
      price: parseFloat(addonFormData.price) || 0,
      charge_type: addonFormData.charge_type,
      unit: addonFormData.unit,
      is_taxable: addonFormData.is_taxable,
      is_active: addonFormData.is_active,
      sort_order: addons.length
    };

    try {
      if (editingAddon) {
        const { error } = await updateRatePlanAddon(editingAddon.id, addonData);
        if (error) {
          console.error('Error updating add-on:', error);
          return;
        }
      } else {
        const { error } = await createRatePlanAddon(addonData);
        if (error) {
          console.error('Error creating add-on:', error);
          return;
        }
      }
      await loadAddons(editingRateType.id);
      resetAddonForm();
    } catch (err) {
      console.error('Error saving add-on:', err);
    }
  };

  const handleEditAddon = (addon) => {
    setEditingAddon(addon);
    setAddonFormData({
      name: addon.name,
      description: addon.description || '',
      price: addon.price?.toString() || '',
      charge_type: addon.charge_type,
      unit: addon.unit,
      is_taxable: addon.is_taxable,
      is_active: addon.is_active
    });
    setShowAddonForm(true);
  };

  const handleDeleteAddon = async (addonId) => {
    if (!confirm('Are you sure you want to delete this add-on?')) return;

    try {
      const { error } = await deleteRatePlanAddon(addonId);
      if (error) {
        console.error('Error deleting add-on:', error);
        return;
      }
      await loadAddons(editingRateType.id);
    } catch (err) {
      console.error('Error deleting add-on:', err);
    }
  };

  const toggleAddonActive = async (addon) => {
    try {
      const { error } = await updateRatePlanAddon(addon.id, { is_active: !addon.is_active });
      if (error) {
        console.error('Error toggling add-on:', error);
        return;
      }
      await loadAddons(editingRateType.id);
    } catch (err) {
      console.error('Error toggling add-on:', err);
    }
  };

  const handleEdit = (rateType) => {
    setEditingRateType(rateType);
    setFormData({
      rate_name: rateType.rate_name,
      rate_code: rateType.rate_code,
      base_price: rateType.base_price,
      description: rateType.description || '',
      inclusions: rateType.inclusions || '',
      min_nights: rateType.min_nights || '1',
      max_nights: rateType.max_nights || '',
      cancellation_policy: rateType.cancellation_policy || '',
      advance_booking_days: rateType.advance_booking_days || '0',
      is_active: rateType.is_active,
      is_default: rateType.is_default,
      valid_from: rateType.valid_from || '',
      valid_to: rateType.valid_to || '',
      // Extra person fee fields
      base_occupancy: rateType.base_occupancy?.toString() || '2',
      extra_adult_fee: rateType.extra_adult_fee?.toString() || '0',
      extra_child_fee: rateType.extra_child_fee?.toString() || '0',
      extra_fee_unit: rateType.extra_fee_unit || 'per_night'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (rateTypeId) => {
    if (confirm('Are you sure you want to delete this rate type?')) {
      await deleteRateType(rateTypeId);
    }
  };

  const handleSetDefault = async (rateTypeId) => {
    await setDefaultRate(roomType.id, rateTypeId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Rate Types for {roomType.name}</h3>
        <Button size="sm" onClick={() => { setEditingRateType(null); setIsModalOpen(true); }}>
          <Plus size={16} className="mr-2" /> Add Rate Type
        </Button>
      </div>

      {rateTypes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No rate types defined. Add your first rate type to get started.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rate Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Min Nights</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateTypes.map(rateType => (
                  <TableRow key={rateType.id}>
                    <TableCell className="font-medium py-2">
                      <div className="flex items-center gap-2">
                        {rateType.rate_name}
                        {rateType.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Star size={12} className="mr-1" /> Default
                          </Badge>
                        )}
                      </div>
                      {rateType.description && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {rateType.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <Badge variant="outline">{rateType.rate_code}</Badge>
                    </TableCell>
                    <TableCell className="py-2">₹{rateType.base_price}</TableCell>
                    <TableCell className="py-2">{rateType.min_nights}</TableCell>
                    <TableCell className="py-2">
                      {rateType.is_active ? (
                        <Badge variant="success" className="text-xs bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300">Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        {!rateType.is_default && rateType.is_active && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => handleSetDefault(rateType.id)}
                            title="Set as default"
                          >
                            <Star size={14} className="text-yellow-600 dark:text-yellow-500" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(rateType)}
                        >
                          <Edit2 size={14} className="text-blue-600 dark:text-blue-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => handleDelete(rateType.id)}
                          disabled={rateType.is_default}
                          title={rateType.is_default ? "Cannot delete default rate type" : "Delete rate type"}
                        >
                          <Trash2 size={14} className={rateType.is_default ? "text-muted-foreground" : "text-red-600 dark:text-red-400"} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRateType ? 'Edit Rate Type' : 'Add Rate Type'}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Rate Details</TabsTrigger>
              <TabsTrigger value="addons" disabled={!editingRateType}>
                <Package className="h-4 w-4 mr-2" />
                Add-ons {addons.length > 0 && `(${addons.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
          <div className="grid grid-cols-2 gap-4 py-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="rate_name">Rate Name *</Label>
              <Input
                id="rate_name"
                value={formData.rate_name}
                onChange={(e) => setFormData({...formData, rate_name: e.target.value})}
                placeholder="e.g., Standard Rate, Non-Refundable"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate_code">Rate Code *</Label>
              <Input
                id="rate_code"
                value={formData.rate_code}
                onChange={(e) => setFormData({...formData, rate_code: e.target.value.toUpperCase()})}
                placeholder="e.g., STD, NRF, CORP"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (₹) *</Label>
              <Input
                id="base_price"
                type="number"
                step="0.01"
                value={formData.base_price}
                onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="min_nights">Minimum Nights *</Label>
              <Input
                id="min_nights"
                type="number"
                min="1"
                value={formData.min_nights}
                onChange={(e) => setFormData({...formData, min_nights: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_nights">Maximum Nights</Label>
              <Input
                id="max_nights"
                type="number"
                min="1"
                value={formData.max_nights}
                onChange={(e) => setFormData({...formData, max_nights: e.target.value})}
                placeholder="Leave empty for no limit"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="advance_booking_days">Advance Booking Days</Label>
              <Input
                id="advance_booking_days"
                type="number"
                min="0"
                value={formData.advance_booking_days}
                onChange={(e) => setFormData({...formData, advance_booking_days: e.target.value})}
              />
            </div>

            {/* Seasonal Availability */}
            <div className="space-y-2">
              <Label htmlFor="valid_from">Valid From (Optional)</Label>
              <Input
                id="valid_from"
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid_to">Valid To (Optional)</Label>
              <Input
                id="valid_to"
                type="date"
                value={formData.valid_to}
                onChange={(e) => setFormData({...formData, valid_to: e.target.value})}
                min={formData.valid_from}
              />
            </div>

            {/* Description */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of this rate plan"
                rows="2"
              />
            </div>

            {/* Inclusions */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="inclusions">Inclusions</Label>
              <Input
                id="inclusions"
                value={formData.inclusions}
                onChange={(e) => setFormData({...formData, inclusions: e.target.value})}
                placeholder="e.g., Breakfast, WiFi, Parking"
              />
            </div>

            {/* Cancellation Policy */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="cancellation_policy">Cancellation Policy</Label>
              <Textarea
                id="cancellation_policy"
                value={formData.cancellation_policy}
                onChange={(e) => setFormData({...formData, cancellation_policy: e.target.value})}
                placeholder="e.g., Free cancellation up to 24 hours before check-in"
                rows="2"
              />
            </div>

            {/* Extra Person Fees Section */}
            <div className="col-span-2 border-t pt-4 mt-2">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">Extra Person Fees</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_occupancy">Base Occupancy</Label>
                  <Input
                    id="base_occupancy"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.base_occupancy}
                    onChange={(e) => setFormData({...formData, base_occupancy: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">
                    Guests included in base rate (additional guests will be charged)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_fee_unit">Fee Calculation</Label>
                  <Select
                    value={formData.extra_fee_unit}
                    onValueChange={(value) => setFormData({...formData, extra_fee_unit: value})}
                  >
                    <SelectTrigger id="extra_fee_unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_night">Per Night</SelectItem>
                      <SelectItem value="one_time">One Time (Entire Stay)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How extra person fees are calculated
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_adult_fee">Extra Adult Fee (₹)</Label>
                  <Input
                    id="extra_adult_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.extra_adult_fee}
                    onChange={(e) => setFormData({...formData, extra_adult_fee: e.target.value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee per extra adult {formData.extra_fee_unit === 'per_night' ? 'per night' : 'for entire stay'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="extra_child_fee">Extra Child Fee (₹)</Label>
                  <Input
                    id="extra_child_fee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.extra_child_fee}
                    onChange={(e) => setFormData({...formData, extra_child_fee: e.target.value})}
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee per child {formData.extra_fee_unit === 'per_night' ? 'per night' : 'for entire stay'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Switches */}
            <div className="space-y-4 col-span-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_active">Active</Label>
                  <div className="text-sm text-muted-foreground">
                    Allow this rate to be booked
                  </div>
                </div>
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_default">Set as Default</Label>
                  <div className="text-sm text-muted-foreground">
                    Use this rate by default for new bookings
                  </div>
                </div>
                <Switch
                  id="is_default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({...formData, is_default: checked})}
                />
              </div>
            </div>
          </div>
            </TabsContent>

            {/* Add-ons Tab */}
            <TabsContent value="addons" className="mt-4 space-y-4">
              {/* Add-on Form */}
              {showAddonForm ? (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">
                      {editingAddon ? 'Edit Add-on' : 'New Add-on'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="addon_name">Add-on Name *</Label>
                        <Input
                          id="addon_name"
                          value={addonFormData.name}
                          onChange={(e) => setAddonFormData({...addonFormData, name: e.target.value})}
                          placeholder="e.g., Airport Pickup, Late Checkout"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon_price">Price (₹)</Label>
                        <Input
                          id="addon_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={addonFormData.price}
                          onChange={(e) => setAddonFormData({...addonFormData, price: e.target.value})}
                          placeholder="0 for included items"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon_charge_type">Charge Type</Label>
                        <Select
                          value={addonFormData.charge_type}
                          onValueChange={(value) => setAddonFormData({...addonFormData, charge_type: value})}
                        >
                          <SelectTrigger id="addon_charge_type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="informational">
                              <div className="flex items-center gap-2">
                                <Gift className="h-4 w-4 text-green-600" />
                                <span>Included (Informational)</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="auto_charge">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-600" />
                                <span>Auto-Charge at Check-in</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          {addonFormData.charge_type === 'informational'
                            ? 'Shown as included in the rate (no extra charge)'
                            : 'Automatically charged to folio during check-in'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="addon_unit">Pricing Unit</Label>
                        <Select
                          value={addonFormData.unit}
                          onValueChange={(value) => setAddonFormData({...addonFormData, unit: value})}
                          disabled={addonFormData.charge_type === 'informational'}
                        >
                          <SelectTrigger id="addon_unit">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_stay">Per Stay (One-time)</SelectItem>
                            <SelectItem value="per_night">Per Night</SelectItem>
                            <SelectItem value="per_person_per_night">Per Person Per Night</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="addon_description">Description</Label>
                        <Textarea
                          id="addon_description"
                          value={addonFormData.description}
                          onChange={(e) => setAddonFormData({...addonFormData, description: e.target.value})}
                          placeholder="Optional description of this add-on"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="addon_is_taxable"
                          checked={addonFormData.is_taxable}
                          onCheckedChange={(checked) => setAddonFormData({...addonFormData, is_taxable: checked})}
                          disabled={addonFormData.charge_type === 'informational'}
                        />
                        <Label htmlFor="addon_is_taxable" className="text-sm">
                          Apply taxes to this add-on
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="addon_is_active"
                          checked={addonFormData.is_active}
                          onCheckedChange={(checked) => setAddonFormData({...addonFormData, is_active: checked})}
                        />
                        <Label htmlFor="addon_is_active" className="text-sm">
                          Active
                        </Label>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={resetAddonForm}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleAddonSubmit} disabled={!addonFormData.name}>
                        {editingAddon ? 'Update Add-on' : 'Add Add-on'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Button variant="outline" onClick={() => setShowAddonForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Add-on
                </Button>
              )}

              {/* Add-ons List */}
              {loadingAddons ? (
                <div className="text-center py-4 text-muted-foreground">Loading add-ons...</div>
              ) : addons.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No add-ons configured for this rate type.</p>
                  <p className="text-sm mt-1">Add-ons can be informational (included) or auto-charged at check-in.</p>
                </div>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Add-on</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {addons.map((addon) => (
                          <TableRow key={addon.id} className={!addon.is_active ? 'opacity-50' : ''}>
                            <TableCell>
                              <div className="font-medium">{addon.name}</div>
                              {addon.description && (
                                <div className="text-xs text-muted-foreground">{addon.description}</div>
                              )}
                            </TableCell>
                            <TableCell>
                              {addon.charge_type === 'informational' ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                                  <Gift className="h-3 w-3 mr-1" />
                                  Included
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Auto-Charge
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {addon.charge_type === 'informational' ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                `₹${parseFloat(addon.price || 0).toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell>
                              {addon.charge_type === 'auto_charge' && (
                                <span className="text-xs">
                                  {addon.unit === 'per_stay' && 'Per Stay'}
                                  {addon.unit === 'per_night' && 'Per Night'}
                                  {addon.unit === 'per_person_per_night' && 'Per Person/Night'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={addon.is_active}
                                onCheckedChange={() => toggleAddonActive(addon)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleEditAddon(addon)}
                                >
                                  <Edit2 size={14} className="text-blue-600 dark:text-blue-400" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => handleDeleteAddon(addon.id)}
                                >
                                  <Trash2 size={14} className="text-red-600 dark:text-red-400" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Add-ons Info */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">About Add-ons:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li><strong>Included (Informational)</strong>: Displayed as part of the rate but not charged separately</li>
                  <li><strong>Auto-Charge</strong>: Automatically added to the guest's folio during check-in</li>
                  <li>Per Night add-ons multiply by stay duration</li>
                  <li>Per Person/Night add-ons multiply by guest count and stay duration</li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={resetForm}>
                <XCircle size={18} className="mr-2" /> Cancel
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit}>
              <Save size={18} className="mr-2" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RateTypesManager;
