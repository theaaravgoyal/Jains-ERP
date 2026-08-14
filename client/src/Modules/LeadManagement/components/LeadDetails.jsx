import React, { useState, useMemo, useEffect } from 'react';
import { Phone, MessageSquare, Mail, Trash2, X, AlertTriangle, Clock, Calendar, Edit2, ShieldAlert, Globe } from 'lucide-react';
import { useActivities } from '../hooks/useActivities';
import { useAuth } from '../../../context/AuthContext';
import CallDialerModal from './CallDialerModal';
import WhatsAppWorkspaceModal from './WhatsAppWorkspaceModal';
import ActivityModal from './ActivityModal';
import { formatDate } from '../../../utils/dateUtils';

const STAFF_MEMBERS = [
  "Khushi Soni",
];

export default function LeadDetails({ lead, onClose, onUpdateStatus, onDeleteLead, onActivityAdded }) {
  const { user } = useAuth();
  const {
    activities,
    loading,
    addActivity,
    updateActivity,
    deleteActivity
  } = useActivities(lead._id || lead.id);

  // Modals & Popovers state
  const [dialerOpen, setDialerOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [activityLoggerOpen, setActivityLoggerOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);
  
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showTimerSetter, setShowTimerSetter] = useState(false);
  
  // Forms state
  const [noteText, setNoteText] = useState('');
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [assignedStaffInput, setAssignedStaffInput] = useState('');

  // 3. Compute current assigned staff
  // An executive is considered "assigned" if there is a latest activity matching "Assigned" or has a staffName
  const currentAssignedStaff = useMemo(() => {
    const sorted = [...(activities || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const assignmentLog = sorted.find(a => a.staffName && (a.callStatus === 'Assigned' || a.notes?.toLowerCase().includes('assigned')));
    if (assignmentLog) return assignmentLog.staffName;
    
    // Fallback: use first engaged staff name
    const engaged = sorted.find(a => a.staffName && a.staffName !== 'SYSTEM');
    return engaged ? engaged.staffName : null;
  }, [activities]);

  const [selectedOperator, setSelectedOperator] = useState('');

  // Sync selectedOperator with currentAssignedStaff once activities load
  useEffect(() => {
    if (currentAssignedStaff) {
      setSelectedOperator(currentAssignedStaff);
    } else {
      setSelectedOperator('');
    }
  }, [currentAssignedStaff]);

  // 1. Get Short Lead ID (e.g. L-107)
  const getShortId = (ld) => {
    const idStr = ld._id || ld.id || '107';
    return `L-${idStr.substring(idStr.length - 4).toUpperCase()}`;
  };

  // 2. Format Source Campaign
  const formatSource = (src) => {
    if (!src) return 'Website Lead';
    let s = src.toLowerCase();
    if (s === 'popup') return 'Popup Lead';
    if (s === 'course-page') return 'Course Page Lead';
    if (s === 'website') return 'Website Lead';
    if (s === 'facebook') return 'Facebook Lead';
    if (s === 'instagram') return 'Instagram Lead';
    if (s === 'google' || s === 'google search') return 'Google Search Lead';
    return src.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Lead';
  };

  // 4. Compute active follow up reminder
  const activeFollowUp = useMemo(() => {
    const sorted = [...activities].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const followUpLog = sorted.find(a => a.followUpDate);
    if (!followUpLog) return null;
    
    const fDate = new Date(followUpLog.followUpDate);
    if (fDate < new Date()) return null; // Expired follow ups aren't active
    
    return fDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [activities]);

  // 5. Separate Note activities
  const notesList = useMemo(() => {
    return activities
      .filter(a => a.callStatus === 'Note Added')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activities]);

  // 6. Timeline list (including virtual Lead Created event at the end)
  const timelineActivities = useMemo(() => {
    const list = [...activities];
    // Add system virtual event
    list.push({
      _id: 'created_system',
      staffName: 'SYSTEM',
      callStatus: 'Lead Created',
      notes: `Inquiry for ${lead.course || 'Data Analytics'}.`,
      createdAt: lead.createdAt
    });
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [activities, lead]);

  // 7. Actions handlers
  const handleAddActivityAndCheckStatus = async (activityData) => {
    const res = await addActivity(activityData);
    if (activityData.followUpDate) {
      await onUpdateStatus(lead._id || lead.id, 'Follow-up');
    } else if (lead.status === 'New' || lead.status === 'pending') {
      await onUpdateStatus(lead._id || lead.id, 'Connected');
    }
    if (onActivityAdded) {
      onActivityAdded();
    }
    return res;
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!selectedOperator) {
      alert("Please assign an Executive at the top of the panel first.");
      return;
    }
    if (!noteText.trim()) return;
    
    try {
      await handleAddActivityAndCheckStatus({
        staffName: selectedOperator,
        callStatus: 'Note Added',
        notes: noteText.trim(),
        followUpDate: null
      });
      setNoteText('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleAssignStaff = async (e) => {
    const staffName = e.target.value;
    if (!staffName) return;
    setSelectedOperator(staffName);

    try {
      await handleAddActivityAndCheckStatus({
        staffName: staffName,
        callStatus: 'Assigned',
        notes: `Assigned executive to ${staffName}.`,
        followUpDate: null
      });
    } catch (err) {
      console.error('Failed to assign executive:', err);
    }
  };

  const handleSaveFollowUp = async () => {
    if (!selectedOperator) {
      alert("Please assign an Executive at the top of the panel first.");
      return;
    }
    if (!followUpDateInput) {
      alert("Please select a follow-up date and time first.");
      return;
    }
    try {
      await handleAddActivityAndCheckStatus({
        staffName: selectedOperator,
        callStatus: 'Follow Up Required',
        notes: 'Follow-up schedule reminder configured.',
        followUpDate: new Date(followUpDateInput).toISOString()
      });
      
      // Update the lead status to Follow-up
      await onUpdateStatus(lead._id || lead.id, 'Follow-up');

      setFollowUpDateInput('');
      setShowTimerSetter(false);
    } catch (err) {
      console.error('Failed to set follow-up timer:', err);
    }
  };

  const handleFinishCallDialer = () => {
    setDialerOpen(false);
    setEditingActivity({
      staffName: selectedOperator,
      callStatus: 'Connected',
      notes: 'Call made to student.',
      followUpDate: ''
    });
    setActivityLoggerOpen(true);
  };

  // Helper for outcomes badges
  const getTimelineBadgeColor = (status) => {
    switch (status) {
      case 'Lead Created':
        return 'text-[#1D4ED8] bg-[#EFF6FF] border-[#BFDBFE]';
      case 'Note Added':
        return 'text-[#B91C1C] bg-[#FEF2F2] border-[#FCA5A5]';
      case 'Message Sent':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'Connected':
      case 'Assigned':
        return 'text-emerald-700 bg-emerald-50 border-emerald-25';
      default:
        return 'text-amber-705 bg-[#FFFBEB] border-amber-200';
    }
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER ROW */}
      <div className="flex items-center justify-between border-b border-[#EBEAE6] pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[#FFF5F5] text-[#E31C1C] font-black text-xs px-3 py-1.5 rounded-xl border border-[#FCD4D4]">
            {getShortId(lead)}
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight leading-none">Lead Dashboard</h2>
            <span className="text-[10px] text-slate-455 font-bold block mt-1">
              Created on {new Date(lead.createdAt).toLocaleString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Delete & Close buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete lead ${lead.name}?`)) {
                onDeleteLead(lead._id || lead.id);
              }
            }}
            className="w-8 h-8 rounded-full border border-[#DEDCD8] hover:border-rose-455 text-slate-455 hover:text-rose-600 transition-colors flex items-center justify-center bg-white cursor-pointer shadow-sm"
            title="Delete Lead"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#DEDCD8] hover:border-slate-400 text-slate-455 hover:text-slate-800 transition-colors flex items-center justify-center bg-white cursor-pointer shadow-sm"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ASSIGNED EXECUTIVE SELECTION */}
      <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="space-y-0.5">
          <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block">
            👤 ASSIGNED EXECUTIVE <span className="text-[#E31C1C]">*</span>
          </label>
          <p className="text-[10px] text-amber-700 font-bold">
            Select the executive assigned to this lead. This staff member will also log all notes and activities.
          </p>
        </div>
        <div className="relative shrink-0 w-full sm:w-48">
          <select
            value={selectedOperator}
            onChange={handleAssignStaff}
            className="w-full bg-white border border-[#DEDCD8] rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none cursor-pointer appearance-none pr-8"
            style={{
              backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 10px center',
              backgroundSize: '11px'
            }}
          >
            <option value="">-- Assign Executive --</option>
            {STAFF_MEMBERS.map((staff) => (
              <option key={staff} value={staff}>{staff}</option>
            ))}
          </select>
        </div>
      </div>

      {/* LEAD PROFILE BLOCK */}
      <div className="p-5 rounded-2xl bg-[#FAF9F6] border border-[#E8E6E1] flex flex-col sm:flex-row justify-between gap-5 relative">
        <div className="space-y-2 flex-1 min-w-0">
          <div>
            <span className="inline-block bg-[#FFF5F5] text-[#E31C1C] border border-[#FCD4D4] rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
              🌐 {formatSource(lead.source)}
            </span>
          </div>
          
          <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none truncate">{lead.name}</h2>
          <p className="text-xs font-bold text-[#E31C1C]">{lead.course}</p>
          
          {/* Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3">
            <button
              onClick={() => {
                if (!selectedOperator) {
                  alert("Please assign an Executive at the top of the panel first.");
                  return;
                }
                setDialerOpen(true);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#DEDCD8] rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Phone size={13} className="text-[#E31C1C]" />
              <span>Call Student</span>
            </button>
            <button
              onClick={() => {
                if (!selectedOperator) {
                  alert("Please assign an Executive at the top of the panel first.");
                  return;
                }
                setWhatsappOpen(true);
              }}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#DEDCD8] rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <MessageSquare size={13} className="text-[#10b981]" />
              <span>WhatsApp</span>
            </button>
            <a
              href={`mailto:${lead.email || ''}`}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-[#DEDCD8] rounded-xl text-xs font-bold text-slate-750 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <Mail size={13} className="text-blue-500" />
              <span>Email</span>
            </a>
          </div>
        </div>

        {/* Quick Status Select Button */}
        <div className="sm:self-start shrink-0 relative">
          <button
            onClick={() => setShowStatusMenu(!showStatusMenu)}
            className="px-3.5 py-1.5 rounded-full text-xs font-black border bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE] cursor-pointer shadow-sm flex items-center gap-1 hover:brightness-95 active:scale-95"
          >
            <span>{lead.status || 'New'}</span>
            <span className="text-[9px]">▼</span>
          </button>
          
          {/* Dropdown status menu */}
          {showStatusMenu && (
            <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#E8E6E1] rounded-2xl shadow-xl z-30 p-2 text-xs space-y-0.5 animate-fade-in">
              <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1 border-b border-[#EBEAE6] mb-1">
                Quick Status Change
              </div>
              {['New', 'Connected', 'Follow-up', 'Converted', 'Not Interested'].map((st) => {
                const isCurrent = (lead.status || 'New') === st;
                return (
                  <button
                    key={st}
                    onClick={() => {
                      onUpdateStatus(lead._id || lead.id, st);
                      setShowStatusMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isCurrent 
                        ? 'bg-[#FFF5F5] text-[#E31C1C]' 
                        : 'text-slate-600 hover:bg-[#FAF9F6] hover:text-slate-800'
                    }`}
                  >
                    <span>{st}</span>
                    {isCurrent && <span className="text-[9px] font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* METADATA BOX */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1">
          🛡️ Lead Metadata
        </h3>
        
        <div className="flex flex-col md:flex-row gap-4 border-b border-[#EBEAE6] pb-4">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Phone Number</span>
            <strong className="text-xs text-slate-800 font-mono tracking-wide mt-1 block">{lead.phone}</strong>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Email Address</span>
            <strong className="text-xs text-slate-800 font-bold mt-1 block">{lead.email || '—'}</strong>
          </div>
        </div>

        {/* Assigned Executive display */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide block">Assigned Executive</span>
            {currentAssignedStaff ? (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-5 h-5 rounded-full bg-[#E31C1C] text-white text-[9px] font-black flex items-center justify-center shadow-sm">
                  {currentAssignedStaff.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-700">Assigned to {currentAssignedStaff}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 mt-1 text-[#D97706] font-bold text-xs">
                <span>🚨</span>
                <span>Unassigned (Awaiting Action)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOLLOW-UP REMINDER BOX */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[10px] font-black text-slate-450 uppercase tracking-wider flex items-center gap-1">
            📅 Follow-up Reminder
          </h3>
          
          <div>
            {activeFollowUp ? (
              <span className="inline-flex bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                ⏰ Active follow-up
              </span>
            ) : (
              <span className="inline-flex bg-[#FFFBEB] border border-[#FDE68A] text-[#D97706] px-3 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider items-center gap-1">
                ⚠️ No Active Follow-up
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-500 font-semibold leading-relaxed">
            {activeFollowUp ? (
              <span>Scheduled next follow-up call on <strong className="text-slate-800">{activeFollowUp}</strong>.</span>
            ) : (
              <span>Schedule follow up reminder to ensure student leads do not go cold.</span>
            )}
          </div>
          
          <button
            onClick={() => setShowTimerSetter(!showTimerSetter)}
            className="bg-[#FAF9F6] border border-[#DEDCD8] hover:bg-[#F0EEEA] text-slate-650 font-bold text-xs py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0 w-max"
          >
            <Clock size={13} className="text-slate-500" />
            <span>Set Timer</span>
          </button>
        </div>

        {/* Set Timer Form popup inline */}
        {showTimerSetter && (
          <div className="mt-1 p-3.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-2xl flex flex-col sm:flex-row items-center gap-3">
            <input
              type="datetime-local"
              value={followUpDateInput}
              onChange={(e) => setFollowUpDateInput(e.target.value)}
              className="w-full sm:w-auto bg-white border border-[#DEDCD8] rounded-xl p-2 text-xs font-semibold outline-none focus:border-slate-500 cursor-pointer"
              min={new Date().toISOString().slice(0, 16)}
            />
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={handleSaveFollowUp}
                className="px-4 py-2 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold cursor-pointer border-0 shadow-sm transition-all"
              >
                Save Timer
              </button>
              <button
                onClick={() => setShowTimerSetter(false)}
                className="px-4 py-2 bg-white border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 shadow-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DISCUSSION NOTES BOX */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-455 uppercase tracking-wider flex items-center gap-1">
          📝 Conversation Discussion Notes
        </h3>
        
        <form onSubmit={handleAddNote} className="space-y-3">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-medium text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
            rows={3}
            placeholder="Log discussion points (e.g. course fees discussed, requested next week demo batch)..."
            required
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[10px] font-bold text-slate-450">
            <span>Pressing add saves immediately</span>
            <button
              type="submit"
              className="bg-[#FFF5F5] border border-[#FCD4D4] text-[#E31C1C] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#FFEAEB] cursor-pointer shadow-sm transition-all flex items-center justify-center gap-1"
            >
              <span>+ Add Note</span>
            </button>
          </div>
        </form>

        {/* Notes list display */}
        <div className="space-y-3.5 pt-3 border-t border-[#EBEAE6] max-h-60 overflow-y-auto">
          {notesList.length === 0 ? (
            <div className="p-4 bg-[#FAF9F6] border border-[#E8E6E1] text-center text-slate-450 text-xs font-semibold rounded-2xl">
              No conversation notes logged yet.
            </div>
          ) : (
            notesList.map((note) => (
              <div key={note._id || note.id} className="p-4 bg-white border border-[#E8E6E1] rounded-2xl shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <strong className="text-[#E31C1C] font-black uppercase tracking-wider">{note.staffName}</strong>
                  <span className="text-slate-450 font-bold">
                    {new Date(note.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-normal bg-[#FAF9F6] p-2.5 rounded-xl border border-[#E3E1DC] font-sans whitespace-pre-wrap">
                  {note.notes}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* TIMELINE LOG HISTORIES */}
      <div className="p-5 rounded-2xl bg-white border border-[#E8E6E1] space-y-4 shadow-sm">
        <h3 className="text-[10px] font-black text-slate-455 uppercase tracking-wider flex items-center gap-1">
          ⏳ Activity History & Logs
        </h3>

        <div className="relative border-l border-[#E3E1DC] ml-4 pl-6 space-y-6 py-2">
          {timelineActivities.map((act, index) => {
            const isNote = act.callStatus === 'Note Added';
            const author = act.staffName || 'SYSTEM';

            return (
              <div key={act._id || act.id || index} className="relative group/timeline">
                
                {/* Connector Pin badge */}
                <div className="absolute -left-9.5 top-0.5 z-10">
                  <div className="w-7 h-7 rounded-full bg-white border border-[#DEDCD8] shadow-sm flex items-center justify-center font-black text-[9px] text-[#E31C1C] ring-4 ring-white">
                    {author.charAt(0).toUpperCase()}
                  </div>
                </div>

                {/* Log card */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${getTimelineBadgeColor(act.callStatus)}`}>
                        {act.callStatus}
                      </span>
                      {isNote ? (
                        <span className="text-xs text-slate-650 leading-relaxed font-sans italic">
                          "{act.notes}"
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600 font-semibold leading-relaxed">
                          {act.notes}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-[9px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1.5">
                      <span>BY {author.toUpperCase()}</span>
                      {act.followUpDate && (
                        <>
                          <span>•</span>
                          <span className="text-[#E31C1C]">FOLLOW UP: {formatDate(act.followUpDate)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp aligned right */}
                  <span className="text-[10px] text-slate-450 font-bold shrink-0 mt-0.5">
                    {new Date(act.createdAt).toLocaleTimeString("en-IN", {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OVERLAY MODALS POPUPS */}
      {dialerOpen && (
        <CallDialerModal
          lead={lead}
          onClose={() => setDialerOpen(false)}
          onFinish={handleFinishCallDialer}
        />
      )}

      {whatsappOpen && (
        <WhatsAppWorkspaceModal
          lead={lead}
          operatingStaff={selectedOperator}
          onClose={() => setWhatsappOpen(false)}
          onSave={handleAddActivityAndCheckStatus}
        />
      )}

      {activityLoggerOpen && editingActivity && (
        <ActivityModal
          lead={lead}
          activity={editingActivity}
          onClose={() => {
            setActivityLoggerOpen(false);
            setEditingActivity(null);
          }}
          onSave={handleAddActivityAndCheckStatus}
        />
      )}

    </div>
  );
}
