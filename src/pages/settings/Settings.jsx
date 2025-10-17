// ==========================================
// FILE: src/pages/settings/Settings.jsx
// ==========================================
import { useState } from 'react';
import { Save, Building2, Users, DollarSign, Clock, Bell, Globe, Download, Upload, Plus, Edit2, Trash2, XCircle, Calendar } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('hotel');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Hotel Settings State
  const [hotelSettings, setHotelSettings] = useState({
    name: 'Grand Plaza Hotel',
    address: '123 Main Street, Business District',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    pincode: '400001',
    phone: '+91 22 1234 5678',
    email: 'info@grandplaza.com',
    website: 'www.grandplaza.com',
    gstNumber: 'GST123456789',
    description: 'A luxury hotel in the heart of the city'
  });

  // Users State
  const [users, setUsers] = useState([
    { id: 1, username: 'admin', name: 'Admin User', role: 'Admin', email: 'admin@hotel.com', status: 'Active' },
    { id: 2, username: 'frontdesk', name: 'Front Desk User', role: 'Front Desk', email: 'frontdesk@hotel.com', status: 'Active' },
    { id: 3, username: 'accounts', name: 'Accounts User', role: 'Accounts', email: 'accounts@hotel.com', status: 'Active' }
  ]);

  const [userFormData, setUserFormData] = useState({
    username: '',
    name: '',
    email: '',
    role: 'Front Desk',
    password: '',
    status: 'Active'
  });

  // Tax Settings State
  const [taxSettings, setTaxSettings] = useState({
    gstRate: 18,
    serviceChargeRate: 10,
    applyServiceCharge: true,
    taxInclusive: false
  });

  // Room Settings State
  const [roomSettings, setRoomSettings] = useState({
    defaultCheckInTime: '14:00',
    defaultCheckOutTime: '11:00',
    earlyCheckInCharge: 500,
    lateCheckOutCharge: 500,
    extraBedCharge: 1000,
    extraMattressCharge: 500,
    childAge: 12
  });

  // Booking Settings State
  const [bookingSettings, setBookingSettings] = useState({
    advanceBookingDays: 90,
    minBookingDays: 1,
    maxBookingDays: 30,
    cancellationHours: 24,
    cancellationCharge: 50,
    modificationHours: 12,
    requireAdvancePayment: true,
    minimumAdvancePercent: 30
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    bookingConfirmation: true,
    checkInReminder: true,
    checkOutReminder: true,
    paymentReminder: true,
    lowStockAlert: true,
    dailyReport: true
  });

  // System Settings State
  const [systemSettings, setSystemSettings] = useState({
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    timezone: 'Asia/Kolkata',
    language: 'English'
  });

  const handleSaveHotelSettings = () => {
    alert('Hotel settings saved successfully!');
  };

  const handleSaveTaxSettings = () => {
    alert('Tax settings saved successfully!');
  };

  const handleSaveRoomSettings = () => {
    alert('Room settings saved successfully!');
  };

  const handleSaveBookingSettings = () => {
    alert('Booking settings saved successfully!');
  };

  const handleSaveNotificationSettings = () => {
    alert('Notification settings saved successfully!');
  };

  const handleSaveSystemSettings = () => {
    alert('System settings saved successfully!');
  };

  // User Management
  const handleUserSubmit = () => {
    if (editingUser) {
      setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...userFormData } : u));
    } else {
      setUsers([...users, { ...userFormData, id: Date.now() }]);
    }
    resetUserForm();
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      name: '',
      email: '',
      role: 'Front Desk',
      password: '',
      status: 'Active'
    });
    setEditingUser(null);
    setIsUserModalOpen(false);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserFormData(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== userId));
    }
  };

  const handleBackup = () => {
    alert('Backup created successfully! (This would download a backup file in production)');
  };

  const handleExport = () => {
    alert('Data exported successfully! (This would download a CSV/Excel file in production)');
  };

  const tabs = [
    { id: 'hotel', label: 'Hotel Profile', icon: Building2 },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'tax', label: 'Tax Settings', icon: DollarSign },
    { id: 'room', label: 'Room Settings', icon: Clock },
    { id: 'booking', label: 'Booking Settings', icon: Calendar },
    { id: 'notifications', label: 'Notifications', icon: Bell },
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
                    value={hotelSettings.name}
                    onChange={(e) => setHotelSettings({...hotelSettings, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    value={hotelSettings.phone}
                    onChange={(e) => setHotelSettings({...hotelSettings, phone: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    value={hotelSettings.email}
                    onChange={(e) => setHotelSettings({...hotelSettings, email: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Website</label>
                  <input
                    type="text"
                    value={hotelSettings.website}
                    onChange={(e) => setHotelSettings({...hotelSettings, website: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Address *</label>
                  <input
                    type="text"
                    value={hotelSettings.address}
                    onChange={(e) => setHotelSettings({...hotelSettings, address: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={hotelSettings.city}
                    onChange={(e) => setHotelSettings({...hotelSettings, city: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <input
                    type="text"
                    value={hotelSettings.state}
                    onChange={(e) => setHotelSettings({...hotelSettings, state: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Country *</label>
                  <input
                    type="text"
                    value={hotelSettings.country}
                    onChange={(e) => setHotelSettings({...hotelSettings, country: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Pincode *</label>
                  <input
                    type="text"
                    value={hotelSettings.pincode}
                    onChange={(e) => setHotelSettings({...hotelSettings, pincode: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    value={hotelSettings.gstNumber}
                    onChange={(e) => setHotelSettings({...hotelSettings, gstNumber: e.target.value})}
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    value={hotelSettings.description}
                    onChange={(e) => setHotelSettings({...hotelSettings, description: e.target.value})}
                    rows="3"
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveHotelSettings} className="btn-primary">
                  <Save size={18} /> Save Hotel Settings
                </button>
              </div>
            </Card>
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <Card title="System Users">
              <div className="settings-section-header">
                <p>Manage users who can access the system</p>
                <button onClick={() => setIsUserModalOpen(true)} className="btn-primary">
                  <Plus size={18} /> Add User
                </button>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user.id}>
                        <td><strong>{user.username}</strong></td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td><span className="role-badge">{user.role}</span></td>
                        <td>
                          <span className={`status-badge ${user.status === 'Active' ? 'status-available' : 'status-blocked'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button onClick={() => handleEditUser(user)} className="btn-icon btn-edit">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="btn-icon btn-delete">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                    value={taxSettings.gstRate}
                    onChange={(e) => setTaxSettings({...taxSettings, gstRate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Service Charge (%)</label>
                  <input
                    type="number"
                    value={taxSettings.serviceChargeRate}
                    onChange={(e) => setTaxSettings({...taxSettings, serviceChargeRate: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taxSettings.applyServiceCharge}
                      onChange={(e) => setTaxSettings({...taxSettings, applyServiceCharge: e.target.checked})}
                    />
                    <span>Apply Service Charge</span>
                  </label>
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={taxSettings.taxInclusive}
                      onChange={(e) => setTaxSettings({...taxSettings, taxInclusive: e.target.checked})}
                    />
                    <span>Tax Inclusive Pricing</span>
                  </label>
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveTaxSettings} className="btn-primary">
                  <Save size={18} /> Save Tax Settings
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
                    value={roomSettings.defaultCheckInTime}
                    onChange={(e) => setRoomSettings({...roomSettings, defaultCheckInTime: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Default Check-out Time</label>
                  <input
                    type="time"
                    value={roomSettings.defaultCheckOutTime}
                    onChange={(e) => setRoomSettings({...roomSettings, defaultCheckOutTime: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Early Check-in Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.earlyCheckInCharge}
                    onChange={(e) => setRoomSettings({...roomSettings, earlyCheckInCharge: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Late Check-out Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.lateCheckOutCharge}
                    onChange={(e) => setRoomSettings({...roomSettings, lateCheckOutCharge: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Extra Bed Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.extraBedCharge}
                    onChange={(e) => setRoomSettings({...roomSettings, extraBedCharge: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Extra Mattress Charge (₹)</label>
                  <input
                    type="number"
                    value={roomSettings.extraMattressCharge}
                    onChange={(e) => setRoomSettings({...roomSettings, extraMattressCharge: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Child Age Limit (years)</label>
                  <input
                    type="number"
                    value={roomSettings.childAge}
                    onChange={(e) => setRoomSettings({...roomSettings, childAge: parseInt(e.target.value)})}
                  />
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveRoomSettings} className="btn-primary">
                  <Save size={18} /> Save Room Settings
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
                    value={bookingSettings.advanceBookingDays}
                    onChange={(e) => setBookingSettings({...bookingSettings, advanceBookingDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Booking Days</label>
                  <input
                    type="number"
                    value={bookingSettings.minBookingDays}
                    onChange={(e) => setBookingSettings({...bookingSettings, minBookingDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Maximum Booking Days</label>
                  <input
                    type="number"
                    value={bookingSettings.maxBookingDays}
                    onChange={(e) => setBookingSettings({...bookingSettings, maxBookingDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Cancellation Notice (hours)</label>
                  <input
                    type="number"
                    value={bookingSettings.cancellationHours}
                    onChange={(e) => setBookingSettings({...bookingSettings, cancellationHours: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Cancellation Charge (%)</label>
                  <input
                    type="number"
                    value={bookingSettings.cancellationCharge}
                    onChange={(e) => setBookingSettings({...bookingSettings, cancellationCharge: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Modification Notice (hours)</label>
                  <input
                    type="number"
                    value={bookingSettings.modificationHours}
                    onChange={(e) => setBookingSettings({...bookingSettings, modificationHours: parseInt(e.target.value)})}
                  />
                </div>
                <div className="form-group">
                  <label>Minimum Advance Payment (%)</label>
                  <input
                    type="number"
                    value={bookingSettings.minimumAdvancePercent}
                    onChange={(e) => setBookingSettings({...bookingSettings, minimumAdvancePercent: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={bookingSettings.requireAdvancePayment}
                      onChange={(e) => setBookingSettings({...bookingSettings, requireAdvancePayment: e.target.checked})}
                    />
                    <span>Require Advance Payment</span>
                  </label>
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveBookingSettings} className="btn-primary">
                  <Save size={18} /> Save Booking Settings
                </button>
              </div>
            </Card>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <Card title="Notification Preferences">
              <div className="notification-settings">
                <div className="notification-group">
                  <h4>Communication Channels</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.emailNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, emailNotifications: e.target.checked})}
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.smsNotifications}
                      onChange={(e) => setNotificationSettings({...notificationSettings, smsNotifications: e.target.checked})}
                    />
                    <span>SMS Notifications</span>
                  </label>
                </div>

                <div className="notification-group">
                  <h4>Guest Notifications</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.bookingConfirmation}
                      onChange={(e) => setNotificationSettings({...notificationSettings, bookingConfirmation: e.target.checked})}
                    />
                    <span>Booking Confirmation</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.checkInReminder}
                      onChange={(e) => setNotificationSettings({...notificationSettings, checkInReminder: e.target.checked})}
                    />
                    <span>Check-in Reminder</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.checkOutReminder}
                      onChange={(e) => setNotificationSettings({...notificationSettings, checkOutReminder: e.target.checked})}
                    />
                    <span>Check-out Reminder</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.paymentReminder}
                      onChange={(e) => setNotificationSettings({...notificationSettings, paymentReminder: e.target.checked})}
                    />
                    <span>Payment Reminder</span>
                  </label>
                </div>

                <div className="notification-group">
                  <h4>System Alerts</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.lowStockAlert}
                      onChange={(e) => setNotificationSettings({...notificationSettings, lowStockAlert: e.target.checked})}
                    />
                    <span>Low Stock Alerts</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={notificationSettings.dailyReport}
                      onChange={(e) => setNotificationSettings({...notificationSettings, dailyReport: e.target.checked})}
                    />
                    <span>Daily Summary Report</span>
                  </label>
                </div>
              </div>
              <div className="settings-actions">
                <button onClick={handleSaveNotificationSettings} className="btn-primary">
                  <Save size={18} /> Save Notification Settings
                </button>
              </div>
            </Card>
          )}

          {/* System Settings Tab */}
          {activeTab === 'system' && (
            <>
              <Card title="System Preferences">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Currency</label>
                    <select
                      value={systemSettings.currency}
                      onChange={(e) => setSystemSettings({...systemSettings, currency: e.target.value})}
                    >
                      <option value="INR">INR - Indian Rupee</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="GBP">GBP - British Pound</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Currency Symbol</label>
                    <input
                      type="text"
                      value={systemSettings.currencySymbol}
                      onChange={(e) => setSystemSettings({...systemSettings, currencySymbol: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Date Format</label>
                    <select
                      value={systemSettings.dateFormat}
                      onChange={(e) => setSystemSettings({...systemSettings, dateFormat: e.target.value})}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Time Format</label>
                    <select
                      value={systemSettings.timeFormat}
                      onChange={(e) => setSystemSettings({...systemSettings, timeFormat: e.target.value})}
                    >
                      <option value="24h">24 Hour</option>
                      <option value="12h">12 Hour (AM/PM)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Timezone</label>
                    <select
                      value={systemSettings.timezone}
                      onChange={(e) => setSystemSettings({...systemSettings, timezone: e.target.value})}
                    >
                      <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                      <option value="America/New_York">America/New York (EST)</option>
                      <option value="Europe/London">Europe/London (GMT)</option>
                      <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Language</label>
                    <select
                      value={systemSettings.language}
                      onChange={(e) => setSystemSettings({...systemSettings, language: e.target.value})}
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
                <div className="settings-actions">
                  <button onClick={handleSaveSystemSettings} className="btn-primary">
                    <Save size={18} /> Save System Settings
                  </button>
                </div>
              </Card>

              <Card title="Data Management">
                <div className="data-management">
                  <div className="data-action">
                    <div>
                      <h4>Backup Database</h4>
                      <p>Create a complete backup of all system data</p>
                    </div>
                    <button onClick={handleBackup} className="btn-primary">
                      <Download size={18} /> Create Backup
                    </button>
                  </div>
                  <div className="data-action">
                    <div>
                      <h4>Export Data</h4>
                      <p>Export all data to CSV/Excel format</p>
                    </div>
                    <button onClick={handleExport} className="btn-secondary">
                      <Upload size={18} /> Export Data
                    </button>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* User Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={resetUserForm}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <div className="form-grid">
          <div className="form-group">
            <label>Username *</label>
            <input
              type="text"
              value={userFormData.username}
              onChange={(e) => setUserFormData({...userFormData, username: e.target.value})}
              placeholder="username"
            />
          </div>
          <div className="form-group">
            <label>Full Name *</label>
            <input
              type="text"
              value={userFormData.name}
              onChange={(e) => setUserFormData({...userFormData, name: e.target.value})}
              placeholder="John Doe"
            />
          </div>
          <div className="form-group full-width">
            <label>Email *</label>
            <input
              type="email"
              value={userFormData.email}
              onChange={(e) => setUserFormData({...userFormData, email: e.target.value})}
              placeholder="user@hotel.com"
            />
          </div>
          <div className="form-group">
            <label>Role *</label>
            <select
              value={userFormData.role}
              onChange={(e) => setUserFormData({...userFormData, role: e.target.value})}
            >
              <option value="Admin">Admin</option>
              <option value="Front Desk">Front Desk</option>
              <option value="Accounts">Accounts</option>
              <option value="Store">Store</option>
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={userFormData.status}
              onChange={(e) => setUserFormData({...userFormData, status: e.target.value})}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
          <div className="form-group full-width">
            <label>Password {!editingUser && '*'}</label>
            <input
              type="password"
              value={userFormData.password}
              onChange={(e) => setUserFormData({...userFormData, password: e.target.value})}
              placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetUserForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleUserSubmit} className="btn-primary">
            <Save size={18} /> Save User
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;