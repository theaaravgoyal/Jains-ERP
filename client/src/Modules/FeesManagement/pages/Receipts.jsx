import React, { useState, useEffect, useMemo } from 'react';
import { Eye, Printer, X, RefreshCw, GraduationCap } from 'lucide-react';
import { useSystemSettings } from '../context/SettingsContext';
import { feesApi } from '../../../api/feesApi';
import CommonTable from '../components/CommonTable';
import StatusBadge from '../components/StatusBadge';
import FilterPanel from '../components/FilterPanel';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';

const Receipts = () => {
  const { settings } = useSystemSettings();
  const [paymentModeFilter, setPaymentModeFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('All'); // All, today, week, month
  
  // Data states
  const [receiptsList, setReceiptsList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeReceipt, setActiveReceipt] = useState(null);
  
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

  const fetchReceipts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 20,
        paymentMode: paymentModeFilter === 'All' ? undefined : paymentModeFilter,
        dateFilter: dateFilter === 'All' ? undefined : dateFilter,
        search: searchQuery === '' ? undefined : searchQuery
      };
      const res = await feesApi.getReceipts(params);
      if (res.success) {
        setReceiptsList(res.data.receipts || []);
        setTotalCount(res.data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching receipts:', err);
      setError('Failed to fetch receipts ledger from database.');
    } finally {
      setLoading(false);
    }
  };

  const loadReceiptDetails = async (id) => {
    setModalLoading(true);
    try {
      const res = await feesApi.getReceiptById(id);
      if (res.success) {
        setActiveReceipt(res.data);
      }
    } catch (err) {
      console.error('Error loading receipt details:', err);
      showToast('Failed to load receipt details.', 'error');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [page, paymentModeFilter, dateFilter]);

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
      header: 'Receipt ID',
      accessor: 'receiptNumber',
      render: (rcp) => <span className="font-mono text-slate-500 font-bold">{rcp.receiptNumber}</span>
    },
    {
      header: 'Student Name',
      accessor: 'studentId',
      render: (rcp) => (
        <div>
          <div className="font-bold text-slate-800">{rcp.studentId?.fullName || 'N/A'}</div>
          <span className="text-[10px] text-slate-400 font-semibold">{rcp.studentId?.studentId || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Course',
      accessor: 'studentId',
      render: (rcp) => <span className="text-slate-655">{rcp.studentId?.course || 'N/A'}</span>
    },
    {
      header: 'Amount Paid',
      accessor: 'amount',
      render: (rcp) => <span className="font-extrabold text-slate-800">{formatINR(rcp.amount)}</span>
    },
    {
      header: 'Payment Mode',
      accessor: 'paymentMode',
      render: (rcp) => <span className="text-slate-700 font-bold">{rcp.paymentMode}</span>
    },
    {
      header: 'Receipt Date',
      accessor: 'generatedDate',
      render: (rcp) => <span className="text-slate-500">{formatDate(rcp.generatedDate)}</span>
    },
    {
      header: 'Status',
      render: () => <StatusBadge status="PAID" />
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (rcp) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => loadReceiptDetails(rcp._id)}
            className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-slate-655 hover:bg-[#FAF9F6] transition-all cursor-pointer"
            title="Preview Receipt"
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
        value={paymentModeFilter}
        onChange={(e) => setPaymentModeFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Modes</option>
        <option value="Cash">Cash</option>
        <option value="UPI">UPI</option>
        <option value="Bank Transfer">Bank Transfer</option>
        <option value="Cheque">Cheque</option>
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
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Fees Collection Receipts</h3>
          <p className="text-[10px] font-semibold text-slate-400">Total receipts generated: {totalCount}</p>
        </div>
        <button 
          onClick={fetchReceipts}
          className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs active:scale-95"
          title="Refresh receipts"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={fetchReceipts} />}

      <div className="print:hidden">
        <CommonTable
          columns={columns}
          data={receiptsList}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search Receipt No, Student Name, Student ID..."
          emptyMessage="No billing receipts found matching selection."
          filters={dropdownFilters}
          itemsPerPage={20}
        />
      </div>

      {/* Receipt Modal Preview Drawer */}
      {activeReceipt && (
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
                #printable-receipt {
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
                {settings?.receipt?.receiptHeader || 'Fees Collection Receipt Voucher'}
              </span>
              <button 
                onClick={() => setActiveReceipt(null)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-[#FAF9F6] text-slate-400 hover:text-slate-600 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Printable Content */}
            <div id="printable-receipt" className="flex-1 overflow-y-auto p-8 space-y-6 text-slate-700 print:overflow-visible print:p-0">
              
              {/* Receipt Header block */}
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
                    {settings?.institute?.name || 'Jains Computer'}
                  </h2>
                  <p className="text-[10px] text-slate-450 leading-normal max-w-[250px]">
                    {settings?.institute?.address || '13, Shivpuri Colony, Main Kalwar Road, Jhotwara'}, {settings?.institute?.city || 'Jaipur'}, {settings?.institute?.state || 'Rajasthan'} - {settings?.institute?.pincode || '302012'}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <h3 className="text-lg font-extrabold text-slate-800">{activeReceipt.receiptNumber}</h3>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Date Generated: {formatDate(activeReceipt.generatedDate)}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-650">Billing status: PAID</p>
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Bill to Section */}
              <div className="flex gap-4 text-xs font-semibold">
                <div className="space-y-1 bg-[#FAF9F6]/50 p-4 border border-[#EBEAE6] rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Received From Student:</span>
                  <div className="text-slate-800 font-bold">{activeReceipt.studentId?.fullName || 'N/A'}</div>
                  <div className="text-slate-500 font-mono">Reg ID: {activeReceipt.studentId?.studentId || 'N/A'}</div>
                  <div className="text-slate-500">Course Class: {activeReceipt.studentId?.course || 'N/A'}</div>
                </div>
                <div className="space-y-1 bg-[#FAF9F6]/50 p-4 border border-[#EBEAE6] rounded-2xl">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Collection Mode:</span>
                  <div>Year FY: <span className="text-slate-800 font-bold">{settings?.fee?.financialYear || '2026-2027'}</span></div>
                  <div>Payment Mode: <span className="text-slate-850 font-bold">{activeReceipt.paymentMode}</span></div>
                  <div>Audit status: <span className="text-emerald-600 font-extrabold">Sync Active</span></div>
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
                        ERP Fee Payment Receipt (Voucher collection item: Class {activeReceipt.studentId?.course || 'N/A'})
                      </td>
                      <td className="px-4 py-3 text-right font-extrabold text-slate-800">{formatINR(activeReceipt.amount)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Terms and Sign block */}
              <div className="flex gap-6 pt-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-wide text-slate-400 font-extrabold">Receipt Notes:</span>
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed">
                    {settings?.receipt?.receiptFooter || 'This is an electronically generated receipt voucher and does not require a physical signature.'}
                  </p>
                </div>
                <div className="flex flex-col items-center justify-end text-center space-y-1">
                  <div className="h-12 flex items-center justify-center">
                    <img 
                      src="/AuthSingh.jpeg" 
                      alt="Authorized Signatory" 
                      className="max-h-12 w-auto object-contain"
                      style={{ filter: 'brightness(0)' }}
                    />
                  </div>
                  <div className="h-px bg-slate-400 w-36 mx-auto" />
                  <span className="text-[10px] uppercase tracking-wider text-slate-700 font-extrabold block">
                    {settings?.receipt?.signaturePlaceholder || 'Authorized Signatory / Cashier'}
                  </span>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-2.5 p-4 border-t border-[#FAF9F6] bg-slate-50 print:hidden">
              <button 
                onClick={() => setActiveReceipt(null)}
                className="py-2 px-4 border border-[#DEDCD8] hover:bg-[#FAF9F6] rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
              >
                Close Preview
              </button>
              <button 
                onClick={handlePrint}
                className="py-2 px-5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm shadow-amber-500/10 active:scale-95"
              >
                Print Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Receipts;
