import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import CommonTable from '../components/CommonTable';
import FilterPanel from '../components/FilterPanel';
import StatusBadge from '../components/StatusBadge';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import { usePayments } from '../hooks/usePayments';
import { formatDate } from '../../../utils/dateUtils';

const PaymentHistory = () => {
  const { payments, loading, error, refetchPayments } = usePayments();
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Filter payment receipts
  const filteredReceipts = payments.filter((rec) => {
    const receiptNo = rec.receipt?.receiptNumber || '';
    const studentName = rec.student?.fullName || '';
    const transactionId = rec.transactionId || '';
    const studentId = rec.student?.studentId || '';
    const paymentMode = rec.paymentMode || '';

    const matchesMode = paymentModeFilter === 'All' || paymentMode === paymentModeFilter;
    const matchesSearch =
      receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transactionId.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesMode && matchesSearch;
  });

  const columns = [
    {
      header: 'Receipt ID',
      accessor: 'receipt.receiptNumber',
      render: (rec) => <span className="font-mono text-amber-600 font-bold">{rec.receipt?.receiptNumber || 'N/A'}</span>
    },
    {
      header: 'Student ID',
      accessor: 'student.studentId',
      render: (rec) => <span className="font-mono text-slate-500">{rec.student?.studentId || 'N/A'}</span>
    },
    {
      header: 'Student Name',
      accessor: 'student.fullName',
      render: (rec) => (
        <div>
          <div className="font-bold text-slate-800">{rec.student?.fullName || 'N/A'}</div>
          <div className="text-[10px] text-slate-400 font-semibold">{rec.student?.course || 'N/A'}</div>
        </div>
      )
    },
    {
      header: 'Received Amount',
      accessor: 'amount',
      render: (rec) => (
        <div>
          <span className="text-emerald-600 font-extrabold">{formatINR(rec.amount)}</span>
          {rec.advanceAmount > 0 && (
            <span className="block text-[9px] text-blue-600 font-bold">
              +{formatINR(rec.advanceAmount)} Extra Credit
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Type',
      accessor: 'paymentType',
      render: (rec) => (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
          {rec.paymentType?.replace('_', ' ') || 'PAYMENT'}
        </span>
      )
    },
    {
      header: 'Payment Mode',
      accessor: 'paymentMode',
      render: (rec) => (
        <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-[10px] font-bold">
          {rec.paymentMode}
        </span>
      )
    },
    {
      header: 'Transaction Ref',
      accessor: 'transactionId',
      render: (rec) => <span className="font-mono text-slate-500">{rec.transactionId || 'Cash/Direct'}</span>
    },
    {
      header: 'Processed Date',
      accessor: 'paymentDate',
      render: (rec) => <span className="text-slate-500">{formatDate(rec.paymentDate)}</span>
    }
  ];

  const dropdownFilters = (
    <FilterPanel showIcon={true}>
      <select
        value={paymentModeFilter}
        onChange={(e) => setPaymentModeFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Channels</option>
        <option value="UPI">UPI</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cash">Cash</option>
      </select>
    </FilterPanel>
  );

  return (
    <div className="space-y-4">
      {/* Action panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Collections Audit Trail</h3>
          <p className="text-[10px] font-semibold text-slate-400">Total Payments Audited: {filteredReceipts.length}</p>
        </div>
        <button 
          onClick={refetchPayments}
          className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={refetchPayments} />}

      {/* History table */}
      <CommonTable
        columns={columns}
        data={filteredReceipts}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search Receipt, Student, Invoice, Transaction..."
        emptyMessage="No payment entries matched your filters."
        filters={dropdownFilters}
        itemsPerPage={10}
      />
    </div>
  );
};

export default PaymentHistory;
