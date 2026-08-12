import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import DatePicker from '../../FeesManagement/components/DatePicker';

const STAFF_MEMBERS = [
  "Khushi Soni",
];

const CALL_STATUSES = [
  "Connected",
  "Not Answered",
  "Switched Off",
  "Busy",
  "Follow Up Required",
  "Interested",
  "Not Interested",
  "Joined",
  "Wrong Number",
];

export default function ActivityModal({ lead, activity, onClose, onSave, connectedActivities = [] }) {
  const [staffName, setStaffName] = useState(activity?.staffName || '');
  const [callStatus, setCallStatus] = useState(activity?.callStatus || '');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [followUpDate, setFollowUpDate] = useState(
    activity?.followUpDate ? new Date(activity.followUpDate).toISOString().split('T')[0] : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!staffName) {
      setError('Please select a staff member.');
      return;
    }
    if (!callStatus) {
      setError('Please select a status.');
      return;
    }
    if (!notes.trim()) {
      setError('Please enter notes.');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        staffName,
        callStatus,
        notes: notes.trim(),
        followUpDate: followUpDate || null
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b0a09]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#E8E6E1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6]">
          <h3 className="text-sm font-black text-slate-800 tracking-tight">
            {activity ? 'Edit Activity Log' : `Log Activity — ${lead?.name}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Previous connection history inside Add Modal */}
          {!activity && connectedActivities.length > 0 && (
            <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E8E6E1] space-y-3">
              <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">
                Previously Connected ({connectedActivities.length} time{connectedActivities.length > 1 ? "s" : ""})
              </span>
              <div className="space-y-2.5 max-h-36 overflow-y-auto divide-y divide-[#E3E1DC]">
                {connectedActivities.slice(0, 3).map((act, idx) => (
                  <div key={act._id || act.id || idx} className={`${idx > 0 ? 'pt-2.5' : ''}`}>
                    <div className="flex items-center justify-between text-[10px]">
                      <strong className="text-slate-700">{act.staffName}</strong>
                      <span className="text-slate-450 font-semibold">
                        {new Date(act.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-normal italic bg-white p-2 border border-[#EBEAE6] rounded-lg">"{act.notes}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Staff Dropdown */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide">Staff Member <span className="text-[#E31C1C]">*</span></label>
              <div className="relative">
                <select
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all cursor-pointer appearance-none pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '12px'
                  }}
                  required
                >
                  <option value="">— Select Staff —</option>
                  {STAFF_MEMBERS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Dropdown */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-black text-slate-450 uppercase tracking-wide">Call Status <span className="text-[#E31C1C]">*</span></label>
              <div className="relative">
                <select
                  value={callStatus}
                  onChange={(e) => setCallStatus(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all cursor-pointer appearance-none pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    backgroundSize: '12px'
                  }}
                  required
                >
                  <option value="">— Select Status —</option>
                  {CALL_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Notes textarea */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">Call Notes <span className="text-[#E31C1C]">*</span></label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-medium text-slate-850 outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
                rows={4}
                placeholder="Talked with lead. Lead is interested in course fees..."
                required
              />
            </div>

            {/* Follow-up date */}
            <div>
              <DatePicker
                label="Follow-up / Visit Date (Optional)"
                value={followUpDate}
                onChange={val => setFollowUpDate(val)}
              />
            </div>

            {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 p-3 rounded-xl">{error}</p>}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EBEAE6]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white border border-[#DEDCD8] hover:bg-[#FAF9F6] rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer shadow-sm"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#E31C1C] hover:bg-[#b81414] rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border-0"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{activity ? 'Update Activity' : 'Save Activity'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
