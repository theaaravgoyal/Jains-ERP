import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Eye, X, RefreshCw, GraduationCap } from 'lucide-react';
import { useSystemSettings } from '../context/SettingsContext';
import { feesApi } from '../../../api/feesApi';
import CommonTable from '../components/CommonTable';
import StatusBadge from '../components/StatusBadge';
import FilterPanel from '../components/FilterPanel';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';

const Invoices = () => {
  const { settings } = useSystemSettings();
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All'); // All, today, week, month
  
  // Data states
  const [invoicesList, setInvoicesList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [activeInstallments, setActiveInstallments] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        status: statusFilter === 'All' ? undefined : statusFilter,
        dateFilter: dateFilter === 'All' ? undefined : dateFilter,
        search: searchQuery === '' ? undefined : searchQuery
      };
      const res = await feesApi.getInvoices(params);
      if (res.success) {
        setInvoicesList(res.data.invoices || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Failed to fetch billing invoices from database.');
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceDetails = async (id) => {
    setModalLoading(true);
    setActiveInstallments([]); // Reset previous installments list
    try {
      const res = await feesApi.getInvoiceById(id);
      if (res.success) {
        setActiveInvoice(res.data);
        
        // Fetch installments for this student
        if (res.data.studentId?._id) {
          const instRes = await feesApi.getInstallmentsByStudent(res.data.studentId._id);
          if (instRes.success) {
            setActiveInstallments(instRes.data.installmentList || []);
          }
        }
      }
    } catch (err) {
      console.error('Error loading invoice details:', err);
      showToast('Failed to load invoice details.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, dateFilter]);

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

  const columns = useMemo(() => [
    {
      header: 'Invoice ID',
      accessor: 'invoiceNumber',
      render: (inv) => <span className="font-mono text-slate-500 font-bold">{inv.invoiceNumber}</span>
    },
    {
      header: 'Student Name',
      accessor: 'studentId',
      render: (inv) => (
        <div>
          <div className="font-bold text-slate-800">{inv.studentId?.fullName || 'N/A'}</div>
          <span className="text-[10px] text-slate-400 font-semibold">{inv.studentId?.studentId || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Course',
      accessor: 'studentId',
      render: (inv) => <span className="text-slate-650">{inv.studentId?.course || 'N/A'}</span>
    },
    {
      header: 'Amount Due',
      accessor: 'amount',
      render: (inv) => <span className="font-extrabold text-slate-800">{formatINR(inv.amount)}</span>
    },
    {
      header: 'Issue Date',
      accessor: 'issueDate',
      render: (inv) => <span className="text-slate-500">{formatDate(inv.issueDate)}</span>
    },
    {
      header: 'Due Date',
      accessor: 'dueDate',
      render: (inv) => <span className="text-slate-500">{formatDate(inv.dueDate)}</span>
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (inv) => <StatusBadge status={inv.status} />
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (inv) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => loadInvoiceDetails(inv._id)}
            className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-slate-655 hover:bg-[#FAF9F6] transition-all cursor-pointer"
            title="Preview Invoice"
          >
            <Eye size={14} />
          </button>
        </div>
      )
    }
  ], []);

  const dropdownFilters = (
    <FilterPanel showIcon={true}>
      <select
        value={dateFilter}
        onChange={(e) => setDateFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Dates</option>
        <option value="today">Today</option>
        <option value="week">This Week</option>
        <option value="month">This Month</option>
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Statuses</option>
        <option value="Paid">Paid</option>
        <option value="Pending">Pending</option>
        <option value="Overdue">Overdue</option>
      </select>
    </FilterPanel>
  );

  return (
    <div className="space-y-4 print:p-0 print:bg-white print:text-black">
      
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header action panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm print:hidden">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Fee Demands & Invoices</h3>
          <p className="text-[10px] font-semibold text-slate-400">Total Demands generated: {totalCount}</p>
        </div>
        <button 
          onClick={fetchInvoices}
          className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs active:scale-95"
          title="Refresh invoices"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={fetchInvoices} />}

      <div className="print:hidden">
        <CommonTable
          columns={columns}
          data={invoicesList}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search Invoice No, Student Name, Student ID..."
          emptyMessage="No billing invoices found matching selection."
          filters={dropdownFilters}
          itemsPerPage={20}
        />
      </div>

      {/* Invoice Modal Preview Drawer */}
      {activeInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:relative print:inset-auto print:bg-white print:p-0">
          <div className="relative w-full max-w-2xl bg-white border border-[#EBEAE6] rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col print:border-none print:shadow-none print:max-h-full print:w-full">
            
            {/* Dynamic CSS styles injected specifically for clean printing */}
            <style>{`
              @media print {
                /* Hide everything else on the page */
                aside, nav, footer, header, .print\:hidden, button {
                  display: none !important;
                }
                
                /* Reset body and html layout for print */
                html, body, #root, #root > div, main {
                  background: white !important;
                  color: black !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 100% !important;
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  display: block !important;
                  position: static !important;
                }

                /* Override modal container styling to render inline on print page */
                .fixed.inset-0 {
                  position: static !important;
                  display: block !important;
                  background: transparent !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  backdrop-filter: none !important;
                  overflow: visible !important;
                }

                /* Override modal card wrapper styling */
                .relative.max-w-2xl {
                  max-width: 100% !important;
                  width: 100% !important;
                  height: auto !important;
                  max-height: none !important;
                  border: none !important;
                  box-shadow: none !important;
                  overflow: visible !important;
                  display: block !important;
                  position: static !important;
                }

                /* Ensure printable element expands naturally */
                #printable-invoice {
                  display: block !important;
                  width: 100% !important;
                  height: auto !important;
                  overflow: visible !important;
                  padding: 0 !important;
                  margin: 0 !important;
                }

                @page {
                  size: auto;
                  margin: 15mm 20mm;
                }
              }
            `}</style>

            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-[#FAF9F6] print:hidden">
              <span className="text-xs font-extrabold text-slate-450 uppercase tracking-wider">
                {settings?.invoice?.invoiceHeader || 'Billing Invoice Voucher'}
              </span>
              <button 
                onClick={() => setActiveInvoice(null)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-[#FAF9F6] text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Printable Content */}
            <div id="printable-invoice" className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-700 print:overflow-visible print:p-0">
              
              {/* Invoice Header block */}
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  {settings?.receipt?.showLogo && (
                    <div className="mb-2">
                      {settings?.institute?.logo && settings.institute.logo.startsWith('http') ? (
                        <img 
                          src={settings.institute.logo} 
                          alt="Logo" 
                          className="h-10 w-auto object-contain" 
                        />
                      ) : (
                        <div className="h-10 w-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shadow-amber-500/10">
                          <GraduationCap size={22} className="stroke-[2.5]" />
                        </div>
                      )}
                    </div>
                  )}
                  <h2 className="text-base font-extrabold text-slate-900 mt-1">
                    {settings?.institute?.name || 'JCMS ERP Academy'}
                  </h2>
                  <p className="text-[10px] text-slate-400 leading-normal max-w-[250px]">
                    {settings?.institute?.address || '12, Corporate Block, Educational Hub'}, {settings?.institute?.city || 'New Delhi'}, {settings?.institute?.state || 'Delhi'} - {settings?.institute?.pincode || '110001'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-800">{activeInvoice.invoiceNumber}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Issued: {formatDate(activeInvoice.issueDate)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-red">Due Date: {formatDate(activeInvoice.dueDate)}</p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Bill to Section */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                <div className="space-y-1 bg-[#FAF9F6]/50 p-4 border border-[#EBEAE6] rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Bill To Student:</span>
                  <div className="text-slate-800 font-bold">{activeInvoice.studentId?.fullName || 'N/A'}</div>
                  <div className="text-slate-500 font-mono">Reg ID: {activeInvoice.studentId?.studentId || 'N/A'}</div>
                  <div className="text-slate-500">Course Class: {activeInvoice.studentId?.course || 'N/A'}</div>
                </div>
                <div className="space-y-1 bg-[#FAF9F6]/50 p-4 border border-[#EBEAE6] rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Billing Parameters:</span>
                  <div>Year FY: <span className="text-slate-800 font-bold">{settings?.fee?.financialYear || '2026-2027'}</span></div>
                  <div>Installment Term: <span className="text-slate-800 font-bold">Term #{activeInvoice.installmentId?.installmentNo || 'N/A'}</span></div>
                  <div>Account Status: <StatusBadge status={activeInvoice.status} /></div>
                </div>
              </div>

              {/* Items details table */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">
                      <th className="px-4 py-3">Fee Particular description</th>
                      <th className="px-4 py-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-semibold text-slate-655">
                      <td className="px-4 py-3">
                        ERP Fee Term Installment (Particular Item charge: Class {activeInvoice.studentId?.course || 'N/A'})
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800">{formatINR(activeInvoice.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Installment History Ledger Statement */}
              {activeInstallments.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-[10px] uppercase tracking-wide text-slate-400 font-extrabold pb-1 border-b border-slate-100">
                    Installment Ledger Summary (Full Fee Plan Details)
                  </h4>
                  <div className="border border-slate-150 rounded-2xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[9px] font-extrabold text-slate-500 uppercase tracking-wide">
                          <th className="px-4 py-2">Installment Term</th>
                          <th className="px-4 py-2">Due Date</th>
                          <th className="px-4 py-2 text-right">Term Amount</th>
                          <th className="px-4 py-2 text-right">Remaining Due</th>
                          <th className="px-4 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activeInstallments.map((inst) => {
                          const isCurrent = activeInvoice.installmentId?._id === inst._id;
                          return (
                            <tr 
                              key={inst._id} 
                              className={`border-b border-slate-100 font-semibold text-slate-655 ${
                                isCurrent ? 'bg-amber-50/40 text-slate-800 font-bold' : ''
                              }`}
                            >
                              <td className="px-4 py-2 flex items-center gap-1.5">
                                <span>Term #{inst.installmentNo}</span>
                                {isCurrent && (
                                  <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-700 font-bold uppercase rounded-md tracking-wider">
                                    Current Invoice
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2 text-slate-500">{formatDate(inst.dueDate)}</td>
                              <td className="px-4 py-2 text-right">{formatINR(inst.amount)}</td>
                              <td className="px-4 py-2 text-right">{formatINR(inst.remainingAmount)}</td>
                              <td className="px-4 py-2 text-center">
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold inline-block border ${
                                  inst.status === 'PAID' 
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600' 
                                    : inst.status === 'OVERDUE'
                                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                                    : 'bg-amber-50 border-amber-100 text-amber-600'
                                }`}>
                                  {inst.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Terms and Sign block */}
              <div className="grid grid-cols-2 gap-6 pt-2">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Terms & Conditions:</span>
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                    {settings?.invoice?.termsAndConditions || 'Fees once paid are non-refundable under normal circumstances. Pay before due date to avoid late fine assessments.'}
                  </p>
                </div>
                <div className="text-center self-end space-y-12">
                  <div className="h-px bg-slate-300 w-2/3 mx-auto" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-450 font-bold block">
                    {settings?.invoice?.signaturePlaceholder || 'Authorized Signatory'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-[#FAF9F6] bg-slate-50 print:hidden">
              <button 
                onClick={() => setActiveInvoice(null)}
                className="py-2 px-4 border border-[#DEDCD8] hover:bg-[#FAF9F6] rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <button 
                onClick={handlePrint}
                className="py-2 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
              >
                Print / Download PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Invoices;
