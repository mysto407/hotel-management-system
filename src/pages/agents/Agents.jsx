// src/pages/agents/Agents.jsx
import { useState } from 'react';
import { Plus, Edit2, Trash2, Save, XCircle, Phone, Mail, Percent, MapPin, TrendingUp } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { useAgents } from '../../context/AgentContext';
import { useReservations } from '../../context/ReservationContext';

const Agents = () => {
  const { agents, addAgent, updateAgent, deleteAgent } = useAgents();
  const { reservations } = useReservations();
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
    if (window.confirm('Are you sure you want to delete this agent?')) {
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
    <div>
      <div className="page-header">
        <h1 className="page-title">Travel Agents</h1>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary">
          <Plus size={20} /> Add Agent
        </button>
      </div>

      {/* Summary Statistics */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Agents</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>{agents.length}</div>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Bookings</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            {reservations.filter(r => r.booking_source === 'agent').length}
          </div>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Revenue</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            ₹{reservations
              .filter(r => r.booking_source === 'agent')
              .reduce((sum, r) => sum + (r.total_amount || 0), 0)
              .toLocaleString()}
          </div>
        </div>

        <div style={{ 
          padding: '20px', 
          background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          borderRadius: '12px',
          color: 'white',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '8px' }}>Total Commission</div>
          <div style={{ fontSize: '32px', fontWeight: '700' }}>
            ₹{agents
              .reduce((sum, agent) => {
                const commission = calculateCommission(agent.id, agent);
                return sum + (commission || 0);
              }, 0)
              .toLocaleString()}
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Contact Info</th>
              <th>Commission</th>
              <th>Total Bookings</th>
              <th>Active Bookings</th>
              <th>Total Revenue</th>
              <th>Commission Earned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => {
              const stats = getAgentStats(agent.id);
              const commissionEarned = calculateCommission(agent.id, agent);

              return (
                <tr key={agent.id}>
                  <td>
                    <strong>{agent.name}</strong>
                    {agent.address && (
                      <>
                        <br />
                        <small style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                          <MapPin size={12} />
                          {agent.address}
                        </small>
                      </>
                    )}
                  </td>
                  <td>
                    {agent.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <Phone size={14} color="#6b7280" />
                        <span>{agent.phone}</span>
                      </div>
                    )}
                    {agent.email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} color="#6b7280" />
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{agent.email}</span>
                      </div>
                    )}
                    {!agent.phone && !agent.email && (
                      <span style={{ color: '#9ca3af', fontSize: '13px' }}>No contact info</span>
                    )}
                  </td>
                  <td>
                    {agent.commission ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        color: '#7c3aed',
                        fontWeight: '600'
                      }}>
                        <Percent size={14} />
                        {agent.commission}%
                      </div>
                    ) : (
                      <span style={{ 
                        color: '#9ca3af', 
                        fontSize: '13px',
                        fontStyle: 'italic',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Percent size={12} />
                        Not set
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      {stats.totalBookings}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      stats.activeBookings > 0 ? 'status-occupied' : 'status-available'
                    }`}>
                      {stats.activeBookings} Active
                    </span>
                  </td>
                  <td>
                    <div style={{ fontWeight: '600', color: '#059669' }}>
                      ₹{stats.totalRevenue.toLocaleString()}
                    </div>
                  </td>
                  <td>
                    {commissionEarned !== null ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '4px',
                        fontWeight: '700',
                        color: '#7c3aed',
                        fontSize: '15px'
                      }}>
                        <TrendingUp size={16} />
                        ₹{commissionEarned.toLocaleString()}
                      </div>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>
                        No commission set
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button onClick={() => handleEdit(agent)} className="btn-icon btn-edit">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(agent.id)} className="btn-icon btn-delete">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {agents.length === 0 && (
          <div style={{ 
            padding: '60px 20px', 
            textAlign: 'center', 
            color: '#6b7280' 
          }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              margin: '0 auto 20px',
              background: '#f3f4f6',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Phone size={40} color="#9ca3af" />
            </div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#374151' }}>No Agents Yet</h3>
            <p style={{ fontSize: '14px', marginBottom: '20px' }}>Start by adding your first travel agent or agency</p>
            <button onClick={() => setIsModalOpen(true)} className="btn-primary">
              <Plus size={18} /> Add Your First Agent
            </button>
          </div>
        )}
      </div>

      {/* Agent Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={resetForm}
        title={editingAgent ? 'Edit Agent' : 'Add New Agent'}
      >
        <div className="form-grid">
          <div className="form-group full-width">
            <label>Agent/Agency Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Travel Agency Name or Agent Name"
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="9876543210"
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="agent@example.com"
            />
          </div>
          <div className="form-group full-width">
            <label>Commission Rate (%) <span style={{ color: '#9ca3af', fontWeight: 'normal' }}>- Optional</span></label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.commission}
              onChange={(e) => setFormData({...formData, commission: e.target.value})}
              placeholder="e.g., 10.00"
            />
            <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
              Commission percentage this agent receives on bookings (leave empty if not applicable)
            </small>
          </div>
          <div className="form-group full-width">
            <label>Address</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              rows="2"
              placeholder="Complete address of the agency..."
            />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={resetForm} className="btn-secondary">
            <XCircle size={18} /> Cancel
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            <Save size={18} /> {editingAgent ? 'Update Agent' : 'Add Agent'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Agents;