// src/pages/rooms/RoomTypes.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import RateTypesManager from '../../components/rooms/RateTypesManager';

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
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


const RoomTypes = () => {
  const { roomTypes, addRoomType, updateRoomType, deleteRoomType, getRateTypesByRoomType, getDefaultRateTypeByRoomType } = useRooms();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [expandedRoomType, setExpandedRoomType] = useState(null);
  const [selectedRates, setSelectedRates] = useState({});
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
    capacity: '',
    amenities: '',
    description: ''
  });

  const handleSubmit = async () => {
    const roomTypeData = {
      name: formData.name,
      base_price: parseFloat(formData.base_price),
      capacity: parseInt(formData.capacity),
      amenities: formData.amenities,
      description: formData.description
    };

    if (editingType) {
      await updateRoomType(editingType.id, roomTypeData);
    } else {
      await addRoomType(roomTypeData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      base_price: '',
      capacity: '',
      amenities: '',
      description: ''
    });
    setEditingType(null);
    setIsModalOpen(false);
  };

  const handleEdit = (type) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      base_price: type.base_price,
      capacity: type.capacity,
      amenities: type.amenities || '',
      description: type.description || ''
    });
    setIsModalOpen(true);
  };

  // Get the selected rate type for a room type, or default to the default rate
  const getSelectedRateForRoomType = (roomTypeId) => {
    const rateTypes = getRateTypesByRoomType(roomTypeId);
    if (rateTypes.length === 0) return null;

    // If a rate is selected in state, use that
    if (selectedRates[roomTypeId]) {
      const selected = rateTypes.find(rt => rt.id === selectedRates[roomTypeId]);
      if (selected) return selected;
    }

    // Otherwise, use the default rate
    const defaultRate = getDefaultRateTypeByRoomType(roomTypeId);
    if (defaultRate) return defaultRate;

    // Fallback to the first rate
    return rateTypes[0];
  };

  const handleRateChange = (roomTypeId, rateTypeId) => {
    setSelectedRates(prev => ({
      ...prev,
      [roomTypeId]: rateTypeId
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Room Types</h1>
        <Button onClick={() => { setEditingType(null); setIsModalOpen(true); }}>
          <Plus size={20} className="mr-2" /> Add Room Type
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Rates</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Amenities</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roomTypes.map(type => (
                <>
                  <TableRow key={type.id} className="hover:bg-muted/50">
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setExpandedRoomType(expandedRoomType === type.id ? null : type.id)}
                      >
                        {expandedRoomType === type.id ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium py-2">{type.name}</TableCell>
                    <TableCell className="py-2">
                      {(() => {
                        const availableRates = getRateTypesByRoomType(type.id);
                        const selectedRate = getSelectedRateForRoomType(type.id);

                        if (availableRates.length === 0) {
                          return <span className="text-muted-foreground text-sm">No rates defined</span>;
                        }

                        if (availableRates.length === 1) {
                          return <span>₹{selectedRate?.base_price || type.base_price}</span>;
                        }

                        return (
                          <Select
                            value={selectedRate?.id || ''}
                            onValueChange={(value) => handleRateChange(type.id, value)}
                          >
                            <SelectTrigger className="h-8 w-[180px]">
                              <SelectValue>
                                {selectedRate ? `₹${selectedRate.base_price} - ${selectedRate.rate_name}` : 'Select rate'}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {availableRates.map(rate => (
                                <SelectItem key={rate.id} value={rate.id}>
                                  ₹{rate.base_price} - {rate.rate_name}
                                  {rate.is_default && ' (Default)'}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="py-2">{type.capacity} {type.capacity === 1 ? 'person' : 'people'}</TableCell>
                    <TableCell className="max-w-xs truncate py-2">{type.amenities}</TableCell>
                    <TableCell className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleEdit(type)}>
                          <Edit2 size={14} className="text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteRoomType(type.id)}>
                          <Trash2 size={14} className="text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRoomType === type.id && (
                    <TableRow key={`${type.id}-expanded`}>
                      <TableCell colSpan={6} className="bg-muted/30 p-6">
                        <RateTypesManager roomType={type} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Room Type' : 'Add Room Type'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Room Type Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g., Deluxe Suite"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="base_price">Base Price (₹) *</Label>
              <Input
                id="base_price"
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({...formData, base_price: e.target.value})}
                placeholder="2500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity *</Label>
              <Input
                id="capacity"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                placeholder="2"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="amenities">Amenities</Label>
              <Input
                id="amenities"
                value={formData.amenities}
                onChange={(e) => setFormData({...formData, amenities: e.target.value})}
                placeholder="AC, TV, WiFi, Mini Bar"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Brief description of the room type"
                rows="3"
              />
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

export default RoomTypes;