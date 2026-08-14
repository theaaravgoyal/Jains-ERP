import React, { useState, useEffect } from 'react';
import { 
  Building2, Receipt, FileText, Settings as SettingsIcon, Globe, 
  Save, RefreshCw, CheckCircle2, AlertCircle 
} from 'lucide-react';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useSettings } from '../hooks/useSettings';

const Settings = () => {
  const { settings, loading, error, saveSettings, resetToFactoryDefaults, refetch } = useSettings();
  
  // Active Category state
  const [activeCategory, setActiveCategory] = useState('institute'); // institute, fee, receipt, invoice, general

  // Local Form state
  const [formData, setFormData] = useState({
    institute: {
      name: '', logo: '', address: '', city: '', state: '', country: '', pincode: '', mobile: '', email: '', website: ''
    },
    fee: {
      defaultCurrency: 'INR', currencySymbol: '₹', financialYear: '', defaultDueDays: 14, defaultPaymentPlan: 'INSTALLMENT', receiptPrefix: 'RCP', invoicePrefix: 'INV', studentPrefix: 'STU'
    },
    receipt: {
      receiptHeader: '', receiptFooter: '', signaturePlaceholder: '', showLogo: true, showQrPlaceholder: true
    },
    invoice: {
      invoiceHeader: '', invoiceFooter: '', termsAndConditions: '', signaturePlaceholder: ''
    },
    general: {
      timeZone: 'Asia/Kolkata', dateFormat: 'DD/MM/YYYY', timeFormat: '12h', defaultLanguage: 'English'
    }
  });

  // UI status
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Sync form states from settings object
  useEffect(() => {
    if (settings) {
      setFormData({
        institute: { ...formData.institute, ...settings.institute },
        fee: { ...formData.fee, ...settings.fee },
        receipt: { ...formData.receipt, ...settings.receipt },
        invoice: { ...formData.invoice, ...settings.invoice },
        general: { ...formData.general, ...settings.general }
      });
    }
  }, [settings]);

  if (loading && !settings) {
    return <Loader message="Syncing Global Configurations..." />;
  }

  // Handle Input Changes
  const handleInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    // Clear validation errors for the field
    if (validationErrors[`${category}.${field}`]) {
      setValidationErrors(prev => {
        const next = { ...prev };
        delete next[`${category}.${field}`];
        return next;
      });
    }
  };

  // Local Validation Checks
  const validateForm = () => {
    const errors = {};
    
    // Institute Validations
    if (activeCategory === 'institute') {
      if (!formData.institute.name.trim()) errors['institute.name'] = 'Institute name is required';
      
      const email = formData.institute.email;
      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          errors['institute.email'] = 'Invalid email address format';
        }
      }
      
      const mobile = formData.institute.mobile;
      if (mobile) {
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(mobile)) {
          errors['institute.mobile'] = 'Mobile number must be exactly 10 digits';
        }
      }
    }

    // Fee Validations
    if (activeCategory === 'fee') {
      const { receiptPrefix, invoicePrefix, studentPrefix, financialYear } = formData.fee;
      if (!receiptPrefix.trim()) errors['fee.receiptPrefix'] = 'Receipt prefix is required';
      if (!invoicePrefix.trim()) errors['fee.invoicePrefix'] = 'Invoice prefix is required';
      if (!studentPrefix.trim()) errors['fee.studentPrefix'] = 'Student prefix is required';

      if (receiptPrefix && invoicePrefix && receiptPrefix.trim().toUpperCase() === invoicePrefix.trim().toUpperCase()) {
        errors['fee.receiptPrefix'] = 'Prefixes must be unique';
        errors['fee.invoicePrefix'] = 'Prefixes must be unique';
      }
      if (receiptPrefix && studentPrefix && receiptPrefix.trim().toUpperCase() === studentPrefix.trim().toUpperCase()) {
        errors['fee.receiptPrefix'] = 'Prefixes must be unique';
        errors['fee.studentPrefix'] = 'Prefixes must be unique';
      }
      if (invoicePrefix && studentPrefix && invoicePrefix.trim().toUpperCase() === studentPrefix.trim().toUpperCase()) {
        errors['fee.invoicePrefix'] = 'Prefixes must be unique';
        errors['fee.studentPrefix'] = 'Prefixes must be unique';
      }

      if (financialYear) {
        const fyRegex = /^\d{4}-\d{4}$/;
        if (!fyRegex.test(financialYear)) {
          errors['fee.financialYear'] = 'FY must be YYYY-YYYY format (e.g. 2026-2027)';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Validation failed. Please correct fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      await saveSettings(formData);
      showToast('Global Configurations updated successfully!');
      refetch();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.errors?.[0] || 'Failed to update system configurations.';
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetConfirm = async () => {
    setSaving(true);
    try {
      await resetToFactoryDefaults();
      showToast('Restored default parameters successfully.');
      refetch();
    } catch (err) {
      console.error(err);
      showToast('Restoring defaults failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        institute: { ...formData.institute, ...settings.institute },
        fee: { ...formData.fee, ...settings.fee },
        receipt: { ...formData.receipt, ...settings.receipt },
        invoice: { ...formData.invoice, ...settings.invoice },
        general: { ...formData.general, ...settings.general }
      });
      setValidationErrors({});
      showToast('Changes discarded.');
    }
  };

  // Mock upload logo logic
  const handleLogoMockUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleInputChange('institute', 'logo', file.name.substring(0, 15) + ' (Simulated)');
      showToast('Logo uploaded! (Simulated)');
    }
  };

  const categories = [
    { id: 'institute', name: 'Institute Profile', Icon: Building2 },
    { id: 'fee', name: 'Billing Prefixes', Icon: SettingsIcon },
    { id: 'receipt', name: 'Receipt Settings', Icon: Receipt },
    { id: 'invoice', name: 'Invoice Layout', Icon: FileText },
    { id: 'general', name: 'Regional Settings', Icon: Globe },
  ];

  return (
    <div className="space-y-6">
      
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

      {/* Header controls panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Fees System Settings</h3>
          <p className="text-[10px] font-semibold text-slate-400">Configure receipt templates, currency symbols, and prefixes</p>
        </div>
        <button 
          onClick={() => setConfirmResetOpen(true)}
          className="px-3.5 py-1.5 border border-rose-250 bg-[#FFF5F5] hover:bg-rose-100/50 text-rose-600 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
        >
          <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
          <span>Reset Defaults</span>
        </button>
      </div>

      {error && <ErrorState message={error} onRetry={refetch} />}

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Side Category Navigation */}
        <aside className="w-full lg:w-60 bg-white border border-[#EBEAE6] rounded-2xl p-2.5 shadow-xs shrink-0 self-start">
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setValidationErrors({});
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-bold transition-all border outline-none shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 bg-transparent border-transparent hover:bg-slate-50'
                  }`}
                >
                  <cat.Icon size={14} />
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Side Settings Category Form Panel */}
        <div className="flex-1 bg-white border border-[#EBEAE6] rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Category Header */}
            <div className="border-b border-[#FAF9F6] pb-3">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                {categories.find(c => c.id === activeCategory)?.name}
              </h4>
              <p className="text-[10px] text-slate-400 font-semibold font-sans">Update parameters relative to this category</p>
            </div>

            {/* Category Subform Renderers */}
            <div className="flex flex-wrap gap-5 text-xs font-bold text-slate-655">
              {activeCategory === 'institute' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Institute Name *</label>
                    <input 
                      type="text" 
                      value={formData.institute.name} 
                      onChange={(e) => handleInputChange('institute', 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['institute.name'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['institute.name'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['institute.name']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Logo Path / Text</label>
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={formData.institute.logo} 
                        onChange={(e) => handleInputChange('institute', 'logo', e.target.value)}
                        className="flex-1 px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                        placeholder="e.g. LOGO text"
                      />
                      <label className="px-3 py-2 border border-[#DEDCD8] bg-slate-50 hover:bg-[#FAF9F6] rounded-xl font-bold cursor-pointer transition-all flex items-center gap-1">
                        <input type="file" onChange={handleLogoMockUpload} className="hidden" accept="image/*" />
                        <span>Upload</span>
                      </label>
                    </div>
                  </div>
                  <div className="space-y-1 w-full">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Address</label>
                    <input 
                      type="text" 
                      value={formData.institute.address} 
                      onChange={(e) => handleInputChange('institute', 'address', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">City</label>
                    <input 
                      type="text" 
                      value={formData.institute.city} 
                      onChange={(e) => handleInputChange('institute', 'city', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">State</label>
                    <input 
                      type="text" 
                      value={formData.institute.state} 
                      onChange={(e) => handleInputChange('institute', 'state', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Pincode</label>
                    <input 
                      type="text" 
                      value={formData.institute.pincode} 
                      onChange={(e) => handleInputChange('institute', 'pincode', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Mobile</label>
                    <input 
                      type="text" 
                      value={formData.institute.mobile} 
                      onChange={(e) => handleInputChange('institute', 'mobile', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['institute.mobile'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['institute.mobile'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['institute.mobile']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Email</label>
                    <input 
                      type="text" 
                      value={formData.institute.email} 
                      onChange={(e) => handleInputChange('institute', 'email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['institute.email'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['institute.email'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['institute.email']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Website</label>
                    <input 
                      type="text" 
                      value={formData.institute.website} 
                      onChange={(e) => handleInputChange('institute', 'website', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                </>
              )}

              {activeCategory === 'fee' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Currency Symbol</label>
                    <input 
                      type="text" 
                      value={formData.fee.currencySymbol} 
                      onChange={(e) => handleInputChange('fee', 'currencySymbol', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Financial Year</label>
                    <input 
                      type="text" 
                      value={formData.fee.financialYear} 
                      onChange={(e) => handleInputChange('fee', 'financialYear', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['fee.financialYear'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                      placeholder="e.g. 2026-2027"
                    />
                    {validationErrors['fee.financialYear'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['fee.financialYear']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Receipt Number Prefix *</label>
                    <input 
                      type="text" 
                      value={formData.fee.receiptPrefix} 
                      onChange={(e) => handleInputChange('fee', 'receiptPrefix', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['fee.receiptPrefix'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['fee.receiptPrefix'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['fee.receiptPrefix']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Invoice Number Prefix *</label>
                    <input 
                      type="text" 
                      value={formData.fee.invoicePrefix} 
                      onChange={(e) => handleInputChange('fee', 'invoicePrefix', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['fee.invoicePrefix'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['fee.invoicePrefix'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['fee.invoicePrefix']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Student ID Prefix *</label>
                    <input 
                      type="text" 
                      value={formData.fee.studentPrefix} 
                      onChange={(e) => handleInputChange('fee', 'studentPrefix', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-xl font-semibold outline-none ${validationErrors['fee.studentPrefix'] ? 'border-rose-350 focus:border-rose-400' : 'border-[#DEDCD8] focus:border-amber-400'}`}
                    />
                    {validationErrors['fee.studentPrefix'] && <span className="text-[9px] text-rose-500 font-medium">{validationErrors['fee.studentPrefix']}</span>}
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Default Due Grace Days</label>
                    <input 
                      type="number" 
                      value={formData.fee.defaultDueDays} 
                      onChange={(e) => handleInputChange('fee', 'defaultDueDays', Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                </>
              )}

              {activeCategory === 'receipt' && (
                <>
                  <div className="space-y-1 w-full">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Receipt Header Text</label>
                    <input 
                      type="text" 
                      value={formData.receipt.receiptHeader} 
                      onChange={(e) => handleInputChange('receipt', 'receiptHeader', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1 w-full">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Receipt Footer / Note</label>
                    <textarea 
                      value={formData.receipt.receiptFooter} 
                      onChange={(e) => handleInputChange('receipt', 'receiptFooter', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400 h-20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Signature Authority title</label>
                    <input 
                      type="text" 
                      value={formData.receipt.signaturePlaceholder} 
                      onChange={(e) => handleInputChange('receipt', 'signaturePlaceholder', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                      placeholder="e.g. Authorized Cashier Signatory"
                    />
                  </div>
                  <div className="flex items-center gap-4 mt-6">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formData.receipt.showLogo} 
                        onChange={(e) => handleInputChange('receipt', 'showLogo', e.target.checked)}
                        className="rounded border-[#DEDCD8] text-amber-500 focus:ring-amber-300 w-4 h-4 cursor-pointer"
                      />
                      <span>Show logo header</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={formData.receipt.showQrPlaceholder} 
                        onChange={(e) => handleInputChange('receipt', 'showQrPlaceholder', e.target.checked)}
                        className="rounded border-[#DEDCD8] text-amber-500 focus:ring-amber-300 w-4 h-4 cursor-pointer"
                      />
                      <span>Show QR Voucher Code</span>
                    </label>
                  </div>
                </>
              )}

              {activeCategory === 'invoice' && (
                <>
                  <div className="space-y-1 w-full">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Invoice Header title</label>
                    <input 
                      type="text" 
                      value={formData.invoice.invoiceHeader} 
                      onChange={(e) => handleInputChange('invoice', 'invoiceHeader', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1 w-full">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Invoice Terms & Conditions</label>
                    <textarea 
                      value={formData.invoice.termsAndConditions} 
                      onChange={(e) => handleInputChange('invoice', 'termsAndConditions', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400 h-20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Signature Placeholder</label>
                    <input 
                      type="text" 
                      value={formData.invoice.signaturePlaceholder} 
                      onChange={(e) => handleInputChange('invoice', 'signaturePlaceholder', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                      placeholder="e.g. Accounts Executive Sign"
                    />
                  </div>
                </>
              )}

              {activeCategory === 'general' && (
                <>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Time Zone</label>
                    <select 
                      value={formData.general.timeZone} 
                      onChange={(e) => handleInputChange('general', 'timeZone', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-semibold outline-none focus:border-amber-400"
                    >
                      <option value="Asia/Kolkata">GMT+05:30 (Asia/Kolkata)</option>
                      <option value="UTC">GMT+00:00 (UTC)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase text-slate-400 font-bold">Date Format</label>
                    <select 
                      value={formData.general.dateFormat} 
                      onChange={(e) => handleInputChange('general', 'dateFormat', e.target.value)}
                      className="w-full px-3 py-2 border border-[#DEDCD8] bg-white rounded-xl font-semibold outline-none focus:border-amber-400"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 31/07/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 07/31/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-31)</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            {/* Form footer Action buttons */}
            <div className="border-t border-[#FAF9F6] pt-4 mt-6 flex justify-end gap-3.5">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="py-2 px-4 border border-[#DEDCD8] bg-white text-slate-600 hover:bg-[#FAF9F6] rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                disabled={saving}
                className="py-2 px-5 bg-amber-500 hover:bg-amber-600 border-0 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50 active:scale-95"
              >
                {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                <span>Save Configuration</span>
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Confirmation Reset Modal */}
      <ConfirmationDialog
        isOpen={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset system configuration?"
        message="Are you sure you want to restore all accounting and logo default settings? Your custom modifications will be discarded immediately."
        confirmText="Reset Defaults"
        type="danger"
      />

    </div>
  );
};

export default Settings;
