// src/components/guests/AddGuestModal.jsx
import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useGuests } from '../../context/GuestContext';
import { useAlert } from '@/context/AlertContext';

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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AddGuestModal = ({ isOpen, onClose, onGuestAdded }) => {
  const { addGuest, idProofTypes, guestTypes, genderOptions, nationalities } = useGuests();
  const { error: showError, warning: showWarning } = useAlert();
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
    date_of_birth: '',
    guest_type: 'Regular',
    gender: '',
    nationality: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    is_vip: false
  });

  const resetForm = () => {
    setGuestFormData({
      name: '', email: '', phone: '', id_proof_type: 'AADHAR',
      id_proof_number: '', address: '', city: '', state: '',
      country: 'India', date_of_birth: '', guest_type: 'Regular',
      gender: '', nationality: '', emergency_contact_name: '',
      emergency_contact_phone: '', is_vip: false
    });
    onClose();
  };

  const handleCreateGuest = async () => {
    if (!guestFormData.name) {
      showWarning('Please enter guest name');
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
      showError('Failed to add guest: ' + error.message);
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
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input
              id="date_of_birth"
              type="date"
              value={guestFormData.date_of_birth}
              onChange={(e) => setGuestFormData({ ...guestFormData, date_of_birth: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={guestFormData.gender}
              onValueChange={(value) => setGuestFormData({ ...guestFormData, gender: value })}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {genderOptions.map(gender => (
                  <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nationality">Nationality</Label>
            <Select
              value={guestFormData.nationality}
              onValueChange={(value) => setGuestFormData({ ...guestFormData, nationality: value })}
            >
              <SelectTrigger id="nationality">
                <SelectValue placeholder="Select nationality" />
              </SelectTrigger>
              <SelectContent>
                {nationalities.map(nationality => (
                  <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="is_vip"
              checked={guestFormData.is_vip}
              onCheckedChange={(checked) => setGuestFormData({ ...guestFormData, is_vip: checked })}
            />
            <Label htmlFor="is_vip" className="text-sm font-medium cursor-pointer">
              VIP Guest
            </Label>
          </div>
          <div className="md:col-span-2 pt-4 border-t">
            <Label className="text-sm font-semibold text-muted-foreground">Emergency Contact</Label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_name">Contact Name</Label>
            <Input
              id="emergency_contact_name"
              value={guestFormData.emergency_contact_name}
              onChange={(e) => setGuestFormData({ ...guestFormData, emergency_contact_name: e.target.value })}
              placeholder="Emergency contact name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
            <Input
              id="emergency_contact_phone"
              type="tel"
              value={guestFormData.emergency_contact_phone}
              onChange={(e) => setGuestFormData({ ...guestFormData, emergency_contact_phone: e.target.value })}
              placeholder="Emergency contact phone"
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