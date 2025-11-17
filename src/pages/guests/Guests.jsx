// src/pages/guests/Guests.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Search, Filter, Eye, Star, Award, Briefcase, TrendingUp, Users } from 'lucide-react';
import { useGuests } from '../../context/GuestContext';
import { useReservations } from '../../context/ReservationContext';
import { useRooms } from '../../context/RoomContext';
import { useConfirm } from '@/context/AlertContext';

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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const Guests = () => {
  const {
    guests,
    idProofTypes,
    guestTypes,
    addGuest,
    updateGuest,
    deleteGuest,
    getGuestsByType,
    getReturningGuests,
    getTopGuests
  } = useGuests();

  const { reservations } = useReservations();
  const { rooms } = useRooms();
  const confirm = useConfirm();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
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
    preferences: '',
    notes: ''
  });

  // Filter guests
  const filteredGuests = guests
    .filter(guest => filterType === 'all' || guest.guest_type === filterType)
    .filter(guest =>
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.phone.includes(searchTerm)
    );

  const returningGuests = getReturningGuests();
  const topGuests = getTopGuests(5);

  const handleSubmit = async () => {
    if (editingGuest) {
      await updateGuest(editingGuest.id, formData);
    } else {
      await addGuest(formData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
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
      preferences: '',
      notes: ''
    });
    setEditingGuest(null);
    setIsModalOpen(false);
  };

  const handleEdit = (guest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone,
      id_proof_type: guest.id_proof_type,
      id_proof_number: guest.id_proof_number,
      address: guest.address || '',
      city: guest.city || '',
      state: guest.state || '',
      country: guest.country || 'India',
      date_of_birth: guest.date_of_birth || '',
      guest_type: guest.guest_type,
      preferences: guest.preferences || '',
      notes: guest.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (guestId) => {
    const confirmed = await confirm({
      title: 'Delete Guest',
      message: 'Are you sure you want to delete this guest? This action cannot be undone.',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteGuest(guestId);
    }
  };

  const viewDetails = (guest) => {
    setSelectedGuest(guest);
    setIsDetailsModalOpen(true);
  };

  const getGuestBookings = (guestId) => {
    return reservations.filter(r => r.guest_id === guestId);
  };

  const getGuestTypeIcon = (type) => {
    switch(type) {
      case 'VIP': return <Star size={16} className="text-yellow-500 dark:text-yellow-400" />;
      case 'Corporate': return <Briefcase size={16} className="text-blue-600 dark:text-blue-400" />;
      default: return null;
    }
  };

  const getGuestTypeVariant = (type) => {
    switch(type) {
      case 'VIP': return 'warning';
      case 'Corporate': return 'info';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Guest Management</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={20} className="mr-2" /> Add Guest
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guests</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{guests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">VIP Guests</CardTitle>
            <Star className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getGuestsByType('VIP').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corporate Guests</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getGuestsByType('Corporate').length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returning Guests</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{returningGuests.length}</div>
            <p className="text-xs text-muted-foreground">
              {guests.length > 0 ? ((returningGuests.length / guests.length) * 100).toFixed(0) : 0}% retention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative w-full md:w-1/3">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All Guests" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Guests</SelectItem>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="VIP">VIP</SelectItem>
            <SelectItem value="Corporate">Corporate</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Guests Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Total Bookings</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Last Visit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGuests.map(guest => (
                <TableRow key={guest.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{guest.name}</span>
                      {guest.guest_type !== 'Regular' && getGuestTypeIcon(guest.guest_type)}
                    </div>
                    <div className="text-xs text-muted-foreground">{guest.city}, {guest.state}</div>
                  </TableCell>
                  <TableCell>
                    <div>{guest.phone}</div>
                    <div className="text-xs text-muted-foreground">{guest.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getGuestTypeVariant(guest.guest_type)}>
                      {guest.guest_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{guest.total_bookings || 0}</TableCell>
                  <TableCell>₹{(guest.total_spent || 0).toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                      <Award size={16} />
                      {guest.loyalty_points || 0}
                    </div>
                  </TableCell>
                  <TableCell>{guest.last_visit || 'Never'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button onClick={() => viewDetails(guest)} variant="ghost" size="icon" title="View Details">
                        <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button onClick={() => handleEdit(guest)} variant="ghost" size="icon" title="Edit">
                        <Edit2 size={16} className="text-blue-600 dark:text-blue-400" />
                      </Button>
                      <Button onClick={() => handleDelete(guest.id)} variant="ghost" size="icon" title="Delete">
                        <Trash2 size={16} className="text-red-600 dark:text-red-400" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Guests */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Guests by Spending</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {topGuests.map((guest, index) => (
            <div key={guest.id} className="flex items-center gap-4 p-3 bg-accent rounded-md">
              <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                #{index + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{guest.name}</div>
                <div className="text-sm text-muted-foreground">{guest.total_bookings || 0} bookings</div>
              </div>
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                ₹{(guest.total_spent || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add/Edit Guest Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGuest ? 'Edit Guest' : 'Add New Guest'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="guestName">Full Name *</Label>
              <Input
                id="guestName"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestPhone">Phone *</Label>
              <Input
                id="guestPhone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestEmail">Email</Label>
              <Input
                id="guestEmail"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestDob">Date of Birth</Label>
              <Input
                id="guestDob"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestIdType">ID Proof Type *</Label>
              <Select value={formData.id_proof_type} onValueChange={(value) => setFormData({...formData, id_proof_type: value})}>
                <SelectTrigger id="guestIdType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {idProofTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestIdNumber">ID Proof Number *</Label>
              <Input
                id="guestIdNumber"
                type="text"
                value={formData.id_proof_number}
                onChange={(e) => setFormData({...formData, id_proof_number: e.target.value})}
                placeholder="AADHAR-1234"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="guestAddress">Address</Label>
              <Input
                id="guestAddress"
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="123 Main Street"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCity">City</Label>
              <Input
                id="guestCity"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({...formData, city: e.target.value})}
                placeholder="Mumbai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestState">State</Label>
              <Input
                id="guestState"
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({...formData, state: e.target.value})}
                placeholder="Maharashtra"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestCountry">Country</Label>
              <Input
                id="guestCountry"
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({...formData, country: e.target.value})}
                placeholder="India"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="guestType">Guest Type</Label>
              <Select value={formData.guest_type} onValueChange={(value) => setFormData({...formData, guest_type: value})}>
                <SelectTrigger id="guestType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {guestTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="guestPreferences">Preferences</Label>
              <Textarea
                id="guestPreferences"
                value={formData.preferences}
                onChange={(e) => setFormData({...formData, preferences: e.target.value})}
                rows="2"
                placeholder="e.g., Non-smoking rooms, Early check-in"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="guestNotes">Notes</Label>
              <Textarea
                id="guestNotes"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows="2"
                placeholder="Additional notes about the guest"
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
              <Save size={18} className="mr-2" /> Save Guest
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Guest Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Guest Details</DialogTitle>
          </DialogHeader>
          {selectedGuest && (
            <div className="space-y-4 py-4">
              <div className="flex justify-between items-start p-4 bg-accent rounded-lg">
                <div>
                  <h2 className="text-xl font-bold">{selectedGuest.name}</h2>
                  <Badge variant={getGuestTypeVariant(selectedGuest.guest_type)}>
                    {selectedGuest.guest_type}
                  </Badge>
                </div>
                <div className="flex gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">{selectedGuest.total_bookings || 0}</div>
                    <div className="text-xs text-muted-foreground">Bookings</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">₹{(selectedGuest.total_spent || 0).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Total Spent</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">{selectedGuest.loyalty_points || 0}</div>
                    <div className="text-xs text-muted-foreground">Points</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Contact Information</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Phone:</strong> {selectedGuest.phone}</p>
                    <p><strong>Email:</strong> {selectedGuest.email || 'N/A'}</p>
                    <p><strong>Date of Birth:</strong> {selectedGuest.date_of_birth || 'Not provided'}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">ID Proof</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Type:</strong> {selectedGuest.id_proof_type}</p>
                    <p><strong>Number:</strong> {selectedGuest.id_proof_number}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Address</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>{selectedGuest.address || 'N/A'}</p>
                    <p>{selectedGuest.city}, {selectedGuest.state}</p>
                    <p>{selectedGuest.country}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="text-base">Guest Stats</CardTitle></CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p><strong>Member Since:</strong> {selectedGuest.created_at?.split('T')[0]}</p>
                    <p><strong>Last Visit:</strong> {selectedGuest.last_visit || 'Never'}</p>
                  </CardContent>
                </Card>
              </div>

              {selectedGuest.preferences && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
                  <CardContent><p>{selectedGuest.preferences}</p></CardContent>
                </Card>
              )}

              {selectedGuest.notes && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
                  <CardContent><p>{selectedGuest.notes}</p></CardContent>
                </Card>
              )}

              <h4 className="font-semibold pt-4 border-t">Booking History</h4>
              <div className="border rounded-md max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getGuestBookings(selectedGuest.id).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">No booking history available</TableCell>
                      </TableRow>
                    )}
                    {getGuestBookings(selectedGuest.id).map(booking => {
                      const room = rooms.find(r => r.id === booking.room_id);
                      return (
                        <TableRow key={booking.id}>
                          <TableCell>{room?.room_number || 'N/A'}</TableCell>
                          <TableCell>{booking.check_in_date}</TableCell>
                          <TableCell>{booking.check_out_date}</TableCell>
                          <TableCell>₹{booking.total_amount}</TableCell>
                          <TableCell>
                            <Badge variant={booking.status === 'Checked-out' ? 'success' : (booking.status === 'Cancelled' ? 'destructive' : 'secondary')}>
                              {booking.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Guests;