// src/pages/settings/Settings.jsx
import { useState, useEffect } from 'react';
import { Save, Building2, DollarSign, Clock, Bell, Globe, Download, Calendar } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { supabase, getHotelSettings, updateHotelSetting } from '../../lib/supabase';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('hotel');
  const [loading, setLoading] = useState(false);

  // Hotel Settings State
  const [hotelSettings, setHotelSettings] = useState({
    hotel_name: 'Grand Plaza Hotel',
    hotel_address: '123 Main Street, Business District',
    hotel_city: 'Mumbai',
    hotel_state: 'Maharashtra',
    hotel_country: 'India',
    hotel_pincode: '400001',
    hotel_phone: '+91 22 1234 5678',
    hotel_email: 'info@grandplaza.com',
    hotel_website: 'www.grandplaza.com',
    hotel_gst: '',
    hotel_description: 'A luxury hotel in the heart of the city'
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
        // Convert array of settings to object
        const settingsObj = {};
        data.forEach(setting => {
          settingsObj[setting.setting_key] = setting.setting_value;
        });
        
        // Update state with loaded settings
        const hotelKeys = Object.keys(hotelSettings);
        const taxKeys = Object.keys(taxSettings);
        const roomKeys = Object.keys(roomSettings);
        const bookingKeys = Object.keys(bookingSettings);

        const newHotelSettings = {};
        const newTaxSettings = {};
        const newRoomSettings = {};
        const newBookingSettings = {};

        hotelKeys.forEach(key => {
          if (settingsObj[key]) newHotelSettings[key] = settingsObj[key];
        });
        taxKeys.forEach(key => {
          if (settingsObj[key]) newTaxSettings[key] = settingsObj[key];
        });
        roomKeys.forEach(key => {
          if (settingsObj[key]) newRoomSettings[key] = settingsObj[key];
        });
        bookingKeys.forEach(key => {
          if (settingsObj[key]) newBookingSettings[key] = settingsObj[key];
        });

        if (Object.keys(newHotelSettings).length > 0) setHotelSettings(prev => ({ ...prev, ...newHotelSettings }));
        if (Object.keys(newTaxSettings).length > 0) setTaxSettings(prev => ({ ...prev, ...newTaxSettings }));
        if (Object.keys(newRoomSettings).length > 0) setRoomSettings(prev => ({ ...prev, ...newRoomSettings }));
        if (Object.keys(newBookingSettings).length > 0) setBookingSettings(prev => ({ ...prev, ...newBookingSettings }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (settingsObject) => {
    setLoading(true);
    try {
      // Save each setting individually
      for (const [key, value] of Object.entries(settingsObject)) {
        const { error } = await updateHotelSetting(key, value);
        if (error) throw error;
      }
      alert('Settings saved successfully!');
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
      // Export all data as JSON
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

  const tabs = [
    { id: 'hotel', label: 'Hotel Profile', icon: Building2 },
    { id: 'tax', label: 'Tax Settings', icon: DollarSign },
    { id: 'room', label: 'Room Settings', icon: Clock },
    { id: 'booking', label: 'Booking Settings', icon: Calendar },
    { id: 'system', label: 'System', icon: Globe }
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="settings-container">
        {/* Tabs */}
        <div className="settings-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="settings-content">
          {/* Hotel Profile Tab */}
          {activeTab === 'hotel' && (
            <Card title="Hotel Information">
              <div className="form-grid">
                <div className="form-group">
                  <label>Hotel Name *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_name}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={hotelSettings.hotel_phone}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={hotelSettings.hotel_email}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_website}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_website: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_address}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_address: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_city}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_city: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_state}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_state: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Country *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_country}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_country: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_pincode}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_pincode: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    value={hotelSettings.hotel_gst}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_gst: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={hotelSettings.hotel_description}
                    onChange={(e) => setHotelSettings({...hotelSettings, hotel_description: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveHotelSettings} className="btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Hotel Settings'}
                </button>
              </div>
            </Card>
          )}

          {/* Tax Settings Tab */}
          {activeTab === 'tax' && (
            <Card title="Tax Configuration">
              <div className="form-grid">
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <input
                    type="number"
                    value={taxSettings.gst_rate}
                    onChange={(e) => setTaxSettings({...taxSettings, gst_rate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Service Charge (%)</label>
                  <input
                    type="number"
                    value={taxSettings.service_charge_rate}
                    onChange={(e) => setTaxSettings({...taxSettings, service_charge_rate: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taxSettings.apply_service_charge === 'true'}
                      onChange={(e) => setTaxSettings({...taxSettings, apply_service_charge: e.target.checked ? 'true' : 'false'})}
                    />
                    <span>Apply Service Charge</span>
                  </label>
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taxSettings.tax_inclusive === 'true'}
                      onChange={(e) => setTaxSettings({...taxSettings, tax_inclusive: e.target.checked ? 'true' : 'false'})}
                    />
                    <span>Tax Inclusive Pricing</span>
                  </label>
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveTaxSettings} className="btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Tax Settings'}
                </button>
              </div>
            </Card>
          )}

          {/* Room Settings Tab */}
          {activeTab === 'room' && (
            <Card title="Room Configuration">
              <div className="form-grid">
                <div className="form-group">
                  <label>Default Check-in Time</label>
                  <input
                    type="time"
                    value={roomSettings.default_checkin_time}
                    onChange={(e) => setRoomSettings({...roomSettings, default_checkin_time: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Default Check-out Time</label>
                  <input
                    type="time"
                    value={roomSettings.default_checkout_time}
                    onChange={(e) => setRoomSettings({...roomSettings, default_checkout_time: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Early Check-in Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.early_checkin_charge}
                    onChange={(e) => setRoomSettings({...roomSettings, early_checkin_charge: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Late Check-out Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.late_checkout_charge}
                    onChange={(e) => setRoomSettings({...roomSettings, late_checkout_charge: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Extra Bed Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.extra_bed_charge}
                    onChange={(e) => setRoomSettings({...roomSettings, extra_bed_charge: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Child Age Limit (years)</label>
                  <input
                    type="number"
                    value={roomSettings.child_age_limit}
                    onChange={(e) => setRoomSettings({...roomSettings, child_age_limit: e.target.value})}
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveRoomSettings} className="btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Room Settings'}
                </button>
              </div>
            </Card>
          )}

          {/* Booking Settings Tab */}
          {activeTab === 'booking' && (
            <Card title="Booking Configuration">
              <div className="form-grid">
                <div className="form-group">
                  <label>Advance Booking Days</label>
                  <input
                    type="number"
                    value={bookingSettings.advance_booking_days}
                    onChange={(e) => setBookingSettings({...bookingSettings, advance_booking_days: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Booking Days</label>
                  <input
                    type="number"
                    value={bookingSettings.min_booking_days}
                    onChange={(e) => setBookingSettings({...bookingSettings, min_booking_days: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Booking Days</label>
                  <input
                    type="number"
                    value={bookingSettings.max_booking_days}
                    onChange={(e) => setBookingSettings({...bookingSettings, max_booking_days: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Cancellation Notice (hours)</label>
                  <input
                    type="number"
                    value={bookingSettings.cancellation_hours}
                    onChange={(e) => setBookingSettings({...bookingSettings, cancellation_hours: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Cancellation Charge (%)</label>
                  <input
                    type="number"
                    value={bookingSettings.cancellation_charge_percent}
                    onChange={(e) => setBookingSettings({...bookingSettings, cancellation_charge_percent: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Advance Payment (%)</label>
                  <input
                    type="number"
                    value={bookingSettings.minimum_advance_percent}
                    onChange={(e) => setBookingSettings({...bookingSettings, minimum_advance_percent: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={bookingSettings.require_advance_payment === 'true'}
                      onChange={(e) => setBookingSettings({...bookingSettings, require_advance_payment: e.target.checked ? 'true' : 'false'})}
                    />
                    <span>Require Advance Payment</span>
                  </label>
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveBookingSettings} className="btn-primary" disabled={loading}>
                  <Save size={18} /> {loading ? 'Saving...' : 'Save Booking Settings'}
                </button>
              </div>
            </Card>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <>
              <Card title="Data Management">
                <div className="data-management">
                  <div className="data-action">
                    <div>
                      <h4>Backup Database</h4>
                      <p>Create a complete backup of all system data as JSON</p>
                    </div>
                    <button onClick={handleBackup} className="btn-primary" disabled={loading}>
                      <Download size={18} /> Create Backup
                    </button>
                  </div>
                  <div className="data-action">
                    <div>
                      <h4>Current User</h4>
                      <p><strong>Name:</strong> {user?.name}</p>
                      <p><strong>Role:</strong> {user?.role}</p>
                      <p><strong>Email:</strong> {user?.email || 'Not set'}</p>
                    </div>
                  </div>
                </div>
              </Card>

              <Card title="About">
                <div style={{ padding: '16px' }}>
                  <h4 style={{ marginBottom: '12px' }}>Hotel Management System</h4>
                  <p style={{ color: '#6b7280', marginBottom: '8px' }}>Version 1.0.0</p>
                  <p style={{ color: '#6b7280', marginBottom: '8px' }}>Built with React + Supabase</p>
                  <p style={{ color: '#6b7280' }}>© 2025 All rights reserved</p>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;