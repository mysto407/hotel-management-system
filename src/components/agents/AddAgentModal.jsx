// src/components/agents/AddAgentModal.jsx
import { useState } from 'react';
import { Save, XCircle } from 'lucide-react';
import { useAgents } from '../../context/AgentContext';

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

export const AddAgentModal = ({ isOpen, onClose, onAgentAdded }) => {
  const { addAgent } = useAgents();
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    email: '',
    phone: '',
    commission: '',
    address: ''
  });

  const resetForm = () => {
    setAgentFormData({
      name: '', email: '', phone: '', commission: '', address: ''
    });
    onClose();
  };

  const handleCreateAgent = async () => {
    if (!agentFormData.name) {
      alert('Please enter agent name');
      return;
    }

    const agentData = {
      name: agentFormData.name,
      email: agentFormData.email || null,
      phone: agentFormData.phone || null,
      commission: agentFormData.commission && agentFormData.commission !== ''
        ? parseFloat(agentFormData.commission)
        : null,
      address: agentFormData.address || null
    };

    try {
      const newAgent = await addAgent(agentData);
      if (newAgent) {
        if (onAgentAdded) {
          onAgentAdded(newAgent);
        }
        resetForm();
      }
    } catch (error) {
      console.error('Error adding agent:', error);
      alert('Failed to add agent: ' + error.message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add New Agent</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 col-span-2">
            <Label htmlFor="name">Agent/Agency Name *</Label>
            <Input
              id="name"
              value={agentFormData.name}
              onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
              placeholder="Travel Agency Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={agentFormData.phone}
              onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
              placeholder="9876543210"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={agentFormData.email}
              onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
              placeholder="agent@example.com"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="commission">Commission (%)</Label>
            <Input
              id="commission"
              type="number"
              value={agentFormData.commission}
              onChange={(e) => setAgentFormData({ ...agentFormData, commission: e.target.value })}
              placeholder="10"
            />
          </div>
          <div className="space-y-2 col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={agentFormData.address}
              onChange={(e) => setAgentFormData({ ...agentFormData, address: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={resetForm}>
              <XCircle size={18} className="mr-2" /> Cancel
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleCreateAgent}>
            <Save size={18} className="mr-2" /> Add Agent
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};