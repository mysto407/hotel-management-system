// src/pages/agents/Agents.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Phone, Mail, Percent, MapPin, TrendingUp } from 'lucide-react';
import { Modal } from '../../components/common/Modal'; // This is now our shadcn wrapper
import { useAgents } from '../../context/AgentContext';
import { useReservations } from '../../context/ReservationContext';
import { useConfirm } from '@/context/AlertContext';

// Import shadcn-ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dialog"; // We use Dialog directly for the Add/Edit form
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const Agents = () => {
  const { agents, addAgent, updateAgent, deleteAgent } = useAgents();
  const { reservations } = useReservations();
  const confirm = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission: '',
    address: ''
  });

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('Please enter agent name');
      return;
    }

    const agentData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      commission: formData.commission && formData.commission !== '' ? parseFloat(formData.commission) : null,
      address: formData.address || null
    };

    if (editingAgent) {
      await updateAgent(editingAgent.id, agentData);
    } else {
      await addAgent(agentData);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      commission: '',
      address: ''
    });
    setEditingAgent(null);
    setIsModalOpen(false);
  };

  const handleEdit = (agent) => {
    setEditingAgent(agent);
    setFormData({
      name: agent.name,
      email: agent.email || '',
      phone: agent.phone || '',
      commission: agent.commission || '',
      address: agent.address || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Agent',
      message: 'Are you sure you want to delete this agent?',
      variant: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      await deleteAgent(id);
    }
  };

  // Calculate statistics for each agent
  const getAgentStats = (agentId) => {
    const agentReservations = reservations.filter(r => r.agent_id === agentId);
    const totalBookings = agentReservations.length;
    const activeBookings = agentReservations.filter(r => 
      r.status === 'Confirmed' || r.status === 'Checked-in'
    ).length;
    const totalRevenue = agentReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    
    return {
      totalBookings,
      activeBookings,
      totalRevenue
    };
  };

  // Calculate total commission earned
  const calculateCommission = (agentId, agent) => {
    if (!agent.commission) return null; // Return null if no commission set
    const agentReservations = reservations.filter(r => r.agent_id === agentId);
    const totalRevenue = agentReservations.reduce((sum, r) => sum + (r.total_amount || 0), 0);
    const commission = agent.commission || 0;
    return (totalRevenue * commission) / 100;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Travel Agents</h1>
        <Button onClick={() => { setEditingAgent(null); setIsModalOpen(true); }}>
          <Plus size={20} className="mr-2" /> Add Agent
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{agents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {reservations.filter(r => r.booking_source === 'agent').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{reservations
                .filter(r => r.booking_source === 'agent')
                .reduce((sum, r) => sum + (r.total_amount || 0), 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{agents
                .reduce((sum, agent) => {
                  const commission = calculateCommission(agent.id, agent);
                  return sum + (commission || 0);
                }, 0)
                .toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agent Name</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Total Bookings</TableHead>
                <TableHead>Active Bookings</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Commission Earned</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-48">
                     <div className="flex flex-col items-center justify-center gap-4">
                        <Phone size={40} className="text-muted-foreground" />
                        <h3 className="text-lg font-semibold">No Agents Yet</h3>
                        <p className="text-sm text-muted-foreground">Start by adding your first travel agent or agency</p>
                        <Button onClick={() => setIsModalOpen(true)}>
                          <Plus size={18} className="mr-2" /> Add Your First Agent
                        </Button>
                      </div>
                  </TableCell>
                </TableRow>
              )}
              {agents.map(agent => {
                const stats = getAgentStats(agent.id);
                const commissionEarned = calculateCommission(agent.id, agent);

                return (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">
                      {agent.name}
                      {agent.address && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin size={12} />
                          {agent.address}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.phone && (
                        <div className="flex items-center gap-2 mb-1">
                          <Phone size={14} className="text-muted-foreground" />
                          <span>{agent.phone}</span>
                        </div>
                      )}
                      {agent.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail size={14} />
                          <span>{agent.email}</span>
                        </div>
                      )}
                      {!agent.phone && !agent.email && (
                        <span className="text-sm text-muted-foreground italic">No contact info</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {agent.commission ? (
                        <div className="flex items-center gap-1 font-semibold text-violet-600">
                          <Percent size={14} />
                          {agent.commission}%
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">Not set</span>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-lg">{stats.totalBookings}</TableCell>
                    <TableCell>
                      <Badge variant={stats.activeBookings > 0 ? "destructive" : "secondary"}>
                        {stats.activeBookings} Active
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-green-700">
                      ₹{stats.totalRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {commissionEarned !== null ? (
                        <div className="flex items-center gap-1 font-bold text-violet-700 text-base">
                          <TrendingUp size={16} />
                          ₹{commissionEarned.toLocaleString()}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">No commission</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(agent)}>
                          <Edit2 size={16} className="text-blue-600" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(agent.id)}>
                          <Trash2 size={16} className="text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Agent Modal (using Dialog) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAgent ? 'Edit Agent' : 'Add New Agent'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Agent/Agency Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Travel Agency Name or Agent Name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="9876543210"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="agent@example.com"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="commission">Commission Rate (%) <span className="text-muted-foreground font-normal">- Optional</span></Label>
              <Input
                id="commission"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commission}
                onChange={(e) => setFormData({...formData, commission: e.g.target.value})}
                placeholder="e.g., 10.00"
              />
              <p className="text-sm text-muted-foreground">
                Commission percentage this agent receives on bookings (leave empty if not applicable)
              </p>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows="2"
                placeholder="Complete address of the agency..."
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
              <Save size={18} className="mr-2" /> {editingAgent ? 'Update Agent' : 'Add Agent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Agents;