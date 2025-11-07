// src/components/guests/AddGuestModal.jsx
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useGuests } from '../../context/GuestContext';

import { Button } from "@/components/ui/button";
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

export const AddGuestModal = ({ isOpen, onClose, onGuestAdded }) => {
  const { addGuest, idProofTypes, guestTypes } = useGuests();
  const [guestFormData, setGuestFormData] = useState({
    name: '',
    email: '',
    phone: '',
    id_proof_type: 'AADHAR',
    id_proof_number: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    guest_type: 'Regular'
  });

  const resetForm = () => {
    setGuestFormData({
      name: '', email: '', phone: '', id_proof_type: 'AADHAR',
      id_proof_number: '', address: '', city: '', state: '',
      country: 'India', guest_type: 'Regular'
    });
    onClose();
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      alert('Please enter guest name');
      return;
    }
    try {
      const newGuest = await addGuest(guestFormData);
      if (newGuest) {
        if (onGuestAdded) {
          onGuestAdded(newGuest);
        }
        resetForm();
      }
    } catch (error) {
      console.error('Error adding guest:', error);
      alert('Failed to add guest: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Guest</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={guestFormData.name}
              onChange={(e) => setGuestFormData({ ...guestFormData, name: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={guestFormData.phone}
              onChange={(e) => setGuestFormData({ ...guestFormData, phone: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={guestFormData.email}
              onChange={(e) => setGuestFormData({ ...guestFormData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>
           <div className="space-y-2">
            <Label htmlFor="guest_type">Guest Type</Label>
            <Select
              value={guestFormData.guest_type}
              onValueChange={(value) => setGuestFormData({ ...guestFormData, guest_type: value })}
            >
              <SelectTrigger id="guest_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {guestTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_proof_type">ID Proof Type</Label>
            <Select
              value={guestFormData.id_proof_type}
              onValueChange={(value) => setGuestFormData({ ...guestFormData, id_proof_type: value })}
            >
              <SelectTrigger id="id_proof_type">
                <SelectValue placeholder="Select ID type" />
              </SelectTrigger>
              <SelectContent>
                {idProofTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
                <SelectItem value="N/A">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="id_proof_number">ID Proof Number</Label>
            <Input
              id="id_proof_number"
              value={guestFormData.id_proof_number}
              onChange={(e) => setGuestFormData({ ...guestFormData, id_proof_number: e.target.value })}
              placeholder="ID Number"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={guestFormData.address}
              onChange={(e) => setGuestFormData({ ...guestFormData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={guestFormData.city}
              onChange={(e) => setGuestFormData({ ...guestFormData, city: e.target.value })}
              placeholder="Mumbai"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">State</Label>
            <Input
              id="state"
              value={guestFormData.state}
              onChange={(e) => setGuestFormData({ ...guestFormData, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={guestFormData.country}
              onChange={(e) => setGuestFormData({ ...guestFormData, country: e.target.value })}
              placeholder="India"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="mr-2 h-4 w-4" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCreateGuest}>
            <Save className="mr-2 h-4 w-4" /> Add Guest
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};