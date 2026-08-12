import { useState, useEffect, useCallback } from 'react';
import { feesApi } from '../../../api/feesApi';

/**
 * useFeePlans - Hook to manage student Fee Plans, settings, and installment lists.
 */
export const useFeePlans = (studentId = null) => {
  const [feePlan, setFeePlan] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFeePlan = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const planRes = await feesApi.getFeePlan(id);
      if (planRes.success) {
        setFeePlan(planRes.data);
      }
      
      const instRes = await feesApi.getInstallmentsByStudent(id);
      if (instRes.success && instRes.data) {
        setInstallments(instRes.data.installmentList || []);
      }
    } catch (err) {
      console.error('Error fetching fee plan/installments:', err);
      // Suppress 404 for fee plan setup triggers
      if (err.response?.status !== 404) {
        setError(err.userMessage || err.response?.data?.message || 'Failed to fetch Fee Plan.');
      } else {
        setFeePlan(null);
        setInstallments([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createFeePlan = async (planData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.createFeePlan(planData);
      if (studentId) {
        await fetchFeePlan(studentId);
      }
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to setup Fee Plan.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateFeePlan = async (id, planData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.updateFeePlan(id, planData);
      await fetchFeePlan(id);
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to update Fee Plan.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteFeePlan = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.deleteFeePlan(id);
      setFeePlan(null);
      setInstallments([]);
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to remove Fee Plan.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const editInstallment = async (id, updateData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.updateInstallment(id, updateData);
      if (studentId) {
        await fetchFeePlan(studentId);
      }
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to update installment.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeInstallment = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.deleteInstallment(id);
      if (studentId) {
        await fetchFeePlan(studentId);
      }
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to delete installment.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchFeePlan(studentId);
    }
  }, [studentId, fetchFeePlan]);

  return {
    feePlan,
    installments,
    loading,
    error,
    refetch: () => fetchFeePlan(studentId),
    createFeePlan,
    updateFeePlan,
    deleteFeePlan,
    editInstallment,
    removeInstallment
  };
};

export default useFeePlans;
