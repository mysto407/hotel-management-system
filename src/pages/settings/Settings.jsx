// src/pages/settings/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Building2, DollarSign, Clock, Globe, Download, Calendar, Utensils, Plus, Edit2, Trash2, Eye, EyeOff, CreditCard, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useMealPlans } from '../../context/MealPlanContext';
import { useConfirm, useAlert } from '@/context/AlertContext';
import { supabase, getHotelSettings, updateHotelSetting, getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod, reorderPaymentMethods } from '../../lib/supabase';
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
  const { mealPlans, addMealPlan, updateMealPlan, deleteMealPlan, toggleMealPlanStatus } = useMealPlans();
  const confirmDialog = useConfirm();
  const { error: showError, success: showSuccess, warning: showWarning, info: showInfo } = useAlert();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Meal Plan Form State
  const [editingMealPlan, setEditingMealPlan] = useState(null);
  const [mealPlanForm, setMealPlanForm] = useState({
    code: '',
    name: '',
    description: '',
    is_meal_plan: true,
    includes_breakfast: false,
    includes_lunch: false,
    includes_dinner: false,
    breakfast_price: '0.00',
    lunch_price: '0.00',
    dinner_price: '0.00',
    price_per_person: '0.00', // Auto-calculated, read-only
    is_active: true,
    sort_order: 0
  });

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

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    name: '',
    code: ''
  });

  // Load settings from Supabase
  useEffect(() => {
    loadSettings();
    loadPaymentMethods();
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

  const loadPaymentMethods = async () => {
    try {
      const { data, error } = await getPaymentMethods(false); // Get all including inactive
      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
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
      showError('Failed to save settings: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveHotelSettings = () => saveSettings(hotelSettings);
  const handleSaveTaxSettings = () => saveSettings(taxSettings);
  const handleSaveRoomSettings = () => saveSettings(roomSettings);
  const handleSaveBookingSettings = () => saveSettings(bookingSettings);

  // Meal Plan Handlers
  const resetMealPlanForm = () => {
    setMealPlanForm({
      code: '',
      name: '',
      description: '',
      is_meal_plan: true,
      includes_breakfast: false,
      includes_lunch: false,
      includes_dinner: false,
      breakfast_price: '0.00',
      lunch_price: '0.00',
      dinner_price: '0.00',
      price_per_person: '0.00',
      is_active: true,
      sort_order: mealPlans.length
    });
    setEditingMealPlan(null);
  };

  const handleEditMealPlan = (plan) => {
    setMealPlanForm({
      code: plan.code,
      name: plan.name,
      description: plan.description || '',
      is_meal_plan: plan.is_meal_plan !== false,
      includes_breakfast: plan.includes_breakfast || false,
      includes_lunch: plan.includes_lunch || false,
      includes_dinner: plan.includes_dinner || false,
      breakfast_price: (plan.breakfast_price || 0).toString(),
      lunch_price: (plan.lunch_price || 0).toString(),
      dinner_price: (plan.dinner_price || 0).toString(),
      price_per_person: (plan.price_per_person || 0).toString(),
      is_active: plan.is_active,
      sort_order: plan.sort_order
    });
    setEditingMealPlan(plan.id);
  };

  // Calculate auto-calculated price_per_person from meal prices
  const calculateTotalDailyRate = () => {
    const breakfast = mealPlanForm.includes_breakfast ? parseFloat(mealPlanForm.breakfast_price || 0) : 0;
    const lunch = mealPlanForm.includes_lunch ? parseFloat(mealPlanForm.lunch_price || 0) : 0;
    const dinner = mealPlanForm.includes_dinner ? parseFloat(mealPlanForm.dinner_price || 0) : 0;
    return (breakfast + lunch + dinner).toFixed(2);
  };

  const handleSaveMealPlan = async () => {
    if (!mealPlanForm.code || !mealPlanForm.name) {
      showError('Please fill in Code and Name fields');
      return;
    }

    // Auto-calculate price_per_person from individual meal prices
    const formData = {
      ...mealPlanForm,
      price_per_person: calculateTotalDailyRate(),
      breakfast_price: parseFloat(mealPlanForm.breakfast_price || 0),
      lunch_price: parseFloat(mealPlanForm.lunch_price || 0),
      dinner_price: parseFloat(mealPlanForm.dinner_price || 0)
    };

    setLoading(true);
    try {
      if (editingMealPlan) {
        await updateMealPlan(editingMealPlan, formData);
      } else {
        await addMealPlan(formData);
      }
      resetMealPlanForm();
      showSuccessMessage();
    } catch (error) {
      console.error('Error saving meal plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMealPlan = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Meal Plan',
      message: 'Are you sure you want to delete this meal plan? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) {
      return;
    }

    setLoading(true);
    try {
      await deleteMealPlan(id);
      showSuccessMessage();
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMealPlanStatus = async (id) => {
    setLoading(true);
    try {
      await toggleMealPlanStatus(id);
      showSuccessMessage();
    } finally {
      setLoading(false);
    }
  };

  const handleMealPlanFormChange = (e) => {
    const { id, value } = e.target;
    setMealPlanForm(prev => ({ ...prev, [id]: value }));
  };

  // Payment Method Handlers
  const resetPaymentMethodForm = () => {
    setPaymentMethodForm({ name: '', code: '' });
    setEditingPaymentMethod(null);
  };

  const handleEditPaymentMethod = (method) => {
    setPaymentMethodForm({ name: method.name, code: method.code });
    setEditingPaymentMethod(method.id);
  };

  const handleSavePaymentMethod = async () => {
    if (!paymentMethodForm.name || !paymentMethodForm.code) {
      showError('Please fill in both Name and Code fields');
      return;
    }

    setLoading(true);
    try {
      if (editingPaymentMethod) {
        const { error } = await updatePaymentMethod(editingPaymentMethod, {
          name: paymentMethodForm.name,
          code: paymentMethodForm.code
        });
        if (error) throw error;
      } else {
        const maxOrder = Math.max(...paymentMethods.map(m => m.display_order || 0), 0);
        const { error } = await createPaymentMethod(
          paymentMethodForm.name,
          paymentMethodForm.code,
          maxOrder + 1
        );
        if (error) throw error;
      }
      resetPaymentMethodForm();
      await loadPaymentMethods();
      showSuccessMessage();
    } catch (error) {
      console.error('Error saving payment method:', error);
      showError('Failed to save payment method: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (id) => {
    const confirmed = await confirmDialog({
      title: 'Delete Payment Method',
      message: 'Are you sure you want to deactivate this payment method? It will no longer appear in payment forms.',
      variant: 'danger',
      confirmText: 'Deactivate',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    setLoading(true);
    try {
      const { error } = await deletePaymentMethod(id);
      if (error) throw error;
      await loadPaymentMethods();
      showSuccessMessage();
    } catch (error) {
      console.error('Error deleting payment method:', error);
      showError('Failed to delete payment method: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePaymentMethodStatus = async (id, currentStatus) => {
    setLoading(true);
    try {
      const { error } = await updatePaymentMethod(id, { is_active: !currentStatus });
      if (error) throw error;
      await loadPaymentMethods();
      showSuccessMessage();
    } catch (error) {
      console.error('Error toggling payment method status:', error);
      showError('Failed to update payment method: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMovePaymentMethod = async (id, direction) => {
    const currentIndex = paymentMethods.findIndex(m => m.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= paymentMethods.length) return;

    const reordered = [...paymentMethods];
    [reordered[currentIndex], reordered[newIndex]] = [reordered[newIndex], reordered[currentIndex]];

    // Update display_order for affected items
    const orderUpdates = reordered.map((m, idx) => ({ id: m.id, display_order: idx + 1 }));

    setLoading(true);
    try {
      const { error } = await reorderPaymentMethods(orderUpdates);
      if (error) throw error;
      await loadPaymentMethods();
    } catch (error) {
      console.error('Error reordering payment methods:', error);
      showError('Failed to reorder payment methods: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentMethodFormChange = (e) => {
    const { id, value } = e.target;
    setPaymentMethodForm(prev => ({ ...prev, [id]: value }));
  };

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
      showSuccess('Backup created successfully!');
    } catch (error) {
      console.error('Backup error:', error);
      showError('Failed to create backup: ' + error.message);
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
          <Alert className="w-auto py-2 px-4 border-success/30 bg-success/10 text-success">
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
          <TabsTrigger value="mealplans" className="w-full justify-start gap-2">
            <Utensils size={18} /> Meal Plans
          </TabsTrigger>
          <TabsTrigger value="paymentmethods" className="w-full justify-start gap-2">
            <CreditCard size={18} /> Payment Methods
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

          {/* Meal Plans Tab */}
          <TabsContent value="mealplans">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingMealPlan ? 'Edit Meal Plan' : 'Add New Meal Plan'}</CardTitle>
                  <CardDescription>Create and manage meal plan options with custom pricing</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        placeholder="e.g., EP, CP, MAP, AP"
                        value={mealPlanForm.code}
                        onChange={handleMealPlanFormChange}
                        maxLength={10}
                      />
                      <p className="text-xs text-muted-foreground">Short unique code (max 10 characters)</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Room Only, Breakfast Included"
                        value={mealPlanForm.name}
                        onChange={handleMealPlanFormChange}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="e.g., Includes breakfast, lunch, and dinner"
                        value={mealPlanForm.description}
                        onChange={handleMealPlanFormChange}
                        rows="2"
                      />
                    </div>

                    {/* Is Meal Plan Toggle */}
                    <div className="flex items-center space-x-2 col-span-2 pb-2 border-b">
                      <Checkbox
                        id="is_meal_plan"
                        checked={mealPlanForm.is_meal_plan}
                        onCheckedChange={(checked) => setMealPlanForm(prev => ({
                          ...prev,
                          is_meal_plan: checked,
                          // Reset meal inclusions if not a meal plan
                          ...(checked ? {} : {
                            includes_breakfast: false,
                            includes_lunch: false,
                            includes_dinner: false,
                            breakfast_price: '0.00',
                            lunch_price: '0.00',
                            dinner_price: '0.00'
                          })
                        }))}
                      />
                      <Label htmlFor="is_meal_plan" className="font-normal">
                        This is a meal plan (includes meals)
                      </Label>
                      <p className="text-xs text-muted-foreground ml-2">
                        Uncheck for "Room Only" type plans
                      </p>
                    </div>

                    {/* Meal Inclusions */}
                    {mealPlanForm.is_meal_plan && (
                      <>
                        <div className="col-span-2">
                          <Label className="text-sm font-medium mb-3 block">Included Meals</Label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Breakfast */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includes_breakfast"
                                  checked={mealPlanForm.includes_breakfast}
                                  onCheckedChange={(checked) => setMealPlanForm(prev => ({
                                    ...prev,
                                    includes_breakfast: checked,
                                    breakfast_price: checked ? prev.breakfast_price : '0.00'
                                  }))}
                                />
                                <Label htmlFor="includes_breakfast" className="font-medium">Breakfast</Label>
                              </div>
                              {mealPlanForm.includes_breakfast && (
                                <div className="space-y-1">
                                  <Label htmlFor="breakfast_price" className="text-xs text-muted-foreground">Price per person (₹)</Label>
                                  <Input
                                    id="breakfast_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={mealPlanForm.breakfast_price}
                                    onChange={handleMealPlanFormChange}
                                    className="h-8"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Lunch */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includes_lunch"
                                  checked={mealPlanForm.includes_lunch}
                                  onCheckedChange={(checked) => setMealPlanForm(prev => ({
                                    ...prev,
                                    includes_lunch: checked,
                                    lunch_price: checked ? prev.lunch_price : '0.00'
                                  }))}
                                />
                                <Label htmlFor="includes_lunch" className="font-medium">Lunch</Label>
                              </div>
                              {mealPlanForm.includes_lunch && (
                                <div className="space-y-1">
                                  <Label htmlFor="lunch_price" className="text-xs text-muted-foreground">Price per person (₹)</Label>
                                  <Input
                                    id="lunch_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={mealPlanForm.lunch_price}
                                    onChange={handleMealPlanFormChange}
                                    className="h-8"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Dinner */}
                            <div className="border rounded-lg p-4 space-y-3">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="includes_dinner"
                                  checked={mealPlanForm.includes_dinner}
                                  onCheckedChange={(checked) => setMealPlanForm(prev => ({
                                    ...prev,
                                    includes_dinner: checked,
                                    dinner_price: checked ? prev.dinner_price : '0.00'
                                  }))}
                                />
                                <Label htmlFor="includes_dinner" className="font-medium">Dinner</Label>
                              </div>
                              {mealPlanForm.includes_dinner && (
                                <div className="space-y-1">
                                  <Label htmlFor="dinner_price" className="text-xs text-muted-foreground">Price per person (₹)</Label>
                                  <Input
                                    id="dinner_price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={mealPlanForm.dinner_price}
                                    onChange={handleMealPlanFormChange}
                                    className="h-8"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Total Daily Rate (Read-only) */}
                        <div className="col-span-2 bg-accent/50 rounded-lg p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <Label className="font-medium">Total Daily Rate (auto-calculated)</Label>
                              <p className="text-xs text-muted-foreground">Sum of all included meal prices per person per night</p>
                            </div>
                            <span className="text-2xl font-bold">₹{calculateTotalDailyRate()}</span>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="sort_order">Display Order</Label>
                      <Input
                        id="sort_order"
                        type="number"
                        min="0"
                        value={mealPlanForm.sort_order}
                        onChange={handleMealPlanFormChange}
                      />
                      <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={mealPlanForm.is_active}
                        onCheckedChange={(checked) => setMealPlanForm(prev => ({ ...prev, is_active: checked }))}
                      />
                      <Label htmlFor="is_active" className="font-normal">Active (show in reservation forms)</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveMealPlan} disabled={loading}>
                      <Save size={18} className="mr-2" />
                      {editingMealPlan ? 'Update Meal Plan' : 'Add Meal Plan'}
                    </Button>
                    {editingMealPlan && (
                      <Button variant="outline" onClick={resetMealPlanForm} disabled={loading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Meal Plans</CardTitle>
                  <CardDescription>Manage your meal plan options</CardDescription>
                </CardHeader>
                <CardContent>
                  {mealPlans.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No meal plans created yet</p>
                  ) : (
                    <div className="space-y-2">
                      {mealPlans.map((plan) => (
                        <div
                          key={plan.id}
                          className={cn(
                            "flex items-center justify-between p-4 border rounded-lg",
                            !plan.is_active && "bg-muted/30 opacity-60"
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-sm bg-accent px-2 py-1 rounded">
                                {plan.code}
                              </span>
                              <span className="font-medium">{plan.name}</span>
                              {!plan.is_active && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                  Inactive
                                </span>
                              )}
                              {plan.is_meal_plan === false && (
                                <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                                  Room Only
                                </span>
                              )}
                            </div>
                            {/* Included meals badges */}
                            {plan.is_meal_plan !== false && (plan.includes_breakfast || plan.includes_lunch || plan.includes_dinner) && (
                              <div className="flex gap-1 mt-2">
                                {plan.includes_breakfast && (
                                  <span className="text-xs bg-orange/20 text-orange px-2 py-1 rounded">
                                    Breakfast (₹{parseFloat(plan.breakfast_price || 0).toFixed(0)})
                                  </span>
                                )}
                                {plan.includes_lunch && (
                                  <span className="text-xs bg-success/20 text-success px-2 py-1 rounded">
                                    Lunch (₹{parseFloat(plan.lunch_price || 0).toFixed(0)})
                                  </span>
                                )}
                                {plan.includes_dinner && (
                                  <span className="text-xs bg-purple/20 text-purple px-2 py-1 rounded">
                                    Dinner (₹{parseFloat(plan.dinner_price || 0).toFixed(0)})
                                  </span>
                                )}
                              </div>
                            )}
                            {plan.description && (
                              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Total: ₹{parseFloat(plan.price_per_person).toFixed(2)} per person per night
                              {parseFloat(plan.price_per_person) === 0 && ' (No charge)'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleMealPlanStatus(plan.id)}
                              disabled={loading}
                              title={plan.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {plan.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditMealPlan(plan)}
                              disabled={loading}
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteMealPlan(plan.id)}
                              disabled={loading}
                              className="text-destructive hover:text-destructive/80 hover:bg-accent"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payment Methods Tab */}
          <TabsContent value="paymentmethods">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{editingPaymentMethod ? 'Edit Payment Method' : 'Add New Payment Method'}</CardTitle>
                  <CardDescription>Configure payment options available in the system</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Display Name *</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Cash, Credit Card, UPI"
                        value={paymentMethodForm.name}
                        onChange={handlePaymentMethodFormChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        placeholder="e.g., cash, card, upi"
                        value={paymentMethodForm.code}
                        onChange={handlePaymentMethodFormChange}
                        disabled={!!editingPaymentMethod}
                      />
                      <p className="text-xs text-muted-foreground">Unique identifier (lowercase, no spaces)</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSavePaymentMethod} disabled={loading}>
                      <Save size={18} className="mr-2" />
                      {editingPaymentMethod ? 'Update Method' : 'Add Method'}
                    </Button>
                    {editingPaymentMethod && (
                      <Button variant="outline" onClick={resetPaymentMethodForm} disabled={loading}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Drag to reorder or use arrows. Active methods appear in payment forms.</CardDescription>
                </CardHeader>
                <CardContent>
                  {paymentMethods.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No payment methods configured</p>
                  ) : (
                    <div className="space-y-2">
                      {paymentMethods.map((method, index) => (
                        <div
                          key={method.id}
                          className={cn(
                            "flex items-center justify-between p-4 border rounded-lg",
                            !method.is_active && "bg-muted/30 opacity-60"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMovePaymentMethod(method.id, 'up')}
                                disabled={loading || index === 0}
                              >
                                <ArrowUp size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleMovePaymentMethod(method.id, 'down')}
                                disabled={loading || index === paymentMethods.length - 1}
                              >
                                <ArrowDown size={14} />
                              </Button>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{method.name}</span>
                                <span className="font-mono text-xs bg-accent px-2 py-1 rounded">
                                  {method.code}
                                </span>
                                {!method.is_active && (
                                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleTogglePaymentMethodStatus(method.id, method.is_active)}
                              disabled={loading}
                              title={method.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {method.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPaymentMethod(method)}
                              disabled={loading}
                            >
                              <Edit2 size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePaymentMethod(method.id)}
                              disabled={loading}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-accent"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings Tab */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 bg-accent rounded-lg border">
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