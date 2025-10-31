// src/components/agents/AddAgentModal.jsx
import { useState } from 'react';
import { Save, XCircle } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useAgents } from '../../context/AgentContext';

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
      name: '',
      email: '',
      phone: '',
      commission: '',
      address: ''
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
    <Modal
      isOpen={isOpen}
      onClose={resetForm}
      title="Add New Agent"
    >
      <div className="form-grid">
        <div className="form-group full-width">
          <label>Agent/Agency Name *</label>
          <input
            type="text"
            value={agentFormData.name}
            onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
            placeholder="Travel Agency Name"
          />
        </div>
        <div className="form-group">
          <label>Phone</label>
          <input
            type="tel"
            value={agentFormData.phone}
            onChange={(e) => setAgentFormData({ ...agentFormData, phone: e.target.value })}
            placeholder="9876543210"
          />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={agentFormData.email}
            onChange={(e) => setAgentFormData({ ...agentFormData, email: e.target.value })}
            placeholder="agent@example.com"
          />
        </div>
        <div className="form-group">
          <label>Commission (%)</label>
          <input
            type="number"
            value={agentFormData.commission}
            onChange={(e) => setAgentFormData({ ...agentFormData, commission: e.target.value })}
            placeholder="10"
          />
        </div>
        <div className="form-group full-width">
          <label>Address</label>
          <input
            type="text"
            value={agentFormData.address}
            onChange={(e) => setAgentFormData({ ...agentFormData, address: e.target.value })}
            placeholder="123 Main Street"
          />
        </div>
      </div>
      <div className="modal-actions">
        <button onClick={resetForm} className="btn-secondary">
          <XCircle size={18} /> Cancel
        </button>
        <button onClick={handleCreateAgent} className="btn-primary">
          <Save size={18} /> Add Agent
        </button>
      </div>
    </Modal>
  );
};