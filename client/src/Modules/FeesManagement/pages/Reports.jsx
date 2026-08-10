import React, { useState } from 'react';
import { 
  FileText, Calendar, ArrowUpRight, 
  TrendingUp, Users, AlertCircle, RefreshCw, Printer, Search, ArrowRight, ShieldCheck, Clock
} from 'lucide-react';
import { useSystemSettings } from '../context/SettingsContext';
import { COURSES } from '../../../constants/Courses';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import CommonTable from '../components/CommonTable';
import DatePicker from '../components/DatePicker';
import FilterPanel from '../components/FilterPanel';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useReports } from '../hooks/useReports';

/**
 * StudentLedgerView - Decoupled display sub-panel for student ledger queries.
 */
const StudentLedgerView = ({ ledgerData, formatDate, formatINR }) => {
  if (!ledgerData) {
    return <EmptyState title="No Student Selected" message="Please choose a student from the dropdown filter above to compile ledger details." icon={UserPlus} />;
  }

  return (
    <div className="space-y-6">
      {/* Student Meta Profile Info Card */}
      <div className="bg-[#FAF9F6]/40 border border-[#EBEAE6] p-5 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-xs font-semibold">
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Student Bio Details</span>
          <div className="space-y-0.5">
            <h4 className="text-sm font-extrabold text-slate-800">{ledgerData.student.fullName}</h4>
            <p className="text-slate-500 font-mono">ID: {ledgerData.student.studentId}</p>
            <p className="text-slate-500">Contact: {ledgerData.student.mobile}</p>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Academic Course & Plan</span>
          <div className="space-y-0.5">
            <p className="text-slate-700">Course: <span className="font-extrabold">{ledgerData.student.course}</span></p>
            <p className="text-slate-500">Plan: {ledgerData.student.feePlan?.paymentPlan}</p>
            <p className="text-slate-500">Registered: {formatDate(ledgerData.student.createdAt)}</p>
          </div>
        </div>
        <div className="space-y-2">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Financial Totals Summary</span>
          <div className="space-y-1">
            <p className="text-slate-700">Total Fees: <span className="font-extrabold">{formatINR(ledgerData.student.feePlan?.totalFees)}</span></p>
            <div className="flex gap-2">
              <span className="text-emerald-650">Paid: {formatINR(ledgerData.student.feePlan?.paidAmount)}</span>
              <span className="text-rose-600">Owed: {formatINR(ledgerData.student.feePlan?.remainingAmount)}</span>
            </div>
            <StatusBadge status={ledgerData.student.feePlan?.status} />
          </div>
        </div>
      </div>

      {/* Installments Table */}
      <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-xs space-y-3.5">
        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <Clock size={14} className="text-slate-400" />
          <span>Installment Billing Schedule</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
            <thead>
              <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Installment No</th>
                <th className="pb-3">Due Date</th>
                <th className="pb-3">Installment Amount</th>
                <th className="pb-3">Amount Paid</th>
                <th className="pb-3">Amount Remaining</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF9F6]">
              {ledgerData.installments.map((inst) => (
                <tr key={inst._id}>
                  <td className="py-3 font-bold text-slate-800">Inst #{inst.installmentNo}</td>
                  <td className="py-3 text-slate-500">{formatDate(inst.dueDate)}</td>
                  <td className="py-3 text-slate-700">{formatINR(inst.amount)}</td>
                  <td className="py-3 text-emerald-650">{formatINR(inst.paidAmount)}</td>
                  <td className="py-3 text-slate-800 font-extrabold">{formatINR(inst.remainingAmount)}</td>
                  <td className="py-3"><StatusBadge status={inst.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-xs space-y-3.5">
        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-[#FAF9F6] pb-2">
          <TrendingUp size={14} className="text-emerald-500" />
          <span>Voucher Collection Logs</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
            <thead>
              <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Transaction ID</th>
                <th className="pb-3">Payment Date</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Billing Mode</th>
                <th className="pb-3">Collected Amount</th>
                <th className="pb-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#FAF9F6]">
              {ledgerData.payments.map((pay) => (
                <tr key={pay._id}>
                  <td className="py-3 font-mono text-slate-550 font-bold">{pay.transactionId || 'Cash Sale'}</td>
                  <td className="py-3 text-slate-500">{formatDate(pay.paymentDate)}</td>
                  <td className="py-3"><span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{pay.paymentType}</span></td>
                  <td className="py-3 text-slate-700 font-bold">{pay.paymentMode}</td>
                  <td className="py-3 text-emerald-650 font-extrabold">{formatINR(pay.amount)}</td>
                  <td className="py-3 text-slate-450 italic">{pay.remarks || 'None'}</td>
                </tr>
              ))}
              {ledgerData.payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-bold text-[11px]">No transactions collected yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Reports = () => {
  const { settings } = useSystemSettings();
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const {
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
    refetchReport
  } = useReports();

  // Format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePrint = () => {
    window.print();
  };

  // Define Columns dynamically based on active report type
  const collectionsColumns = [
    { header: 'Receipt No', accessor: 'receiptNumber', render: (row) => <span className="font-mono text-slate-500 font-bold">{row.receipt?.receiptNumber || 'N/A'}</span> },
    { header: 'Student ID', accessor: 'studentId', render: (row) => <span className="font-mono text-slate-500">{row.student?.studentId || 'N/A'}</span> },
    { header: 'Student Name', accessor: 'studentName', render: (row) => <span className="font-bold text-slate-800">{row.student?.fullName || 'N/A'}</span> },
    { header: 'Course', accessor: 'course', render: (row) => <span className="text-slate-650">{row.student?.course || 'N/A'}</span> },
    { header: 'Payment Date', accessor: 'paymentDate', render: (row) => <span className="text-slate-500">{formatDate(row.paymentDate)}</span> },
    { header: 'Type', accessor: 'paymentType', render: (row) => <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[9px] text-slate-500 font-bold">{row.paymentType}</span> },
    { header: 'Mode', accessor: 'paymentMode', render: (row) => <span className="text-slate-700 font-bold">{row.paymentMode}</span> },
    { header: 'Collected Amount', accessor: 'amount', render: (row) => <span className="font-extrabold text-slate-800">{formatINR(row.amount)}</span> },
    { header: 'Collected By', accessor: 'receivedBy', render: (row) => <span className="text-slate-500">{row.receivedBy?.name || 'System'}</span> }
  ];

  const courseColumns = [
    { header: 'Course', accessor: 'course', render: (row) => <span className="font-bold text-slate-800">{row.course}</span> },
    { header: 'Total Students', accessor: 'totalStudents', render: (row) => <span className="text-slate-650 font-bold">{row.totalStudents}</span> },
    { header: 'Collected Amount', accessor: 'collectedAmount', render: (row) => <span className="text-emerald-650 font-extrabold">{formatINR(row.collectedAmount)}</span> },
    { header: 'Pending Amount', accessor: 'pendingAmount', render: (row) => <span className="text-rose-600 font-extrabold">{formatINR(row.pendingAmount)}</span> }
  ];

  const duesColumns = [
    { header: 'Installment #', accessor: 'installmentNo', render: (row) => <span className="font-bold text-slate-850">Inst #{row.installmentNo}</span> },
    { header: 'Student ID', accessor: 'studentId', render: (row) => <span className="font-mono text-slate-550">{row.student?.studentId || 'N/A'}</span> },
    { header: 'Student Name', accessor: 'fullName', render: (row) => <span className="font-bold text-slate-800">{row.student?.fullName || 'N/A'}</span> },
    { header: 'Course', accessor: 'course', render: (row) => <span className="text-slate-650">{row.student?.course || 'N/A'}</span> },
    { header: 'Due Date', accessor: 'dueDate', render: (row) => <span className="text-slate-500">{formatDate(row.dueDate)}</span> },
    { header: 'Amount Due', accessor: 'amount', render: (row) => <span className="text-slate-700 font-bold">{formatINR(row.amount)}</span> },
    { header: 'Amount Remaining', accessor: 'remainingAmount', render: (row) => <span className="text-rose-600 font-extrabold">{formatINR(row.remainingAmount)}</span> },
    { header: 'Status', accessor: 'status', render: (row) => <StatusBadge status={row.status} /> }
  ];

  const getTableColumns = () => {
    if (reportType === 'course-wise') return courseColumns;
    if (reportType === 'pending' || reportType === 'overdue') return duesColumns;
    return collectionsColumns;
  };

  const getReportFilters = () => {
    return (
      <FilterPanel showIcon={true}>
        {/* Date range filter bounds */}
        {(reportType === 'custom' || filterRange === 'Custom Date Range') && (
          <div className="flex gap-2 items-center">
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="From"
            />
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="To"
            />
          </div>
        )}

        {/* Ledger student picker (only when ledger active) */}
        {reportType === 'ledger' && (
          <select
            value={selectedLedgerId}
            onChange={(e) => setSelectedLedgerId(e.target.value)}
            className="px-2.5 py-1.5 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-amber-400 text-slate-700"
          >
            <option value="">-- Choose Student Ledger --</option>
            {allStudents.map(stu => (
              <option key={stu._id} value={stu._id}>
                {stu.fullName} ({stu.studentId})
              </option>
            ))}
          </select>
        )}

        {/* Course filter */}
        {reportType !== 'course-wise' && reportType !== 'ledger' && (
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-2.5 py-1.5 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-amber-400 text-slate-700"
          >
            <option value="All">All Courses</option>
            {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        {/* Payment Mode filter */}
        {['daily', 'weekly', 'monthly', 'custom'].includes(reportType) && (
          <>
            <select
              value={selectedMode}
              onChange={(e) => setSelectedMode(e.target.value)}
              className="px-2.5 py-1.5 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-amber-400 text-slate-700"
            >
              <option value="All">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Cheque">Cheque</option>
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-amber-400 text-slate-700"
            >
              <option value="All">All Types</option>
              <option value="FULL_PAYMENT">Full Payment</option>
              <option value="INSTALLMENT_PAYMENT">Installment Payment</option>
              <option value="PARTIAL_PAYMENT">Partial Payment</option>
              <option value="ADVANCE_PAYMENT">Advance Payment</option>
            </select>
          </>
        )}

        {/* Billing Status filter */}
        {['pending', 'overdue'].includes(reportType) && (
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 border border-[#DEDCD8] bg-white rounded-xl text-xs font-bold cursor-pointer outline-none focus:border-amber-400 text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="OVERDUE">Overdue</option>
            <option value="PARTIAL">Partial</option>
          </select>
        )}
      </FilterPanel>
    );
  };

  return (
    <div className="space-y-6 print:p-0 print:bg-white print:text-black">

      {/* Printable page header */}
      <div className="hidden print:flex justify-between items-start pb-4 border-b border-slate-200 mb-6">
        <div>
          <h2 className="text-base font-extrabold text-slate-900">{settings?.institute?.name || 'Jains Computer'}</h2>
          <p className="text-[9px] text-slate-450">
            {settings?.institute?.address || '13, Shivpuri Colony, Main Kalwar Road, Jhotwara'}, {settings?.institute?.city || 'Jaipur'}, {settings?.institute?.state || 'Rajasthan'} - {settings?.institute?.pincode || '302012'}
          </p>
        </div>
        <div className="text-right">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase">Accounting Report Ledger</h3>
          <p className="text-[9px] text-slate-400 font-bold">Report Type: {reportType.toUpperCase()}</p>
        </div>
      </div>
      
      {/* Toast Alert Popups */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm print:hidden">
        <div className="space-y-0.5">
          <div className="text-[10px] text-slate-450 uppercase font-extrabold flex items-center gap-1">
            <span>Accounting Ledger</span>
            <ArrowRight size={10} />
            <span>Vouchers & Invoices</span>
          </div>
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Reports & Ledger Books</h3>
          <p className="text-[10px] font-semibold text-slate-400 font-sans">Generate collection schedules, course balances, and timelines</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportExcel(showToast, formatINR, formatDate)}
            className="flex-1 sm:flex-initial py-2 px-3 border border-[#DEDCD8] bg-white hover:bg-[#FAF9F6] text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs active:scale-95"
            title="Download Excel"
          >
            Excel
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial py-2 px-3.5 bg-amber-500 hover:bg-amber-600 border-0 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Print Report"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Summary Cards Row */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print:hidden">
          <StatsCard title="Total Collection" value={formatINR(summary.totalCollection)} icon={TrendingUp} trend="Voucher Sum" trendType="up" accentColor="from-blue-500 to-sky-500" />
          <StatsCard title="Total Pending" value={formatINR(summary.totalPending)} icon={AlertCircle} trend="Dues Remaining" trendType="down" accentColor="from-rose-500 to-orange-500" />
          <StatsCard title="Total Overdue" value={formatINR(summary.totalOverdue)} icon={AlertCircle} trend="Immediate Callbacks" trendType="down" accentColor="from-red-500 to-rose-600" />
          <StatsCard title="Today's Collection" value={formatINR(summary.todayCollection)} icon={RefreshCw} trend="Daily collections" trendType="up" accentColor="from-amber-500 to-yellow-500" />
          <StatsCard title="This Month Collection" value={formatINR(summary.thisMonthCollection)} icon={TrendingUp} trend="Monthly aggregates" trendType="up" accentColor="from-violet-500 to-fuchsia-500" />
          <StatsCard title="Total Students" value={summary.totalStudents} icon={Users} trend="Active registers" trendType="neutral" accentColor="from-teal-400 to-emerald-500" />
        </div>
      )}

      {/* Query filters and Report selector */}
      <div className="bg-white border border-[#EBEAE6] p-4 rounded-2xl shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-bold text-slate-600">
          
          {/* Report Selector */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-450 uppercase block font-extrabold">Report Type</span>
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                setSelectedLedgerId('');
              }}
              className="w-full px-3 py-2 border border-[#DEDCD8] bg-[#FAF9F6]/20 rounded-xl text-slate-750 font-bold cursor-pointer outline-none focus:border-amber-400 transition-all"
            >
              <option value="daily">Daily Collection Report</option>
              <option value="weekly">Weekly Collection Report</option>
              <option value="monthly">Monthly Collection Report</option>
              <option value="custom">Custom Date Range Report</option>
              <option value="course-wise">Course Wise Collection Report</option>
              <option value="pending">Pending Fees Report</option>
              <option value="overdue">Overdue Fees Report</option>
              <option value="ledger">Student Fee Ledger</option>
            </select>
          </div>
        </div>
      </div>

      {/* Display Grid Table / Ledger */}
      {error && <ErrorState message={error} onRetry={refetchReport} />}

      <div className="bg-white border border-[#EBEAE6] p-4 rounded-2xl shadow-sm print:border-none print:shadow-none">
        {reportType === 'ledger' ? (
          loading ? <Loader message="Compiling ledger details..." /> : (
            <StudentLedgerView
              ledgerData={ledgerData}
              formatDate={formatDate}
              formatINR={formatINR}
            />
          )
        ) : (
          <CommonTable
            columns={getTableColumns()}
            data={reportRows}
            loading={loading}
            searchQuery={globalSearch}
            onSearchChange={setGlobalSearch}
            searchPlaceholder="Search in compiled report rows..."
            emptyMessage={`No report rows generated for ${reportType} selection.`}
            filters={getReportFilters()}
            itemsPerPage={15}
          />
        )}
      </div>

    </div>
  );
};

export default Reports;
