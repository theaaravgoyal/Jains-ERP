import { useState, useEffect, useCallback, useRef } from 'react';
import { leadService } from '../services/leadService';

export const useLeads = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(45);
  const isFetchingRef = useRef(false);

  const fetchLeads = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;
    try {
      setLoading(true);
      setError(null);
      const data = await leadService.getLeads();
      setLeads(data || []);
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to fetch leads from server.');
      console.error('Lead fetch error:', err);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  // Auto-refresh countdown (45 seconds)
  useEffect(() => {
    fetchLeads();
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchLeads();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [fetchLeads]);

  const updateLeadStatus = async (leadId, status) => {
    try {
      const updated = await leadService.updateLeadStatus(leadId, status);
      setLeads((prev) =>
        prev.map((l) => (l._id === leadId ? { ...l, status: updated.status } : l))
      );
      return updated;
    } catch (err) {
      console.error('Failed to update lead status:', err);
      throw err;
    }
  };

  const deleteLead = async (leadId) => {
    try {
      const success = await leadService.deleteLead(leadId);
      if (success) {
        setLeads((prev) => prev.filter((l) => l._id !== leadId));
      }
      return success;
    } catch (err) {
      console.error('Failed to delete lead:', err);
      throw err;
    }
  };

  const createLead = async (leadData) => {
    try {
      const newLead = await leadService.createLead(leadData);
      setLeads((prev) => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      console.error('Failed to create lead:', err);
      throw err;
    }
  };

  const handleManualRefresh = () => {
    setCountdown(45);
    fetchLeads();
  };

  return {
    leads,
    loading,
    error,
    countdown,
    refreshLeads: fetchLeads,
    handleManualRefresh,
    updateLeadStatus,
    deleteLead,
    createLead
  };
};
