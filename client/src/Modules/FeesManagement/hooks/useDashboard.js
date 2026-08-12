import { useState, useEffect, useCallback, useRef } from 'react';
import { feesApi } from '../../../api/feesApi';

/**
 * useDashboard - Hook for dashboard metrics, graphs, lists, and activity logs.
 */
export const useDashboard = (filterType, customRange, isApplyingCustom) => {
  const [summary, setSummary] = useState(null);
  const [charts, setCharts] = useState(null);
  const [recentPayments, setRecentPayments] = useState([]);
  const [upcomingDues, setUpcomingDues] = useState([]);
  const [overdueList, setOverdueList] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [timelineActivities, setTimelineActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isFetchingRef = useRef(false);
  const startDate = customRange?.startDate || '';
  const endDate = customRange?.endDate || '';

  const fetchDashboardData = useCallback(async (force = false) => {
    if (isFetchingRef.current && !force) return;
    isFetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const summaryParams = { filterType };
      if (filterType === 'custom') {
        summaryParams.startDate = startDate;
        summaryParams.endDate = endDate;
      }

      const [
        summaryRes,
        chartsRes,
        paymentsRes,
        upcomingRes,
        overdueRes,
        studentsRes,
        activitiesRes
      ] = await Promise.all([
        feesApi.getDashboardSummary(summaryParams),
        feesApi.getDashboardCharts(summaryParams),
        feesApi.getDashboardRecentPayments(),
        feesApi.getDashboardUpcomingDue(),
        feesApi.getDashboardOverdue(),
        feesApi.getDashboardRecentStudents(),
        feesApi.getDashboardRecentActivities()
      ]);

      if (summaryRes.success) setSummary(summaryRes.data);
      if (chartsRes.success) setCharts(chartsRes.data);
      if (paymentsRes.success) setRecentPayments(paymentsRes.data || []);
      if (upcomingRes.success) setUpcomingDues(upcomingRes.data || []);
      if (overdueRes.success) setOverdueList(overdueRes.data || []);
      if (studentsRes.success) setRecentStudents(studentsRes.data || []);
      if (activitiesRes.success) setTimelineActivities(activitiesRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard metrics:', err);
      setError(err.userMessage || err.response?.data?.message || err.message || 'Failed to sync live dashboard panels.');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [filterType, startDate, endDate, isApplyingCustom]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    summary,
    charts,
    recentPayments,
    upcomingDues,
    overdueList,
    recentStudents,
    timelineActivities,
    loading,
    error,
    refetch: () => fetchDashboardData(true)
  };
};

export default useDashboard;

