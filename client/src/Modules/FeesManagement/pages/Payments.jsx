import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, User, CreditCard, 
  Check, DollarSign, Wallet, RefreshCw
} from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { formatDate } from '../../../utils/dateUtils';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import { useStudents } from '../hooks/useStudents';
import { useFeePlans } from '../hooks/useFeePlans';
import { usePayments } from '../hooks/usePayments';

const Payments = ({ studentId, onNavigate }) => {
  const { students, loading: studentsLoading, error: studentsError } = useStudents();
  const { collectPayment } = usePayments();
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Custom hook for fee plans & installments of the selected student
  const { 
    installments, 
    loading: installmentsLoading, 
    refetch: refetchInstallments 
  } = useFeePlans(selectedStudent?._id);

  const [paymentForm, setPaymentForm] = useState({
    paymentType: 'INSTALLMENT_PAYMENT',
    amount: '',
    paymentMode: 'UPI',
    transactionId: '',
    remarks: '',
    paymentDate: new Date().toISOString().split('T')[0],
    installmentId: ''
  });

  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const lastLoadedStudentId = useRef('');

  // Auto-populate installment and due amount on student change
  useEffect(() => {
    if (selectedStudent) {
      const studentIdStr = selectedStudent._id;
      if (lastLoadedStudentId.current !== studentIdStr) {
        const remaining = selectedStudent.feePlan?.remainingAmount || 0;
        if (installments && installments.length > 0) {
          const nextInstallment = installments.find(i => i.status !== 'PAID');
          if (nextInstallment) {
            setPaymentForm(prev => ({
              ...prev,
              paymentType: 'INSTALLMENT_PAYMENT',
              installmentId: nextInstallment._id,
              amount: nextInstallment.remainingAmount || ''
            }));
            lastLoadedStudentId.current = studentIdStr;
          } else {
            setPaymentForm(prev => ({
              ...prev,
              paymentType: selectedStudent.feePlan?.paymentPlan === 'FULL_PAYMENT' ? 'FULL_PAYMENT' : 'ADVANCE_PAYMENT',
              installmentId: '',
              amount: remaining || ''
            }));
            lastLoadedStudentId.current = studentIdStr;
          }
        } else if (!installmentsLoading) {
          setPaymentForm(prev => ({
            ...prev,
            paymentType: selectedStudent.feePlan?.paymentPlan === 'FULL_PAYMENT' ? 'FULL_PAYMENT' : 'INITIAL_PAYMENT',
            installmentId: '',
            amount: remaining || ''
          }));
          lastLoadedStudentId.current = studentIdStr;
        }
      }
    } else {
      lastLoadedStudentId.current = '';
    }
  }, [selectedStudent, installments, installmentsLoading]);

  // Find and setup initial student profile
  useEffect(() => {
    if (students.length > 0) {
      let initial = null;
      if (studentId) {
        initial = students.find(s => s._id === studentId || s.studentId === studentId);
      }
      if (!initial) {
        // Find first active student with remaining balance
        initial = students.find(s => s.status === 'ACTIVE' && s.feePlan?.remainingAmount > 0) || students[0];
      }
      if (initial) {
        setSelectedStudent(initial);
      }
    }
  }, [studentId, students]);

  // Sync selected student if studentId prop changes after mount
  useEffect(() => {
    if (studentId && students.length > 0) {
      const target = students.find(s => s._id === studentId || s.studentId === studentId);
      if (target) {
        setSelectedStudent(target);
      }
    }
  }, [studentId, students]);

  // Handle student selection change
  const handleStudentChange = (e) => {
    const target = students.find(s => s._id === e.target.value);
    if (target) {
      setSelectedStudent(target);
      setPaymentForm(prev => ({
        ...prev,
        amount: '',
        installmentId: ''
      }));
      setValidationError('');
    }
  };

  // Pre-fill amount when selecting an installment
  const handleInstallmentChange = (e) => {
    const instId = e.target.value;
    const inst = installments.find(i => i._id === instId);
    setPaymentForm(prev => ({
      ...prev,
      installmentId: instId,
      paymentType: instId ? 'INSTALLMENT_PAYMENT' : 'ADVANCE_PAYMENT',
      amount: inst ? inst.remainingAmount : ''
    }));
    setValidationError('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
    setValidationError('');
  };

  // Collect Payment Form Submission
  const handleCollectPayment = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setValidationError("Please specify a valid payment collection amount.");
      return;
    }

    const payAmount = Number(paymentForm.amount);
    const totalRemaining = selectedStudent.feePlan?.remainingAmount || 0;

    if (payAmount > totalRemaining) {
      setValidationError(`Payment amount (₹${payAmount}) cannot exceed remaining balance (₹${totalRemaining}).`);
      return;
    }

    setSubmitting(true);
    setValidationError('');
    try {
      let finalPaymentType = paymentForm.paymentType;
      if (paymentForm.paymentType === 'INSTALLMENT_PAYMENT' && !paymentForm.installmentId) {
        finalPaymentType = 'ADVANCE_PAYMENT';
      }

      const payload = {
        studentId: selectedStudent._id,
        paymentType: finalPaymentType,
        paymentMode: paymentForm.paymentMode,
        amount: payAmount,
        installmentId: finalPaymentType === 'INSTALLMENT_PAYMENT' ? (paymentForm.installmentId || null) : null,
        transactionId: paymentForm.transactionId,
        remarks: paymentForm.remarks,
        paymentDate: paymentForm.paymentDate
      };

      const res = await collectPayment(payload);
      if (res.success) {
        setPaymentSuccess(true);
        setTimeout(() => {
          setPaymentSuccess(false);
          onNavigate('payments-history');
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      setValidationError(err.response?.data?.message || 'Failed to collect payment. Please verify inputs.');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  if (studentsLoading && !selectedStudent) {
    return <Loader message="Syncing student register ledger..." />;
  }

  if (studentsError) {
    return <ErrorState message={studentsError} />;
  }

  if (paymentSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-[#EBEAE6] rounded-2xl shadow-sm text-center py-24 space-y-4 animate-fade-in">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center animate-bounce shadow-md">
          <Check size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800">Payment Processed Successfully</h3>
          <p className="text-xs text-slate-400 font-semibold leading-normal max-w-sm">Transaction receipt logged and balances updated inside database records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('dashboard')}
            className="p-2 rounded-xl border border-[#DEDCD8] hover:bg-[#FAF9F6] text-slate-655 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider block">Manual Processing</span>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Collect Student Fees</h3>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 text-xs font-bold p-4 rounded-2xl animate-fade-in flex items-center gap-2">
          <span>{validationError}</span>
        </div>
      )}

      <form onSubmit={handleCollectPayment} className="flex flex-col lg:flex-row gap-6 text-xs font-bold text-slate-655">
        
        {/* Left Form fields panel (Spans 2/3) */}
        <div className="lg:flex-[2] min-w-0 space-y-6">
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-5">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <User size={14} className="text-amber-500" />
              <span>Student Account Registry</span>
            </h4>

            <div className="flex flex-wrap gap-4">
              
              {/* Student Dropdown Selector */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Select Active Student *</label>
                <select
                  value={selectedStudent?._id || ''}
                  onChange={handleStudentChange}
                  className="w-full px-3 py-2.5 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.fullName} ({s.studentId}) &mdash; {s.course}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Type Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Payment Classification *</label>
                <select
                  name="paymentType"
                  value={paymentForm.paymentType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  <option value="INSTALLMENT_PAYMENT">Installment Payment</option>
                  <option value="INITIAL_PAYMENT">Initial / Admission Payment</option>
                  <option value="ADVANCE_PAYMENT">Advance Payment</option>
                  <option value="PARTIAL_PAYMENT">Partial Payment</option>
                  <option value="FULL_PAYMENT">Full Plan Settlement</option>
                </select>
              </div>

              {/* Installment Link Dropdown Selector */}
              {paymentForm.paymentType === 'INSTALLMENT_PAYMENT' && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Link Payment to Installment *</label>
                  <select
                    value={paymentForm.installmentId}
                    onChange={handleInstallmentChange}
                    disabled={installmentsLoading || installments.length === 0}
                    className="w-full px-3 py-2.5 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400 disabled:opacity-50"
                    required
                  >
                    <option value="">-- Choose Installment --</option>
                    {installments.filter(i => i.status !== 'PAID').map(i => (
                      <option key={i._id} value={i._id}>
                        Inst #{i.installmentNo} &mdash; Due {formatDate(i.dueDate)} ({formatINR(i.remainingAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Live Overpayment / Advance Credit Banner */}
              {paymentForm.paymentType === 'INSTALLMENT_PAYMENT' && paymentForm.installmentId && (() => {
                const targetInst = installments.find(i => i._id === paymentForm.installmentId);
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

              {/* Amount field */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Collection Amount (₹) *</label>
                <input
                  type="number"
                  name="amount"
                  value={paymentForm.amount}
                  onChange={handleInputChange}
                  placeholder="e.g. 5000"
                  className="w-full px-3 py-2.5 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  min="1"
                />
              </div>

              {/* Billing Mode dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Payment Mode *</label>
                <select
                  name="paymentMode"
                  value={paymentForm.paymentMode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2.5 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="Cash">Cash Vouchers</option>
                  <option value="Bank Transfer">Direct Bank Transfer</option>
                  <option value="Cheque">Cheque Deposit</option>
                </select>
              </div>

              {/* Datepicker */}
              <DatePicker
                label="Payment Receipt Date"
                value={paymentForm.paymentDate}
                onChange={(val) => handleInputChange({ target: { name: 'paymentDate', value: val } })}
              />

              {/* Reference ID */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Transaction Reference ID</label>
                <input
                  type="text"
                  name="transactionId"
                  value={paymentForm.transactionId}
                  onChange={handleInputChange}
                  placeholder="e.g. TXN987654321"
                  className="w-full px-3 py-2.5 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="block text-[10px] uppercase text-slate-400 font-bold">Remarks / Internal Note</label>
              <textarea
                name="remarks"
                value={paymentForm.remarks}
                onChange={handleInputChange}
                placeholder="Remarks regarding fee concessions, cash collectors, etc..."
                className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400 h-16"
              />
            </div>
          </div>
        </div>

        {/* Right side: Student Profile snapshot */}
        <div className="space-y-6">
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1">
              <Wallet size={13} className="text-amber-500" />
              <span>Student Profile Ledger</span>
            </h4>

            {selectedStudent ? (
              <div className="space-y-3.5 text-xs font-semibold text-slate-655">
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-slate-400">Student Name</span>
                  <span className="text-slate-800">{selectedStudent.fullName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-slate-400">Student ID</span>
                  <span className="text-slate-800 font-mono">{selectedStudent.studentId}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-slate-400">Course / Batch</span>
                  <span className="text-slate-800">{selectedStudent.course}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-slate-400">Plan Style</span>
                  <span className="text-slate-800 font-bold uppercase">{selectedStudent.feePlan?.paymentPlan || 'Not Configured'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-slate-400">Paid Fees</span>
                  <span className="text-emerald-650">{formatINR(selectedStudent.feePlan?.paidAmount)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                  <span className="text-blue-500 font-bold">Advance Credit</span>
                  <span className="text-blue-600 font-bold">{formatINR(selectedStudent.feePlan?.advanceCreditBalance || 0)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#FAF9F6] text-slate-800">
                  <span className="text-slate-450 font-extrabold">Remaining Dues</span>
                  <span className="text-rose-600 font-extrabold">{formatINR(selectedStudent.feePlan?.remainingAmount)}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 font-bold text-[10px] leading-normal">
                No student selected. Choose a student from registry.
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedStudent || selectedStudent.feePlan?.remainingAmount === 0}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {submitting ? <RefreshCw size={12} className="animate-spin" /> : <CreditCard size={13} />}
              <span>Collect Manual Payment</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default Payments;
