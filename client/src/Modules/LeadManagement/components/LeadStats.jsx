import React from 'react';
import { Sparkles, PhoneCall, Calendar, CheckCircle2, XCircle } from 'lucide-react';

export default function LeadStats({ counts, activeStatusFilter, setActiveStatusFilter }) {
  const categories = [
    {
      status: 'New',
      label: 'New Leads',
      icon: Sparkles,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20'
    },
    {
      status: 'Connected',
      label: 'Connected',
      icon: PhoneCall,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20'
    },
    {
      status: 'Follow-up',
      label: 'Follow-up Required',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20'
    },
    {
      status: 'Converted',
      label: 'Converted Students',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20'
    },
    {
      status: 'Not Interested',
      label: 'Not Interested',
      icon: XCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20'
    }
  ];

  return (
    <div className="flex flex-wrap gap-4">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = activeStatusFilter === cat.status;
        const count = counts[cat.status] || 0;
        
        return (
          <button
            key={cat.status}
            onClick={() => setActiveStatusFilter(isActive ? null : cat.status)}
            className={`flex-1 min-w-[150px] p-4 rounded-2xl text-left cursor-pointer transition-all duration-200 group flex items-center justify-between h-24 bg-white border shadow-sm relative overflow-hidden ${
              isActive 
                ? `${cat.activeBorder} border-transparent` 
                : 'border-[#E8E6E1] hover:border-slate-350 hover:shadow-md'
            }`}
          >
            {/* Left Column: Title & Metric */}
            <div className="flex flex-col justify-between h-full">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider group-hover:text-slate-600 transition-colors">
                {cat.label}
              </span>
              
              <div className="flex items-baseline mt-2">
                <span className="text-2xl font-black text-slate-800 leading-none">
                  {count}
                </span>
                <span className="text-[11px] text-slate-400 font-bold ml-1.5">Inquiries</span>
              </div>
            </div>

            {/* Right Column: Icon */}
            <div className={`p-2.5 rounded-xl ${cat.bgColor} ${cat.color} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>

            {/* Active Indicator Bar at bottom */}
            {isActive && (
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${
                cat.status === 'New' ? 'bg-blue-500' :
                cat.status === 'Connected' || cat.status === 'Contacted' ? 'bg-amber-500' :
                cat.status === 'Follow-up' ? 'bg-purple-500' :
                cat.status === 'Converted' ? 'bg-emerald-500' : 'bg-rose-500'
              }`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
