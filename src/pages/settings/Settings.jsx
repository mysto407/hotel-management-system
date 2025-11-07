// src/pages/settings/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Building2, DollarSign, Clock, Globe, Download, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase, getHotelSettings, updateHotelSetting } from '../../lib/supabase';
import { cn } from '@/lib/utils';

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have added this component
import { Alert, AlertDescription } from "@/components/ui/alert"; // For showing user info

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Hotel Settings State
  const [hotelSettings, setHotelSettings] = useState({
    hotel_name: '',
    hotel_address: '',
    hotel_city: '',
    hotel_state: '',
    hotel_country: '',
    hotel_pincode: '',
    hotel_phone: '',
    hotel_email: '',
    hotel_website: '',
    hotel_gst: '',
    hotel_description: ''
  });

  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState({
    gst_rate: '18',
    service_charge_rate: '10',
    apply_service_charge: 'true',
    tax_inclusive: 'false'
  });

  // Room Settings State
  const [roomSettings, setRoomSettings] = useState({
    default_checkin_time: '14:00',
    default_checkout_time: '11:00',
    early_checkin_charge: '500',
    late_checkout_charge: '500',
    extra_bed_charge: '1000',
    child_age_limit: '12'
  });

  // Booking Settings State
  const [bookingSettings, setBookingSettings] = useState({
    advance_booking_days: '90',
    min_booking_days: '1',
    max_booking_days: '30',
    cancellation_hours: '24',
    cancellation_charge_percent: '50',
    require_advance_payment: 'true',
    minimum_advance_percent: '30'
  });

  // Load settings from Supabase
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await getHotelSettings();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const settingsObj = {};
        data.forEach(setting => {
          settingsObj[setting.setting_key] = setting.setting_value;
        });
        
        setHotelSettings(prev => ({ ...prev, ...settingsObj }));
        setTaxSettings(prev => ({ ...prev, ...settingsObj }));
        setRoomSettings(prev => ({ ...prev, ...settingsObj }));
        setBookingSettings(prev => ({ ...prev, ...settingsObj }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const showSuccessMessage = () => {
    setSuccessMessage('Settings saved successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const saveSettings = async (settingsObject) => {
    setLoading(true);
    try {
      for (const [key, value] of Object.entries(settingsObject)) {
        const { error } = await updateHotelSetting(key, value);
        if (error) throw error;
      }
      showSuccessMessage();
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHotelSettings = () => saveSettings(hotelSettings);
  const handleSaveTaxSettings = () => saveSettings(taxSettings);
  const handleSaveRoomSettings = () => saveSettings(roomSettings);
  const handleSaveBookingSettings = () => saveSettings(bookingSettings);

  const handleBackup = async () => {
    try {
      const { data: rooms } = await supabase.from('rooms').select('*');
      const { data: roomTypes } = await supabase.from('room_types').select('*');
      const { data: guests } = await supabase.from('guests').select('*');
      const { data: reservations } = await supabase.from('reservations').select('*');
      const { data: bills } = await supabase.from('bills').select('*');
      const { data: inventory } = await supabase.from('inventory_items').select('*');

      const backup = {
        timestamp: new Date().toISOString(),
        rooms,
        roomTypes,
        guests,
        reservations,
        bills,
        inventory
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hotel-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      alert('Backup created successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      alert('Failed to create backup: ' + error.message);
    }
  };
  
  // Helper to handle text input changes
  const handleHotelChange = (e) => setHotelSettings({...hotelSettings, [e.target.id]: e.target.value});
  const handleTaxChange = (e) => setTaxSettings({...taxSettings, [e.target.id]: e.target.value});
  const handleRoomChange = (e) => setRoomSettings({...roomSettings, [e.target.id]: e.target.value});
  const handleBookingChange = (e) => setBookingSettings({...bookingSettings, [e.target.id]: e.target.value});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Settings</h1>
        {successMessage && (
          <Alert className="w-auto py-2 px-4 border-green-300 bg-green-50 text-green-700">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <Tabs defaultValue="hotel" className="flex flex-col md:flex-row gap-6">
        <TabsList className="flex-col h-auto justify-start p-2 w-full md:w-64">
          <TabsTrigger value="hotel" className="w-full justify-start gap-2">
            <Building2 size={18} /> Hotel Profile
          </TabsTrigger>
          <TabsTrigger value="tax" className="w-full justify-start gap-2">
            <DollarSign size={18} /> Tax Settings
          </TabsTrigger>
          <TabsTrigger value="room" className="w-full justify-start gap-2">
            <Clock size={18} /> Room Settings
          </TabsTrigger>
          <TabsTrigger value="booking" className="w-full justify-start gap-2">
            <Calendar size={18} /> Booking Settings
          </TabsTrigger>
          <TabsTrigger value="system" className="w-full justify-start gap-2">
            <Globe size={18} /> System
          </TabsTrigger>
        </TabsList>

        <div className="flex-1">
          {/* Hotel Profile Tab */}
          <TabsContent value="hotel">
            <Card>
              <CardHeader>
                <CardTitle>Hotel Information</CardTitle>
                <CardDescription>Update your hotel's public details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotel_name">Hotel Name *</Label>
                    <Input id="hotel_name" value={hotelSettings.hotel_name} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_phone">Phone *</Label>
                    <Input id="hotel_phone" type="tel" value={hotelSettings.hotel_phone} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_email">Email *</Label>
                    <Input id="hotel_email" type="email" value={hotelSettings.hotel_email} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_website">Website</Label>
                    <Input id="hotel_website" value={hotelSettings.hotel_website} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="hotel_address">Address *</Label>
                    <Input id="hotel_address" value={hotelSettings.hotel_address} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_city">City *</Label>
                    <Input id="hotel_city" value={hotelSettings.hotel_city} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_state">State *</Label>
                    <Input id="hotel_state" value={hotelSettings.hotel_state} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_country">Country *</Label>
                    <Input id="hotel_country" value={hotelSettings.hotel_country} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_pincode">Pincode *</Label>
                    <Input id="hotel_pincode" value={hotelSettings.hotel_pincode} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hotel_gst">GST Number</Label>
                    <Input id="hotel_gst" value={hotelSettings.hotel_gst} onChange={handleHotelChange} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="hotel_description">Description</Label>
                    <Textarea id="hotel_description" value={hotelSettings.hotel_description} onChange={handleHotelChange} rows="3" />
                  </div>
                </div>
                <Button onClick={handleSaveHotelSettings} disabled={loading}>
                  <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save Hotel Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Settings Tab */}
          <TabsContent value="tax">
            <Card>
              <CardHeader>
                <CardTitle>Tax Configuration</CardTitle>
                <CardDescription>Manage tax rates and billing rules.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gst_rate">GST Rate (%)</Label>
                    <Input id="gst_rate" type="number" value={taxSettings.gst_rate} onChange={handleTaxChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_charge_rate">Service Charge (%)</Label>
                    <Input id="service_charge_rate" type="number" value={taxSettings.service_charge_rate} onChange={handleTaxChange} />
                  </div>
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="apply_service_charge"
                      checked={taxSettings.apply_service_charge === 'true'}
                      onCheckedChange={(checked) => setTaxSettings({...taxSettings, apply_service_charge: checked ? 'true' : 'false'})}
                    />
                    <Label htmlFor="apply_service_charge" className="font-normal">Apply Service Charge</Label>
                  </div>
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="tax_inclusive"
                      checked={taxSettings.tax_inclusive === 'true'}
                      onCheckedChange={(checked) => setTaxSettings({...taxSettings, tax_inclusive: checked ? 'true' : 'false'})}
                    />
                    <Label htmlFor="tax_inclusive" className="font-normal">Tax Inclusive Pricing</Label>
                  </div>
                </div>
                <Button onClick={handleSaveTaxSettings} disabled={loading}>
                  <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save Tax Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Room Settings Tab */}
          <TabsContent value="room">
            <Card>
              <CardHeader>
                <CardTitle>Room Configuration</CardTitle>
                <CardDescription>Manage default room policies and charges.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="default_checkin_time">Default Check-in Time</Label>
                    <Input id="default_checkin_time" type="time" value={roomSettings.default_checkin_time} onChange={handleRoomChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_checkout_time">Default Check-out Time</Label>
                    <Input id="default_checkout_time" type="time" value={roomSettings.default_checkout_time} onChange={handleRoomChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="early_checkin_charge">Early Check-in Charge (₹)</Label>
                    <Input id="early_checkin_charge" type="number" value={roomSettings.early_checkin_charge} onChange={handleRoomChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="late_checkout_charge">Late Check-out Charge (₹)</Label>
                    <Input id="late_checkout_charge" type="number" value={roomSettings.late_checkout_charge} onChange={handleRoomChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="extra_bed_charge">Extra Bed Charge (₹)</Label>
                    <Input id="extra_bed_charge" type="number" value={roomSettings.extra_bed_charge} onChange={handleRoomChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="child_age_limit">Child Age Limit (years)</Label>
                    <Input id="child_age_limit" type="number" value={roomSettings.child_age_limit} onChange={handleRoomChange} />
                  </div>
                </div>
                <Button onClick={handleSaveRoomSettings} disabled={loading}>
                  <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save Room Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Booking Settings Tab */}
          <TabsContent value="booking">
            <Card>
              <CardHeader>
                <CardTitle>Booking Configuration</CardTitle>
                <CardDescription>Manage rules for online and offline bookings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="advance_booking_days">Advance Booking Days</Label>
                    <Input id="advance_booking_days" type="number" value={bookingSettings.advance_booking_days} onChange={handleBookingChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_booking_days">Minimum Booking Days</Label>
                    <Input id="min_booking_days" type="number" value={bookingSettings.min_booking_days} onChange={handleBookingChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_booking_days">Maximum Booking Days</Label>
                    <Input id="max_booking_days" type="number" value={bookingSettings.max_booking_days} onChange={handleBookingChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancellation_hours">Cancellation Notice (hours)</Label>
                    <Input id="cancellation_hours" type="number" value={bookingSettings.cancellation_hours} onChange={handleBookingChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cancellation_charge_percent">Cancellation Charge (%)</Label>
                    <Input id="cancellation_charge_percent" type="number" value={bookingSettings.cancellation_charge_percent} onChange={handleBookingChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="minimum_advance_percent">Minimum Advance Payment (%)</Label>
                    <Input id="minimum_advance_percent" type="number" value={bookingSettings.minimum_advance_percent} onChange={handleBookingChange} />
                  </div>
                  <div className="flex items-center space-x-2 pt-4 col-span-2">
                    <Checkbox
                      id="require_advance_payment"
                      checked={bookingSettings.require_advance_payment === 'true'}
                      onCheckedChange={(checked) => setBookingSettings({...bookingSettings, require_advance_payment: checked ? 'true' : 'false'})}
                    />
                    <Label htmlFor="require_advance_payment" className="font-normal">Require Advance Payment for Bookings</Label>
                  </div>
                </div>
                <Button onClick={handleSaveBookingSettings} disabled={loading}>
                  <Save size={18} className="mr-2" /> {loading ? 'Saving...' : 'Save Booking Settings'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <h4 className="font-semibold">Backup Database</h4>
                      <p className="text-sm text-muted-foreground">Create a complete backup of all system data as JSON</p>
                    </div>
                    <Button onClick={handleBackup} disabled={loading}>
                      <Download size={18} className="mr-2" /> Create Backup
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current User</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p><strong>Name:</strong> {user?.name}</p>
                  <p><strong>Role:</strong> {user?.role}</p>
                  <p><strong>Email:</strong> {user?.email || 'Not set'}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p><strong>Hotel Management System</strong> Version 1.0.0</p>
                  <p>Built with React + Supabase</p>
                  <p>© 2025 All rights reserved</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;