import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, User, Phone, Mail, BookOpen, 
  Sparkles, Check, RefreshCw
} from 'lucide-react';
import { COURSES } from '../../../constants/Courses';
import { formatDate } from '../../../utils/dateUtils';
import DatePicker from '../components/DatePicker';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import { useStudents } from '../hooks/useStudents';
import { useFeePlans } from '../hooks/useFeePlans';

const ManualEnrollment = ({ onNavigate }) => {
  const { registerStudent } = useStudents();
  const { createFeePlan } = useFeePlans();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    fatherName: '',
    dob: '',
    course: COURSES[0],
    rollNo: '',
    section: 'A',
    admissionDate: new Date().toISOString().split('T')[0],
    totalFee: '',
    discount: '',
    paymentType: 'Installments',
    installmentCount: 3
  });

  const [formSuccess, setFormSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Field change handler - allows fluid typing and backspacing
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  // Live calculations
  const billingSummary = useMemo(() => {
    const totalFeeNum = Number(formData.totalFee) || 0;
    const discountNum = Number(formData.discount) || 0;
    const subtotal = Math.max(0, totalFeeNum - discountNum);
    const totalPayable = subtotal;
    
    // Installments generator
    const installments = [];
    if (formData.paymentType === 'One-Time') {
      installments.push({
        name: 'Single Premium',
        amount: totalPayable,
        dueDate: formData.admissionDate
      });
    } else {
      const count = Math.max(1, parseInt(formData.installmentCount) || 1);
      const amtPerInstallment = Math.round(totalPayable / count);
      const baseDate = new Date(formData.admissionDate);
      for (let i = 0; i < count; i++) {
        const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + (i * 3), baseDate.getDate());
        
        // Handle rounding difference on final installment
        const isLast = i === count - 1;
        const installmentAmt = isLast 
          ? totalPayable - (amtPerInstallment * (count - 1)) 
          : amtPerInstallment;

        installments.push({
          name: `Installment ${i + 1}`,
          amount: installmentAmt,
          dueDate: dueDate.toISOString().split('T')[0]
        });
      }
    }

    return {
      subtotal,
      taxAmount: 0,
      totalPayable,
      installments
    };
  }, [formData]);

  const validateForm = () => {
    const errors = {};
    if (!formData.name.trim()) errors.name = 'FullName is required';
    if (!formData.phone.trim()) errors.phone = 'Mobile number is required';
    if (!formData.email.trim()) errors.email = 'Email address is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email.trim() && !emailRegex.test(formData.email.trim())) {
      errors.email = 'Invalid email address format';
    }

    const phoneRegex = /^\d{10}$/;
    if (formData.phone.trim() && !phoneRegex.test(formData.phone.trim())) {
      errors.phone = 'Mobile number must be exactly 10 digits';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // 1. Create Student profile
      const studentPayload = {
        fullName: formData.name.trim(),
        fatherName: formData.fatherName.trim() || 'Not Provided',
        email: formData.email.trim(),
        mobile: formData.phone.trim(),
        course: formData.course,
        studentId: formData.rollNo.trim() || undefined,
        address: 'N/A',
        paymentPlan: formData.paymentType === 'One-Time' ? 'FULL_PAYMENT' : 'INSTALLMENT',
        totalFees: billingSummary.totalPayable
      };

      const studentRes = await registerStudent(studentPayload);
      if (studentRes.success && studentRes.data) {
        const student = studentRes.data;

        // 2. Setup Fee Plan settings
        const feePlanPayload = {
          studentId: student._id,
          totalFees: billingSummary.totalPayable,
          paymentPlan: formData.paymentType === 'One-Time' ? 'FULL_PAYMENT' : 'INSTALLMENT',
          numberOfInstallments: formData.paymentType === 'One-Time' ? undefined : Number(formData.installmentCount),
          firstDueDate: formData.paymentType === 'One-Time' ? undefined : (billingSummary.installments[0]?.dueDate || formData.admissionDate),
          installments: billingSummary.installments.map((inst, index) => ({
            installmentNo: index + 1,
            amount: inst.amount,
            dueDate: inst.dueDate
          }))
        };

        const planRes = await createFeePlan(feePlanPayload);
        if (planRes.success) {
          setFormSuccess(true);
          setTimeout(() => {
            setFormSuccess(false);
            onNavigate('students');
          }, 2000);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Enrollment registration failed.');
    } finally {
      setLoading(false);
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

  if (formSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white border border-[#EBEAE6] rounded-2xl shadow-sm text-center py-24 space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center animate-bounce shadow-md">
          <Check size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-slate-800">Enrollment Completed</h3>
          <p className="text-xs text-slate-400 font-semibold leading-normal max-w-sm">Student profile and fee installment books generated successfully in ERP records.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header action panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('students')}
            className="p-2 rounded-xl border border-[#DEDCD8] hover:bg-[#FAF9F6] text-slate-650 transition-all cursor-pointer shadow-xs active:scale-95"
            title="Back to Directory"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <span className="text-[10px] text-slate-450 uppercase font-extrabold tracking-wider block">Student Admissions</span>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Manual Student Enrollment</h3>
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} />}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs font-bold text-slate-655">
        
        {/* Left Columns: Form Fields (Spans 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Personal Information */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <User size={14} className="text-amber-500" />
              <span>Personal Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Student Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors.name ? 'border-rose-300 focus:border-rose-450' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                  placeholder="e.g. John Doe"
                />
                {validationErrors.name && <span className="text-[9px] text-rose-500 font-medium">{validationErrors.name}</span>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Father's Name</label>
                <input 
                  type="text" 
                  name="fatherName" 
                  value={formData.fatherName} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  placeholder="e.g. Richard Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Contact Mobile *</label>
                <input 
                  type="text" 
                  name="phone" 
                  value={formData.phone} 
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors.phone ? 'border-rose-300 focus:border-rose-450' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                  placeholder="e.g. 9876543210"
                />
                {validationErrors.phone && <span className="text-[9px] text-rose-500 font-medium">{validationErrors.phone}</span>}
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Email Address *</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors.email ? 'border-rose-300 focus:border-rose-450' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                  placeholder="e.g. john@example.com"
                />
                {validationErrors.email && <span className="text-[9px] text-rose-500 font-medium">{validationErrors.email}</span>}
              </div>

              <DatePicker
                label="Date of Birth"
                value={formData.dob}
                onChange={(val) => handleChange({ target: { name: 'dob', value: val } })}
              />
            </div>
          </div>

          {/* Section 2: Academic Program Information */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <BookOpen size={14} className="text-blue-500" />
              <span>Program Setup & Class</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Course Division *</label>
                <select 
                  name="course" 
                  value={formData.course} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Roll / Reg No</label>
                <input 
                  type="text" 
                  name="rollNo" 
                  value={formData.rollNo} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  placeholder="e.g. STU-2026-045"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Assigned Class Section</label>
                <select 
                  name="section" 
                  value={formData.section} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  <option value="A">Section A</option>
                  <option value="B">Section B</option>
                  <option value="C">Section C</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Billing & Installments Config */}
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6] flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500" />
              <span>Billing Fees Structures</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Total Fees Base (₹) *</label>
                <input 
                  type="number" 
                  name="totalFee" 
                  value={formData.totalFee} 
                  onChange={handleChange}
                  placeholder="e.g. 120000"
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  min="0"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Discount / Concession (₹)</label>
                <input 
                  type="number" 
                  name="discount" 
                  value={formData.discount} 
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  min="0"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Plan Classification</label>
                <select 
                  name="paymentType" 
                  value={formData.paymentType} 
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                >
                  <option value="Installments">Installments Plan</option>
                  <option value="One-Time">One-Time / Full</option>
                </select>
              </div>

              {formData.paymentType === 'Installments' && (
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase text-slate-400 font-bold">Installment Term Count</label>
                  <select 
                    name="installmentCount" 
                    value={formData.installmentCount} 
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-bold cursor-pointer outline-none focus:border-amber-400"
                  >
                    <option value="2">2 Installments</option>
                    <option value="3">3 Installments</option>
                    <option value="4">4 Installments</option>
                    <option value="6">6 Installments</option>
                  </select>
                </div>
              )}
            </div>

            <DatePicker
              label="Enrollment / Admission Date"
              value={formData.admissionDate}
              onChange={(val) => handleChange({ target: { name: 'admissionDate', value: val } })}
            />
          </div>

        </div>

        {/* Right Column: Invoicing preview (Spans 1/3) */}
        <div className="space-y-6">
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider pb-2 border-b border-[#FAF9F6]">
              Billing Summary Card
            </h4>
            
            <div className="space-y-3.5 font-semibold text-slate-655">
              <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                <span className="text-slate-400 font-bold">Base Tuition Fees</span>
                <span className="text-slate-700">{formatINR(formData.totalFee)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#FAF9F6]">
                <span className="text-slate-400">Discount Allocation</span>
                <span className="text-rose-500">- {formatINR(formData.discount)}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#FAF9F6] text-slate-800">
                <span className="text-slate-450 font-extrabold">Net Total Payable</span>
                <span className="font-extrabold text-amber-500 text-sm">{formatINR(billingSummary.totalPayable)}</span>
              </div>
            </div>

            {/* Installments listing previews */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide block">Projected Billing Schedule</span>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {billingSummary.installments.map((inst, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-[#FAF9F6] border border-[#EBEAE6] rounded-xl text-[10px] font-bold">
                    <div className="space-y-0.5">
                      <span className="text-slate-800 uppercase block">{inst.name}</span>
                      <span className="text-[8px] text-slate-400 font-medium font-sans">Due: {formatDate(inst.dueDate)}</span>
                    </div>
                    <span className="text-slate-800">{formatINR(inst.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50 mt-4"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : null}
              <span>Register & Setup Plan</span>
            </button>
          </div>
        </div>

      </form>
    </div>
  );
};

export default ManualEnrollment;
