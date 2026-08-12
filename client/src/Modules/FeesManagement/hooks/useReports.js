import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { feesApi } from '../../../api/feesApi';

/**
 * useReports - Hook to compile reports, aggregates, student ledgers, and handle Excel sheet sheet exports.
 */
export const useReports = () => {
  const [reportType, setReportType] = useState('daily');
  const [filterRange, setFilterRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [globalSearch, setGlobalSearch] = useState('');

  const [summary, setSummary] = useState(null);
  const [reportRows, setReportRows] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedLedgerId, setSelectedLedgerId] = useState('');
  const [ledgerData, setLedgerData] = useState(null);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await feesApi.getReportsSummary();
      if (res.success) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error('Error fetching reports summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const fetchStudentsList = useCallback(async () => {
    try {
      const res = await feesApi.getStudents();
      if (res.success && res.data) {
        const list = res.data.students || res.data || [];
        setAllStudents(list);
      }
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  }, []);

  const fetchStudentLedger = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await feesApi.getStudentLedgerReport(id);
      if (res.success) {
        setLedgerData(res.data);
      }
    } catch (err) {
      console.error('Error fetching student ledger:', err);
      setError(err.userMessage || 'Failed to fetch selected student ledger details.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReportData = useCallback(async () => {
    if (reportType === 'ledger') {
      if (selectedLedgerId) fetchStudentLedger(selectedLedgerId);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const params = {
        course: selectedCourse === 'All' ? undefined : selectedCourse,
        paymentMode: selectedMode === 'All' ? undefined : selectedMode,
        paymentType: selectedType === 'All' ? undefined : selectedType,
        feeStatus: selectedStatus === 'All' ? undefined : selectedStatus,
        search: globalSearch === '' ? undefined : globalSearch
      };

      if (reportType === 'custom' || filterRange === 'Custom Date Range') {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      let res;
      switch (reportType) {
        case 'daily':
          res = await feesApi.getDailyReport(params);
          break;
        case 'weekly':
          res = await feesApi.getWeeklyReport(params);
          break;
        case 'monthly':
          res = await feesApi.getMonthlyReport(params);
          break;
        case 'custom':
          params.startDate = startDate;
          params.endDate = endDate;
          res = await feesApi.getCustomRangeReport(params);
          break;
        case 'course-wise':
          res = await feesApi.getCourseWiseReport();
          break;
        case 'pending':
          res = await feesApi.getPendingReport(params);
          break;
        case 'overdue':
          res = await feesApi.getOverdueReport(params);
          break;
        default:
          res = await feesApi.getDailyReport(params);
      }

      if (res && res.success) {
        setReportRows(res.data || []);
      }
    } catch (err) {
      console.error('Error loading report rows:', err);
      setError(err.userMessage || 'Server error compiled during report rendering.');
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    selectedCourse,
    selectedMode,
    selectedType,
    selectedStatus,
    globalSearch,
    filterRange,
    startDate,
    endDate,
    selectedLedgerId,
    fetchStudentLedger
  ]);

  const exportExcel = (showToast, formatINR, formatDate) => {
    if (reportRows.length === 0 && !ledgerData) {
      showToast('No report rows available to export.', 'error');
      return;
    }

    let headers = [];
    let rows = [];

    if (reportType === 'ledger') {
      if (!ledgerData) return;
      headers = ['Category', 'Parameter 1', 'Parameter 2', 'Parameter 3', 'Parameter 4'];
      rows = [
        ['STUDENT DETAILS', ledgerData.student.fullName, ledgerData.student.studentId, ledgerData.student.course, ledgerData.student.mobile],
        ['LEDGER SUMMARY', `Total Fees: ${ledgerData.student.feePlan?.totalFees}`, `Paid: ${ledgerData.student.feePlan?.paidAmount}`, `Remaining: ${ledgerData.student.feePlan?.remainingAmount}`, `Status: ${ledgerData.student.feePlan?.status}`],
        [],
        ['INSTALLMENT SCHEDULE'],
        ['Installment No', 'Due Date', 'Amount', 'Paid Amount', 'Remaining', 'Status']
      ];
      ledgerData.installments.forEach(inst => {
        rows.push([inst.installmentNo, formatDate(inst.dueDate), inst.amount, inst.paidAmount, inst.remainingAmount, inst.status]);
      });
      rows.push([]);
      rows.push(['TRANSACTION HISTORY']);
      rows.push(['Transaction ID', 'Payment Date', 'Type', 'Mode', 'Amount', 'Remarks']);
      ledgerData.payments.forEach(pay => {
        rows.push([pay.transactionId || 'Cash Sale', formatDate(pay.paymentDate), pay.paymentType, pay.paymentMode, pay.amount, pay.remarks || 'None']);
      });
    } else if (reportType === 'course-wise') {
      headers = ['Course', 'Total Students Enrolled', 'Total Collected (₹)', 'Total Pending Dues (₹)'];
      reportRows.forEach(row => {
        rows.push([row.course, row.totalStudents, row.collectedAmount, row.pendingAmount]);
      });
    } else if (reportType === 'pending' || reportType === 'overdue') {
      headers = ['Student Name', 'ID', 'Course', 'Installment #', 'Due Date', 'Amount Expected (₹)', 'Amount Remaining (₹)'];
      reportRows.forEach(row => {
        rows.push([
          row.student?.fullName || 'N/A',
          row.student?.studentId || 'N/A',
          row.student?.course || 'N/A',
          row.installmentNo,
          formatDate(row.dueDate),
          row.amount,
          row.remainingAmount
        ]);
      });
    } else {
      headers = ['Receipt No', 'Student ID', 'Student Name', 'Course', 'Payment Date', 'Type', 'Mode', 'Collected Amount (₹)', 'Transaction ID'];
      reportRows.forEach(row => {
        rows.push([
          row.receipt?.receiptNumber || 'N/A',
          row.student?.studentId || 'N/A',
          row.student?.fullName || 'N/A',
          row.student?.course || 'N/A',
          formatDate(row.paymentDate),
          row.paymentType,
          row.paymentMode,
          row.amount,
          row.transactionId || 'Cash Sale'
        ]);
      });
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report Output');
    XLSX.writeFile(workbook, `ERP_${reportType}_report_${Date.now()}.xlsx`);
    showToast('Report sheet exported to Excel successfully!');
  };

  useEffect(() => {
    fetchSummary();
    fetchStudentsList();
  }, [fetchSummary, fetchStudentsList]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return {
    reportType,
    setReportType,
    filterRange,
    setFilterRange,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    selectedCourse,
    setSelectedCourse,
    selectedMode,
    setSelectedMode,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    globalSearch,
    setGlobalSearch,
    summary,
    reportRows,
    allStudents,
    selectedLedgerId,
    setSelectedLedgerId,
    ledgerData,
    loading,
    summaryLoading,
    error,
    exportExcel,
    refetchSummary: fetchSummary,
    refetchReport: fetchReportData
  };
};

export default useReports;
