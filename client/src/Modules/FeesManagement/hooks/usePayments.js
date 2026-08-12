import { useState, useEffect, useCallback } from 'react';
import { feesApi } from '../../../api/feesApi';

/**
 * usePayments - Hook to handle payment collections, logs history, and student audit timelines.
 */
export const usePayments = (studentId = null) => {
  const [payments, setPayments] = useState([]);
  const [studentPayments, setStudentPayments] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPaymentsList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.getPayments();
      if (res.success) {
        setPayments(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching payments list:', err);
      setError(err.userMessage || err.response?.data?.message || 'Failed to retrieve payment history.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStudentPaymentsAndLogs = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [pmtsRes, logsRes] = await Promise.all([
        feesApi.getPaymentsByStudent(id),
        feesApi.getStudentActivityLogs(id)
      ]);

      if (pmtsRes.success) setStudentPayments(pmtsRes.data || []);
      if (logsRes.success) setActivityLogs(logsRes.data || []);
    } catch (err) {
      console.error('Error fetching student transactions/logs:', err);
      setError(err.userMessage || err.response?.data?.message || 'Failed to sync student financial ledger.');
    } finally {
      setLoading(false);
    }
  }, []);

  const collectPayment = async (paymentPayload) => {
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.collectPayment(paymentPayload);
      if (studentId) {
        await fetchStudentPaymentsAndLogs(studentId);
      }
      return res;
    } catch (err) {
      setError(err.userMessage || err.response?.data?.message || 'Failed to collect payment.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) {
      fetchStudentPaymentsAndLogs(studentId);
    } else {
      fetchPaymentsList();
    }
  }, [studentId, fetchPaymentsList, fetchStudentPaymentsAndLogs]);

  return {
    payments,
    studentPayments,
    activityLogs,
    loading,
    error,
    refetchPayments: fetchPaymentsList,
    refetchStudentData: () => fetchStudentPaymentsAndLogs(studentId),
    collectPayment
  };
};

export default usePayments;
