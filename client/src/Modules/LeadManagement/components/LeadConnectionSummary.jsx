import React from 'react';
import { Phone, MessageSquare, ClipboardList, CheckCircle2, XCircle, Award } from 'lucide-react';

const STAFF_MEMBERS = ["Khushi Soni"];

export default function LeadConnectionSummary({ activities = [] }) {
  // Filter out logs that do not belong to active staff
  const activeLogs = activities.filter(a => STAFF_MEMBERS.includes(a.staffName));

  const stats = STAFF_MEMBERS.reduce((acc, name) => {
    const staffLogs = activeLogs.filter(a => a.staffName === name);
    const connected = staffLogs.filter(a => a.callStatus === 'Connected' || a.callStatus === 'Joined' || a.callStatus === 'Interested').length;
    const messages = staffLogs.filter(a => a.callStatus === 'Message Sent').length;
    const missed = staffLogs.filter(a => a.callStatus === 'Not Answered' || a.callStatus === 'Busy' || a.callStatus === 'Switched Off' || a.callStatus === 'Wrong Number').length;
    
    // Attempt score connected & message rate
    const rate = staffLogs.length > 0 ? Math.round(((connected + messages) / staffLogs.length) * 100) : 0;
    
    acc[name] = {
      total: staffLogs.length,
      connected,
      messages,
      missed,
      rate,
      recent: staffLogs.slice(0, 3)
    };
    return acc;
  }, {});

  const totalConnected = activeLogs.filter(a => a.callStatus === 'Connected' || a.callStatus === 'Joined' || a.callStatus === 'Interested' || a.callStatus === 'Message Sent').length;
  const totalLogs = activeLogs.length;
  const overallRate = totalLogs > 0 ? Math.round((totalConnected / totalLogs) * 100) : 0;

  return (
    <div className="space-y-8 font-sans text-slate-800">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">Staff Performance Dashboard</h2>
          <p className="text-slate-500 text-xs mt-1">Real-time productivity, connection rates, and log analytics for active staff</p>
        </div>
        
        {/* Overview Badges */}
        <div className="flex gap-3 bg-slate-55 p-1.5 rounded-2xl border border-slate-200">
          <div className="px-4 py-2.5 text-left bg-white rounded-xl shadow-sm border border-slate-200">
            <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">Total Active Logs</span>
            <span className="text-xl font-black text-slate-800 leading-none block mt-1">{totalLogs}</span>
          </div>
          <div className="px-4 py-2.5 text-left bg-white rounded-xl shadow-sm border border-slate-200">
            <span className="text-[9px] text-slate-400 font-extrabold block uppercase tracking-wider">Overall Success Rate</span>
            <span className="text-xl font-black text-emerald-600 leading-none block mt-1">{overallRate}%</span>
          </div>
        </div>
      </div>

      {/* Staff Grid - Khushi Soni Only */}
      <div className="grid grid-cols-1 max-w-2xl gap-8">

        {/* Khushi Soni Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500"></div>
          <div>
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
                  K
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Khushi Soni</h3>
                  <span className="text-[10px] text-emerald-500 font-extrabold tracking-wider uppercase">Lead Specialist</span>
                </div>
              </div>
              
              {/* Success Badge */}
              <div className="bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-2xl flex items-center gap-1.5">
                <Award size={14} className="text-emerald-600" />
                <span className="text-xs font-black text-emerald-700">{stats['Khushi Soni'].rate}% Score</span>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-inner">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Attempts</span>
                  <span className="text-base font-black text-slate-700 leading-none block mt-1">{stats['Khushi Soni'].total}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-inner">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Connected</span>
                  <span className="text-base font-black text-slate-700 leading-none block mt-1">{stats['Khushi Soni'].connected}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-inner">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <MessageSquare size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">WhatsApp Sent</span>
                  <span className="text-base font-black text-slate-700 leading-none block mt-1">{stats['Khushi Soni'].messages}</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center gap-3 shadow-inner">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
                  <XCircle size={16} />
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Unanswered</span>
                  <span className="text-base font-black text-slate-700 leading-none block mt-1">{stats['Khushi Soni'].missed}</span>
                </div>
              </div>
            </div>

            {/* Performance Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center text-xs font-bold text-slate-650 mb-1.5">
                <span>Success Progress</span>
                <span>{stats['Khushi Soni'].rate}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stats['Khushi Soni'].rate}%` }}
                ></div>
              </div>
            </div>

            {/* Recent Timeline */}
            <div>
              <h4 className="text-[9px] font-extrabold text-slate-450 uppercase tracking-widest mb-3">Recent Activities</h4>
              {stats['Khushi Soni'].recent.length === 0 ? (
                <div className="text-center py-5 bg-[#FAF9F6] border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400">
                  No activity logged yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {stats['Khushi Soni'].recent.map((log, idx) => (
                    <div key={idx} className="flex gap-2.5 items-start bg-[#FAF9F6] p-3 rounded-xl border border-slate-200">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-slate-650 leading-relaxed italic">"{log.notes}"</p>
                        <span className="text-[9px] text-slate-400 font-bold mt-0.5 block">
                          {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
