import React from 'react';
import { Calendar, Edit2, Trash2, ClipboardList } from 'lucide-react';
import { formatDate } from '../../../utils/dateUtils';

const STAFF_COLORS = {
  "Khushi Soni": "bg-emerald-505 text-white",
};

const STATUS_COLORS = {
  "Connected": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Not Answered": "text-amber-705 bg-amber-50 border-amber-200",
  "Switched Off": "text-rose-700 bg-rose-50 border-rose-200",
  "Busy": "text-orange-700 bg-orange-50 border-orange-200",
  "Follow Up Required": "text-sky-700 bg-sky-55/60 border-sky-200",
  "Interested": "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Not Interested": "text-rose-700 bg-rose-50 border-rose-200",
  "Joined": "text-purple-700 bg-purple-50 border-purple-200",
  "Wrong Number": "text-slate-600 bg-slate-50 border-slate-200",
  "Message Sent": "text-sky-700 bg-sky-50 border-sky-200",
};

export default function LeadActivityTimeline({ activities, onEdit, onDelete }) {
  if (!activities || activities.length === 0) {
    return (
      <div className="p-8 rounded-2xl border border-dashed border-[#DEDCD8] bg-white text-center flex flex-col items-center justify-center space-y-3 shadow-sm">
        <div className="w-10 h-10 rounded-full bg-[#FAF9F6] flex items-center justify-center text-slate-400 border border-[#E3E1DC]">
          <ClipboardList size={18} />
        </div>
        <h4 className="font-extrabold text-slate-700 text-xs">No Activity Logs Found</h4>
        <p className="text-[11px] text-slate-400 max-w-xs">There are no call activities or logs recorded for this lead yet.</p>
      </div>
    );
  }

  const getStaffBadge = (name) => {
    return STAFF_COLORS[name] || "bg-slate-600 text-slate-100";
  };

  const getStatusStyle = (status) => {
    return STATUS_COLORS[status] || "text-slate-650 bg-slate-50 border-slate-200";
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider">Activity Timeline</h3>
      
      <div className="relative border-l border-[#E3E1DC] ml-4.5 pl-6 space-y-6 py-2">
        {activities.map((activity, index) => {
          const name = activity.staffName || 'Staff';

          return (
            <div key={activity._id || activity.id || index} className="relative group/card">
              {/* Connector Pin */}
              <div className="absolute -left-10.5 top-0.5 z-10">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-sm ring-4 ring-[#FAF9F6] ${getStaffBadge(name)}`}>
                  {name.charAt(0)}
                </div>
              </div>

              {/* Card Container */}
              <div className="p-4 rounded-xl bg-white border border-[#E8E6E1] space-y-3 relative shadow-sm hover:shadow-md transition-shadow">
                {/* Header info */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">{name}</span>
                  <span className="text-[10px] text-slate-450 font-bold">
                    {new Date(activity.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Status indicator row */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Call Outcome:</span>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border ${getStatusStyle(activity.callStatus)}`}>
                    {activity.callStatus}
                  </span>
                </div>

                {/* Notes content */}
                <p className="text-xs text-slate-700 leading-relaxed bg-[#FAF9F6] p-2.5 rounded-lg border border-[#E3E1DC] font-sans whitespace-pre-wrap">
                  {activity.notes}
                </p>

                {/* Visit/Follow-up date */}
                {activity.followUpDate && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#E31C1C] font-bold">
                    <Calendar size={11} />
                    <span>Follow-up Date: {formatDate(activity.followUpDate)}</span>
                  </div>
                )}

                {/* Edit & Delete timeline buttons */}
                <div className="absolute right-3 bottom-3 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit && onEdit(activity)}
                    className="p-1 rounded border border-[#DEDCD8] hover:border-slate-400 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer bg-white"
                    title="Edit Log"
                  >
                    <Edit2 size={10} />
                  </button>
                  <button
                    onClick={() => onDelete && onDelete(activity._id || activity.id)}
                    className="p-1 rounded border border-[#DEDCD8] hover:border-rose-400 text-slate-500 hover:text-rose-650 transition-colors cursor-pointer bg-white"
                    title="Delete Log"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
