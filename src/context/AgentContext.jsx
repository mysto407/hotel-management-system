// src/context/AgentContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { getAgents, createAgent, updateAgent, deleteAgent } from '../lib/supabase';
import { useAlert } from './AlertContext';

const AgentContext = createContext();

export const useAgents = () => {
  const context = useContext(AgentContext);
  if (!context) throw new Error('useAgents must be used within AgentProvider');
  return context;
};

export const AgentProvider = ({ children }) => {
  const { error: showError } = useAlert();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    setLoading(true);
    const { data, error } = await getAgents();
    if (error) {
      console.error('Error loading agents:', error);
    } else {
      setAgents(data || []);
    }
    setLoading(false);
  };

  const addAgent = async (agent) => {
    const { data, error } = await createAgent(agent);
    if (error) {
      console.error('Error creating agent:', error);
      showError('Failed to create agent: ' + error.message);
      return null;
    }
    setAgents([data[0], ...agents]);
    return data[0];
  };

  const updateAgentData = async (id, updatedAgent) => {
    const { error } = await updateAgent(id, updatedAgent);
    if (error) {
      console.error('Error updating agent:', error);
      showError('Failed to update agent: ' + error.message);
      return;
    }
    setAgents(agents.map(agent =>
      agent.id === id ? { ...agent, ...updatedAgent } : agent
    ));
  };

  const deleteAgentData = async (id) => {
    const { error } = await deleteAgent(id);
    if (error) {
      console.error('Error deleting agent:', error);
      showError('Cannot delete agent: ' + error.message);
      return;
    }
    setAgents(agents.filter(agent => agent.id !== id));
  };

  return (
    <AgentContext.Provider value={{
      agents,
      loading,
      addAgent,
      updateAgent: updateAgentData,
      deleteAgent: deleteAgentData
    }}>
      {children}
    </AgentContext.Provider>
  );
};