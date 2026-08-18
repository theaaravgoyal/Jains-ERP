import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Phone, Mail, BookOpen, 
  Calendar, CreditCard, CheckCircle2, AlertTriangle, 
  FileText, CircleDot, Clock, Eye, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useSystemSettings } from '../context/SettingsContext';
import StatusBadge from '../components/StatusBadge';
import DatePicker from '../components/DatePicker';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { useStudents } from '../hooks/useStudents';
import { useFeePlans } from '../hooks/useFeePlans';
import { usePayments } from '../hooks/usePayments';

const StudentProfile = ({ studentId, onNavigate }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSystemSettings();

  // Custom data hooks
  const { studentProfile, loading: studentLoading, error: studentError, refetchProfile } = useStudents(studentId);
  const { feePlan, installments, loading: planLoading, error: planError, refetch: refetchPlan } = useFeePlans(studentId);
  const { studentPayments, activityLogs, loading: paymentsLoading, error: paymentsError, refetchStudentData, collectPayment } = usePayments(studentId);

  const safeInstallments = installments || [];
  const safePayments = studentPayments || [];
  const safeLogs = activityLogs || [];

  // Modal control
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'INSTALLMENT_PAYMENT',
    paymentMode: 'UPI',
    amount: '',
    installmentId: '',
    transactionId: '',
    remarks: '',
    paymentDate: new Date().toISOString().split('T')[0]
  });

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleRefreshAll = () => {
    refetchProfile();
    refetchPlan();
    refetchStudentData();
  };

  // Sync auto-open payment modal triggers
  useEffect(() => {
    if (studentProfile && searchParams.get('collect') === 'true') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('collect');
      setSearchParams(newParams);
      handleOpenPaymentModal();
    }
  }, [studentProfile]);

  const handleOpenPaymentModal = (preselectedInstallment = null) => {
    const defaultType = studentProfile?.feePlan?.paymentPlan === 'FULL_PAYMENT' ? 'FULL_PAYMENT' : 'INSTALLMENT_PAYMENT';
    setPaymentForm({
      paymentType: preselectedInstallment ? 'INSTALLMENT_PAYMENT' : defaultType,
      paymentMode: 'UPI',
      amount: preselectedInstallment ? preselectedInstallment.remainingAmount : '',
      installmentId: preselectedInstallment ? preselectedInstallment._id : '',
      transactionId: '',
      remarks: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
    setIsPaymentModalOpen(true);
  };

  const handleInputChange = (name, value) => {
    setPaymentForm(prev => {
      const updated = { ...prev, [name]: value };
      
      // Auto-prefill amount if linking to specific installment
      if (name === 'installmentId' && value) {
        const inst = safeInstallments.find(i => i._id === value);
        if (inst) {
          updated.amount = inst.remainingAmount;
          updated.paymentType = 'INSTALLMENT_PAYMENT';
        }
      }
      
      return updated;
    });
  };

  const handleCollectPaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      showToast('Please specify a valid payment amount.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: studentProfile._id,
        paymentType: paymentForm.paymentType,
        paymentMode: paymentForm.paymentMode,
        amount: Number(paymentForm.amount),
        installmentId: paymentForm.installmentId || undefined,
        transactionId: paymentForm.transactionId,
        remarks: paymentForm.remarks,
        paymentDate: paymentForm.paymentDate
      };

      const res = await collectPayment(payload);
      if (res.success) {
        showToast('Payment collected successfully!');
        setIsPaymentModalOpen(false);
        handleRefreshAll();
      }
    } catch (err) {
      console.error('Collect payment error:', err);
      showToast(err.response?.data?.message || 'Transaction failed to complete.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper date/time formatters
  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === '-') return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Live indicators computed locally
  const unpaidInstallments = safeInstallments.filter(inst => inst.status !== 'PAID');
  const nextOverdueInst = safeInstallments.find(inst => inst.status === 'OVERDUE');
  const nextPendingInst = safeInstallments.find(inst => inst.status === 'PENDING');
  const nextDueDate = nextOverdueInst?.dueDate || nextPendingInst?.dueDate || '-';

  if (studentLoading && !studentProfile) {
    return <Loader message="Loading Financial Profile..." />;
  }

  if (!studentProfile) {
    return (
      <div className="bg-white border border-[#EBEAE6] p-8 text-center rounded-2xl">
        <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
        <h4 className="text-sm font-extrabold text-slate-800">Student Profile Not Found</h4>
        <p className="text-xs text-slate-400 mt-1">Please select an active enrollment from the student list.</p>
        <button 
          onClick={() => onNavigate('students')}
          className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 border-0 rounded-xl text-xs font-bold transition-all text-slate-700 cursor-pointer"
        >
          Go to Student List
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast popup */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('students')}
            className="p-2 rounded-xl border border-[#DEDCD8] hover:bg-[#FAF9F6] text-slate-600 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider block">Student Directory Profile</span>
            <h3 className="text-sm font-extrabold text-slate-800">{studentProfile.fullName} ({studentProfile.studentId})</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl border border-[#DEDCD8] hover:bg-[#FAF9F6] text-slate-500 bg-white transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Refresh Details"
          >
            <RefreshCw size={15} />
          </button>
          {studentProfile.feePlan && studentProfile.feePlan.remainingAmount > 0 && (
            <button
              onClick={() => handleOpenPaymentModal()}
              className="flex-1 sm:flex-initial py-2.5 px-4 bg-amber-500 hover:bg-amber-600 border-0 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer hover:shadow-md active:scale-98"
            >
              Collect Payment
            </button>
          )}
        </div>
      </div>

      {/* Sticky Fee Summary Cards */}
      <div className="sticky top-0 z-10 flex flex-wrap gap-3 bg-slate-50/90 backdrop-blur-md py-3 border-b border-[#EBEAE6] -mx-4 px-4">
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Total Course Fee</span>
          <h4 className="text-xs font-extrabold text-slate-800 truncate">{formatINR(studentProfile.feePlan?.totalFees)}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-emerald-500 uppercase font-extrabold tracking-wider block font-bold">Paid Amount</span>
          <h4 className="text-xs font-extrabold text-emerald-600 truncate">{formatINR(studentProfile.feePlan?.paidAmount)}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-blue-500 uppercase font-extrabold tracking-wider block font-bold">Advance Credit</span>
          <h4 className="text-xs font-extrabold text-blue-600 truncate">{formatINR(studentProfile.feePlan?.advanceCreditBalance || 0)}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-red-500 uppercase font-extrabold tracking-wider block font-bold">Remaining Amount</span>
          <h4 className="text-xs font-extrabold text-rose-600 truncate">{formatINR(studentProfile.feePlan?.remainingAmount)}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block font-bold">Plan Details</span>
          <h4 className="text-xs font-extrabold text-slate-800 truncate">{studentProfile.feePlan?.paymentPlan || 'Not set'}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Unpaid Installments</span>
          <h4 className="text-xs font-extrabold text-slate-800 truncate">{unpaidInstallments.length} / {installments.length}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Next Due Date</span>
          <h4 className="text-xs font-extrabold text-slate-800 truncate">{formatDate(nextDueDate)}</h4>
        </div>
        <div className="bg-white border border-[#EBEAE6] rounded-xl p-3 shadow-xs space-y-0.5 min-w-[120px]">
          <span className="text-[9px] text-slate-400 uppercase font-extrabold tracking-wider block">Plan Status</span>
          <div className="truncate"><StatusBadge status={studentProfile.feePlan?.status || 'PENDING'} /></div>
        </div>
      </div>

      {studentError && <ErrorState message={studentError} onRetry={handleRefreshAll} />}

      {/* Profile Details Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side: General Profile Info Card */}
        <div className="space-y-6">
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <User size={14} className="text-amber-500" />
              <span>General Profile Info</span>
            </h4>
            
            <div className="space-y-3.5 text-xs font-semibold text-slate-655">
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Full Name</span>
                <span className="text-slate-800">{studentProfile.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Student ID</span>
                <span className="text-slate-800 font-mono">{studentProfile.studentId}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Course Class</span>
                <span className="text-slate-800">{studentProfile.course}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Contact Number</span>
                <span className="text-slate-850">{studentProfile.mobile}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Email Address</span>
                <span className="text-slate-850 font-normal">{studentProfile.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Father's Name</span>
                <span className="text-slate-800">{studentProfile.fatherName || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Residential Address</span>
                <span className="text-slate-800 text-right max-w-[150px] truncate">{studentProfile.address || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Status</span>
                <StatusBadge status={studentProfile.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Installments & Logs View Grid */}
        <div className="lg:flex-[2] min-w-0 space-y-6">
          
          {/* Installments Table Card */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <Clock size={14} className="text-slate-400" />
              <span>Student Installments Breakdown</span>
            </h4>

            {planLoading ? <Loader inline message="Syncing installment logs..." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                  <thead>
                    <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3">Inst No</th>
                      <th className="pb-3">Due Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Paid</th>
                      <th className="pb-3">Remaining</th>
                      <th className="pb-3 text-right">Status</th>
                      <th className="pb-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF9F6]">
                    {safeInstallments.map((inst) => (
                      <tr key={inst._id}>
                        <td className="py-2.5 font-bold text-slate-800">Inst #{inst.installmentNo}</td>
                        <td className="py-2.5 text-slate-500">{formatDate(inst.dueDate)}</td>
                        <td className="py-2.5 text-slate-700">
                          {formatINR(inst.amount)}
                          {inst.advanceApplied > 0 && (
                            <span className="block text-[9px] text-blue-600 font-bold">
                              +{formatINR(inst.advanceApplied)} advance applied
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-emerald-650">{formatINR(inst.paidAmount)}</td>
                        <td className="py-2.5 text-slate-800 font-extrabold">{formatINR(inst.remainingAmount)}</td>
                        <td className="py-2.5 text-right"><StatusBadge status={inst.status} /></td>
                        <td className="py-2.5 text-right">
                          {inst.status !== 'PAID' && (
                            <button
                              onClick={() => handleOpenPaymentModal(inst)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100/50 text-amber-600 rounded-lg text-[10px] font-extrabold border border-amber-200 transition-all cursor-pointer"
                            >
                              Pay Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {safeInstallments.length === 0 && (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400 font-bold text-[11px]">No installment schedules configured for student.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payment Collection Transactions History */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-500" />
              <span>Payments Collation History</span>
            </h4>

            {paymentsLoading ? <Loader inline message="Syncing ledger registry..." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-semibold text-slate-655">
                  <thead>
                    <tr className="border-b border-[#EBEAE6] text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      <th className="pb-3">Transaction ID</th>
                      <th className="pb-3">Mode</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Payment Date</th>
                      <th className="pb-3">Amount</th>
                      <th className="pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#FAF9F6]">
                    {safePayments.map((pay) => (
                      <tr key={pay._id}>
                        <td className="py-2.5 font-mono text-slate-550 font-bold">{pay.transactionId || 'Cash Sale'}</td>
                        <td className="py-2.5 text-slate-700 font-bold">{pay.paymentMode}</td>
                        <td className="py-2.5"><span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{pay.paymentType}</span></td>
                        <td className="py-2.5 text-slate-500">{formatDate(pay.paymentDate)}</td>
                        <td className="py-2.5 text-emerald-650 font-extrabold">
                          {formatINR(pay.amount)}
                          {pay.advanceAmount > 0 && (
                            <span className="block text-[9px] text-blue-600 font-bold">
                              +{formatINR(pay.advanceAmount)} Extra Credit
                            </span>
                          )}
                        </td>
                        <td className="py-2.5"><StatusBadge status="PAID" /></td>
                      </tr>
                    ))}
                    {safePayments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-slate-400 font-bold text-[11px]">No transactions cataloged.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* Manual cashier collection dialog drawer */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-[#EBEAE6] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex justify-between items-center pb-3 border-b border-[#FAF9F6]">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Collect Manual Payment</h4>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-[#FAF9F6] text-slate-400 hover:text-slate-600 transition-all cursor-pointer outline-none"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCollectPaymentSubmit} className="space-y-4 text-xs font-bold text-slate-655">
              
              <div className="flex flex-wrap gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Payment Type</label>
                  <select 
                    value={paymentForm.paymentType}
                    onChange={(e) => handleInputChange('paymentType', e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                  >
                    <option value="INSTALLMENT_PAYMENT">Installment Payment</option>
                    <option value="INITIAL_PAYMENT">Initial / Admission Payment</option>
                    <option value="PARTIAL_PAYMENT">Partial Payment</option>
                    <option value="ADVANCE_PAYMENT">Advance Payment</option>
                    <option value="FULL_PAYMENT">Full Plan Settlement</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Payment Mode</label>
                  <select 
                    value={paymentForm.paymentMode}
                    onChange={(e) => handleInputChange('paymentMode', e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                  >
                    <option value="UPI">UPI / GPay</option>
                    <option value="Cash">Cash Sale</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque Deposit</option>
                  </select>
                </div>
              </div>

              {(paymentForm.paymentType === 'INSTALLMENT_PAYMENT' || paymentForm.paymentType === 'PARTIAL_PAYMENT') && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Select Target Installment *</label>
                  <select 
                    value={paymentForm.installmentId}
                    onChange={(e) => handleInputChange('installmentId', e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                    required
                  >
                    <option value="">-- Choose Installment --</option>
                    {safeInstallments.filter(i => i.status !== 'PAID').map(i => (
                      <option key={i._id} value={i._id}>Inst #{i.installmentNo} &mdash; Due {formatDate(i.dueDate)} ({formatINR(i.remainingAmount)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Excess credit live calculation banner */}
              {paymentForm.paymentType === 'INSTALLMENT_PAYMENT' && paymentForm.installmentId && (() => {
                const targetInst = safeInstallments.find(i => i._id === paymentForm.installmentId);
                const enteredAmt = Number(paymentForm.amount) || 0;
                if (targetInst && enteredAmt > targetInst.remainingAmount) {
                  const extra = enteredAmt - targetInst.remainingAmount;
                  return (
                    <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] font-semibold text-amber-900 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Scheduled Term Balance:</span>
                        <span className="font-bold">{formatINR(targetInst.remainingAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount Received:</span>
                        <span className="font-bold">{formatINR(enteredAmt)}</span>
                      </div>
                      <div className="flex justify-between text-blue-700 font-extrabold border-t border-amber-200/60 pt-1">
                        <span>Advance Credit to Auto-Adjust:</span>
                        <span>+ {formatINR(extra)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="flex flex-wrap gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Payment Amount (₹) *</label>
                  <input 
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    required
                    min="1"
                  />
                </div>

                <DatePicker
                  label="Payment Date"
                  value={paymentForm.paymentDate}
                  onChange={(val) => handleInputChange('paymentDate', val)}
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Reference / Transaction ID</label>
                <input 
                  type="text"
                  value={paymentForm.transactionId}
                  onChange={(e) => handleInputChange('transactionId', e.target.value)}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  placeholder="e.g. TXN987654321"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Remarks / Notes</label>
                <input 
                  type="text"
                  value={paymentForm.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  placeholder="e.g. Received via cashier desk"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={submitting}
                  className="w-full py-2 border border-[#DEDCD8] bg-white text-slate-600 hover:bg-[#FAF9F6] rounded-xl font-bold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer transition-all shadow-sm shadow-amber-500/10 flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? <RefreshCw size={12} className="animate-spin" /> : null}
                  <span>Collect Payment</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default StudentProfile;
