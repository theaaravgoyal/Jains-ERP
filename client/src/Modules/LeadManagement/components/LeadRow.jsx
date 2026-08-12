import React, { useState } from 'react';
import { Phone, MessageSquare, Trash2, Globe, AlertTriangle, Clock, Calendar } from 'lucide-react';

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
};

const formatSource = (src) => {
  if (!src) return 'Direct Campaign';
  let s = src.toLowerCase();
  if (s === 'popup') return 'Popup Campaign';
  if (s === 'course-page') return 'Course Page Campaign';
  if (s === 'website') return 'Website Campaign';
  if (s === 'facebook') return 'Facebook Campaign';
  if (s === 'instagram') return 'Instagram Campaign';
  if (s === 'google' || s === 'google search') return 'Google Search Campaign';
  return src.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Campaign';
};

const getFollowUpStatus = (dateStr) => {
  if (!dateStr) return { label: 'No follow-up set', type: 'none' };
  const now = new Date();
  const followDate = new Date(dateStr);
  
  // Reset hours for day calculation
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const targetDay = new Date(followDate.getFullYear(), followDate.getMonth(), followDate.getDate());
  
  const timeStr = followDate.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  });
  
  if (targetDay.getTime() === today.getTime()) {
    return { label: `Today • ${timeStr}`, type: 'today' };
  } else if (targetDay.getTime() === tomorrow.getTime()) {
    return { label: `Tomorrow • ${timeStr}`, type: 'tomorrow' };
  } else if (followDate < now) {
    const formattedDate = followDate.toISOString().split('T')[0];
    return { label: `Overdue (${formattedDate})`, type: 'overdue' };
  } else {
    const formattedDate = followDate.toISOString().split('T')[0];
    return { label: `${formattedDate} • ${timeStr}`, type: 'future' };
  }
};

const getStatusPillClass = (st) => {
  const norm = st ? st.toLowerCase() : 'new';
  switch (norm) {
    case 'new':
    case 'pending':
      return 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]';
    case 'contacted':
    case 'connected':
      return 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]';
    case 'follow-up':
      return 'bg-[#FAF5FF] text-[#7C3AED] border-[#E9D5FF]';
    case 'converted':
      return 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]';
    default:
      return 'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]';
  }
};

const getAvatarBgClass = (st) => {
  const norm = st ? st.toLowerCase() : 'new';
  switch (norm) {
    case 'new':
    case 'pending':
      return 'bg-[#3b82f6]'; // blue
    case 'contacted':
    case 'connected':
      return 'bg-[#f59e0b]'; // orange/amber
    case 'follow-up':
      return 'bg-[#a855f7]'; // purple
    case 'converted':
      return 'bg-[#10b981]'; // green
    default:
      return 'bg-[#ef4444]'; // red
  }
};

export default function LeadRow({
  lead,
  latestActivity,
  onOpenDetails,
  onUpdateStatus,
  onDelete,
  onOpenWhatsApp,
  onOpenCallLog
}) {
  // Derive effective status based on lead status & latest activities
  const effectiveStatus = React.useMemo(() => {
    const raw = lead.status;
    const norm = (raw || 'new').toLowerCase();
    if (norm === 'converted') return 'Converted';
    if (norm === 'not interested' || norm === 'rejected') return 'Not Interested';
    if (norm === 'follow-up' || norm === 'followup') return 'Follow-up';
    if (norm === 'connected' || norm === 'contacted') return 'Connected';

    // If status is 'New' or 'pending', check if staff activity / assignment exists
    if (latestActivity) {
      if (latestActivity.followUpDate) return 'Follow-up';
      return 'Connected';
    }
    return 'New';
  }, [lead.status, latestActivity]);

  const [status, setStatus] = useState(effectiveStatus);

  React.useEffect(() => {
    setStatus(effectiveStatus);
  }, [effectiveStatus]);

  const handleStatusChange = (e) => {
    const nextStatus = e.target.value;
    setStatus(nextStatus);
    onUpdateStatus(lead._id || lead.id, nextStatus);
  };

  const initials = getInitials(lead.name);
  const avatarBg = getAvatarBgClass(status);
  const hasStaff = latestActivity && latestActivity.staffName;
  const staffInitials = hasStaff ? getInitials(latestActivity.staffName) : '';
  const followUp = getFollowUpStatus(latestActivity?.followUpDate);

  return (
    <div className="bg-white border border-[#E8E6E1] shadow-sm rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all hover:shadow-md">
      {/* 1. Contact Details */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-inner ${avatarBg}`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h3 
            onClick={() => onOpenDetails(lead)}
            className="font-extrabold text-slate-800 text-sm hover:text-[#E31C1C] hover:underline cursor-pointer truncate"
          >
            {lead.name}
          </h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5 text-xs text-slate-500 font-medium mt-0.5">
            <a href={`tel:${lead.phone}`} className="hover:text-[#E31C1C] transition-colors font-mono">
              {lead.phone}
            </a>
            {lead.email && (
              <>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="text-slate-450 italic truncate max-w-[180px]" title={lead.email}>
                  {lead.email}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 2. Course & Source Campaign */}
      <div className="flex flex-col gap-1 lg:w-48 shrink-0">
        <div>
          <span className="inline-block px-2.5 py-0.5 text-[9px] font-extrabold tracking-wider text-[#E31C1C] bg-[#FDF2F2] border border-[#FCD4D4] rounded-md uppercase">
            {lead.course}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-550 font-medium">
          <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate" title={formatSource(lead.source)}>{formatSource(lead.source)}</span>
        </div>
      </div>

      {/* 3. Assignment Status */}
      <div className="lg:w-44 shrink-0">
        {hasStaff ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#E31C1C] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {staffInitials}
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">ASSIGNED TO</span>
              <span className="text-xs font-bold text-slate-700 leading-tight">{latestActivity.staffName}</span>
            </div>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1 bg-[#FFF7ED] border border-[#FED7AA] text-[#EA580C] px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wide">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
            <span>UNASSIGNED</span>
          </div>
        )}
      </div>

      {/* 4. Follow-up Status */}
      <div className="lg:w-44 shrink-0">
        {followUp.type === 'none' ? (
          <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{followUp.label}</span>
          </div>
        ) : (
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            followUp.type === 'today' ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]' :
            followUp.type === 'tomorrow' ? 'bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]' :
            'bg-[#FEF2F2] text-[#B91C1C] border-[#FCA5A5]'
          }`}>
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{followUp.label}</span>
          </div>
        )}
      </div>

      {/* 5. Status Selector & Action Buttons */}
      <div className="shrink-0 flex items-center justify-between sm:justify-start gap-4">
        <div className="relative">
          <select
            value={status}
            onChange={handleStatusChange}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold border outline-none cursor-pointer appearance-none pr-7 relative transition-all ${getStatusPillClass(status)}`}
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 8px center',
              backgroundSize: '11px'
            }}
          >
            <option value="New">New</option>
            <option value="Connected">Connected</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Converted">Converted</option>
            <option value="Not Interested">Not Interested</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete lead ${lead.name}?`)) {
                onDelete(lead._id || lead.id);
              }
            }}
            className="w-8 h-8 rounded-full border border-[#DEDCD8] hover:border-rose-455 text-slate-500 hover:text-rose-600 transition-colors flex items-center justify-center bg-white cursor-pointer"
            title="Delete Lead"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
