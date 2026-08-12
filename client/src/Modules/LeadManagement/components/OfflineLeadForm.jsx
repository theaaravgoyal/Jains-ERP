import React, { useState } from 'react';
import {
  User, Send, RotateCcw, Save, Search,
  Phone, CalendarDays, BookOpen, Users, Link2
} from 'lucide-react';
import { formatDate } from '../../../utils/dateUtils';
import DatePicker from '../../FeesManagement/components/DatePicker';

const PREDEFINED_COURSES = [
  'Digital Marketing', 'Graphic Designing', 'Video Editing', 'Web Development', 'UI/UX Design',
  'Blender', 'Tally with GST', 'Power BI', 'Artificial Intelligence', 'Advance Excel',
  'VBA Programming', 'AutoCAD', '3DS Max', 'SolidWorks', 'Interior Designing',
  'Revit Architecture', 'SketchUp', 'Architecture Designing', 'V-Ray', 'Mechanical CADD',
  'ArtCAM', 'C Language', 'C++', 'Python', 'Programming', 'Android Development',
  'RS-CIT', 'PGDCA', 'CCC', 'COPA',
];

const REFERENCE_SOURCES = [
  'Walk-in', 'Phone Call', 'WhatsApp', 'Newspaper Ad', 'Pamphlet / Flyer',
  'Banner / Hoarding', 'Friend / Referral', 'School / College Visit',
  'Exhibition / Event', 'Social Media (Organic)', 'Other',
];

const COUNSELLORS = [
  'Khushi Soni',
];

const EMPTY_FORM = {
  name: '',
  contact: '',
  reference: '',
  course: '',
  counsellor: 'Khushi Soni',
  date: new Date().toISOString().slice(0, 10),
};

export default function OfflineLeadForm({ onSubmit, editingLead, onCancel }) {
  const [form, setForm] = useState(() => {
    if (editingLead) {
      return {
        name: editingLead.name || '',
        contact: editingLead.contact || '',
        reference: editingLead.reference || '',
        course: editingLead.course || '',
        counsellor: editingLead.counsellor || '',
        date: editingLead.date || new Date().toISOString().slice(0, 10),
      };
    }
    return { ...EMPTY_FORM };
  });

  const [courseSearch, setCourseSearch] = useState('');
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [refSearch, setRefSearch] = useState('');
  const [showRefDropdown, setShowRefDropdown] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const filteredCourses = PREDEFINED_COURSES.filter(c =>
    c.toLowerCase().includes((form.course || courseSearch).toLowerCase())
  );
  const filteredRefs = REFERENCE_SOURCES.filter(r =>
    r.toLowerCase().includes((form.reference || refSearch).toLowerCase())
  );

  const handleReset = () => {
    setForm({ ...EMPTY_FORM });
    setCourseSearch('');
    setRefSearch('');
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.contact.trim()) return;
    onSubmit({
      name: form.name.trim(),
      contact: form.contact.trim(),
      reference: form.reference || 'Walk-in',
      course: form.course || 'Not Specified',
      counsellor: form.counsellor || 'Khushi Soni',
      date: form.date,
    });
    if (!editingLead) handleReset();
  };

  // ── Shared class tokens (identical to AdmissionForm) ──────────
  const inputCls = "w-full bg-[#FAFAF9] border border-[#E3E1DC] rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#E31C1C] focus:ring-1 focus:ring-[#E31C1C]/20 transition-all";
  const labelCls = "block text-[11px] font-black text-slate-600 uppercase tracking-wider mb-1.5";
  const sectionHeaderCls = "flex items-center gap-2 text-xs font-black text-slate-700 uppercase tracking-wider mb-5";

  return (
    <div className="relative">

      {/* ── Title Header ──────────────────────────────── */}
      <div className="bg-white border border-[#E8E6E1] rounded-2xl px-6 py-3.5 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-black uppercase tracking-widest">
          <Users size={13} className="text-[#E31C1C]" />
          NEW OFFLINE LEAD ENTRY
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {formatDate(new Date())}
        </span>
      </div>

      {/* ── Form Card ─────────────────────────────────── */}
      <div className="bg-white border border-[#E8E6E1] rounded-2xl p-6 shadow-sm">
        <div className={sectionHeaderCls}>
          <User size={15} className="text-[#E31C1C]" />
          Lead Information
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4">

          {/* 1. Name */}
          <div>
            <label className={labelCls}>Full Name <span className="text-[#E31C1C]">*</span></label>
            <input
              className={inputCls}
              placeholder="Enter student's full name"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>

          {/* 2. Contact */}
          <div>
            <label className={labelCls}>Contact Number <span className="text-[#E31C1C]">*</span></label>
            <div className="relative">
              <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} pl-8`}
                placeholder="10-digit mobile number"
                maxLength={10}
                value={form.contact}
                onChange={e => set('contact', e.target.value.replace(/\D/, ''))}
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Without country prefix (e.g. 09876543210)</p>
          </div>

          {/* 3. Reference / Source */}
          <div className="relative">
            <label className={labelCls}>Reference / Source <span className="text-[#E31C1C]">*</span></label>
            <div className="relative">
              <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} pl-8 pr-10`}
                placeholder="How did the student learn about us?"
                value={form.reference || refSearch}
                onFocus={() => setShowRefDropdown(true)}
                onChange={e => {
                  setRefSearch(e.target.value);
                  set('reference', '');
                  setShowRefDropdown(true);
                }}
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {showRefDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E3E1DC] rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {filteredRefs.map(r => (
                  <div
                    key={r}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-[#E31C1C] cursor-pointer transition-colors"
                    onClick={() => {
                      set('reference', r);
                      setRefSearch('');
                      setShowRefDropdown(false);
                    }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Course */}
          <div className="relative">
            <label className={labelCls}>Course Interested In <span className="text-[#E31C1C]">*</span></label>
            <div className="relative">
              <BookOpen size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputCls} pl-8 pr-10`}
                placeholder="Select or type course name"
                value={form.course || courseSearch}
                onFocus={() => setShowCourseDropdown(true)}
                onChange={e => {
                  setCourseSearch(e.target.value);
                  set('course', '');
                  setShowCourseDropdown(true);
                }}
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
            {showCourseDropdown && (
              <div className="absolute left-0 right-0 mt-1 bg-white border border-[#E3E1DC] rounded-xl shadow-lg z-20 max-h-48 overflow-y-auto">
                {filteredCourses.map(c => (
                  <div
                    key={c}
                    className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-[#E31C1C] cursor-pointer transition-colors"
                    onClick={() => {
                      set('course', c);
                      setCourseSearch('');
                      setShowCourseDropdown(false);
                    }}
                  >
                    {c}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 5. Counsellor */}
          <div>
            <label className={labelCls}>Assigned Counsellor</label>
            <select
              className={inputCls}
              value={form.counsellor || 'Khushi Soni'}
              onChange={e => set('counsellor', e.target.value)}
            >
              {COUNSELLORS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* 6. Date */}
          <div>
            <DatePicker
              label="Enquiry Date *"
              value={form.date}
              onChange={val => set('date', val)}
            />
          </div>
        </div>
      </div>

      {/* ── Footer Bar (identical style to AdmissionForm) ─────── */}
      <div className="sticky bottom-0 mt-6 -mx-0 bg-white border-t border-[#E3E1DC] px-6 py-4 flex items-center justify-between z-10 rounded-b-2xl">
        <div className="flex items-center gap-3">
          {onCancel ? (
            <button
              onClick={onCancel}
              className="text-xs font-black text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          ) : (
            <>
              <button
                onClick={() => onSubmit && onSubmit(null)}
                className="text-xs font-black text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs font-black text-slate-600 border border-[#E3E1DC] px-4 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <RotateCcw size={13} />
                Reset Form
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          {editingLead ? (
            <button
              onClick={handleSubmit}
              className="flex items-center gap-2 bg-[#E31C1C] hover:bg-[#c01919] text-white text-xs font-black px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
            >
              <Save size={14} />
              Save Changes
            </button>
          ) : (
            <>
              <button
                className="flex items-center gap-2 border border-[#E3E1DC] text-xs font-black text-slate-700 px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Save size={14} />
                Save Draft
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 bg-[#E31C1C] hover:bg-[#c01919] text-white text-xs font-black px-6 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                <Send size={14} />
                Submit Lead
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
