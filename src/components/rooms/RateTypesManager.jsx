// src/components/rooms/RateTypesManager.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Star, Check } from 'lucide-react';
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
    valid_to: ''
  });

  const rateTypes = getRateTypesByRoomType(roomType.id);

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
      valid_to: formData.valid_to || null
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
      valid_to: ''
    });
    setEditingRateType(null);
    setIsModalOpen(false);
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
      valid_to: rateType.valid_to || ''
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
