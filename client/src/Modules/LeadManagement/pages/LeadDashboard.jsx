import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../../components/Card';
import { useLeads } from '../hooks/useLeads';
import { useActivities } from '../hooks/useActivities';
import { useLeadFilters } from '../hooks/useLeadFilters';
import LeadStats from '../components/LeadStats';
import LeadSearch from '../components/LeadSearch';
import LeadFilters from '../components/LeadFilters';
import LeadTable from '../components/LeadTable';
import LeadDetails from '../components/LeadDetails';
import ActivityModal from '../components/ActivityModal';
import MessageModal from '../components/MessageModal';
import LeadConnectionSummary from '../components/LeadConnectionSummary';
import AdmissionTab from '../components/AdmissionTab';
import OfflineLeadsTab from '../components/OfflineLeadsTab';
import { RefreshCw, PlusCircle, Bell, MoreVertical, ArrowLeft } from 'lucide-react';

export default function LeadDashboard() {
  const navigate = useNavigate();
  const {
    leads,
    loading,
    error,
    countdown,
    refreshLeads,
    handleManualRefresh,
    updateLeadStatus,
    deleteLead,
    createLead
  } = useLeads();

  const {
    staffSummary,
    addActivity,
    refreshStaffSummary
  } = useActivities();

  // Selected lead for full details view
  const [selectedLead, setSelectedLead] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Active tab state
  const [activeTab, setActiveTab] = useState('online');

  // Offline sources definition
  const OFFLINE_SOURCES = useMemo(() => [
    'walk-in', 'phone call', 'whatsapp', 'newspaper ad', 'pamphlet / flyer',
    'banner / hoarding', 'friend / referral', 'school / college visit',
    'exhibition / event', 'social media (organic)', 'other'
  ], []);

  const isOfflineLead = (lead) => {
    if (!lead) return false;
    const src = (lead.source || '').toLowerCase();
    return OFFLINE_SOURCES.includes(src) || Boolean(lead.counsellor && lead.counsellor !== 'undefined');
  };

  // Filter online website leads strictly
  const onlineLeads = useMemo(() => {
    return Array.isArray(leads) ? leads.filter(l => !isOfflineLead(l)) : [];
  }, [leads, OFFLINE_SOURCES]);

  // Filters State Hook — scoped to online website leads
  const {
    searchQuery,
    setSearchQuery,
    activeStatusFilter,
    setActiveStatusFilter,
    selectedCourse,
    setSelectedCourse,
    selectedSource,
    setSelectedSource,
    selectedAssignment,
    setSelectedAssignment,
    sortBy,
    setSortBy,
    filteredLeads,
    clearFilters,
    isFiltered,
    latestActivitiesMap
  } = useLeadFilters(onlineLeads, staffSummary);

  // Compute today's follow-up reminders
  const todayFollowUps = useMemo(() => {
    const list = [];
    if (!onlineLeads || !Array.isArray(onlineLeads)) return list;
    onlineLeads.forEach((lead) => {
      if (!lead) return;
      const leadId = lead._id || lead.id;
      if (!leadId) return;
      const latest = latestActivitiesMap && latestActivitiesMap[leadId];
      if (latest && latest.followUpDate) {
        const followDate = new Date(latest.followUpDate);
        const today = new Date();
        const sameDay = followDate.getDate() === today.getDate() &&
                        followDate.getMonth() === today.getMonth() &&
                        followDate.getFullYear() === today.getFullYear();
        const isOverdue = followDate < today;
        if (sameDay || isOverdue) {
          list.push({
            lead,
            followUpDate: latest.followUpDate,
            isOverdue,
            time: followDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
          });
        }
      }
    });
    return list;
  }, [leads, latestActivitiesMap]);

  // States for row action overlays
  const [rowActionLead, setRowActionLead] = useState(null);
  const [activeCallModal, setActiveCallModal] = useState(false);
  const [activeMessageModal, setActiveMessageModal] = useState(false);

  // Map of lead ID to list of staff members engaged
  const connectedLeadsMap = useMemo(() => {
    const map = {};
    if (staffSummary) {
      staffSummary.forEach((item) => {
        if (item.leadId && (item.callStatus === 'Connected' || item.callStatus === 'Message Sent')) {
          if (!map[item.leadId]) {
            map[item.leadId] = [];
          }
          if (!map[item.leadId].includes(item.staffName)) {
            map[item.leadId].push(item.staffName);
          }
        }
      });
    }
    return map;
  }, [staffSummary]);

  // Compute status cards metrics for online leads
  const statsCounts = useMemo(() => {
    const counts = {
      New: 0,
      Connected: 0,
      'Follow-up': 0,
      Converted: 0,
      'Not Interested': 0,
    };
    onlineLeads.forEach((l) => {
      const leadId = l._id || l.id;
      const hasActivity = latestActivitiesMap && latestActivitiesMap[leadId];
      const status = l.status || 'New';
      const norm = status.toLowerCase();
      
      if ((norm === 'new' || norm === 'pending') && hasActivity) {
        counts.Connected += 1;
      } else if (norm === 'new' || norm === 'pending') {
        counts.New += 1;
      } else if (norm === 'connected' || norm === 'contacted') {
        counts.Connected += 1;
      } else if (norm === 'converted') {
        counts.Converted += 1;
      } else if (norm === 'follow-up' || norm === 'followup') {
        counts['Follow-up'] += 1;
      } else {
        counts['Not Interested'] += 1;
      }
    });
    return counts;
  }, [onlineLeads, latestActivitiesMap]);


  const handleUpdateStatus = async (leadId, nextStatus) => {
    await updateLeadStatus(leadId, nextStatus);
    if (selectedLead && (selectedLead._id === leadId || selectedLead.id === leadId)) {
      setSelectedLead((prev) => ({ ...prev, status: nextStatus }));
    }
    if (nextStatus === 'Follow-up') {
      setActiveStatusFilter('Follow-up');
      setSelectedLead(null);
    }
  };

  const handleDelete = async (leadId) => {
    await deleteLead(leadId);
    if (selectedLead && (selectedLead._id === leadId || selectedLead.id === leadId)) {
      setSelectedLead(null);
    }
  };

  const handleSaveActivityRow = async (data) => {
    if (rowActionLead) {
      await addActivity({
        leadId: rowActionLead._id || rowActionLead.id,
        ...data
      });
      if (data.followUpDate) {
        await handleUpdateStatus(rowActionLead._id || rowActionLead.id, 'Follow-up');
      } else if (rowActionLead.status === 'New' || rowActionLead.status === 'pending') {
        await handleUpdateStatus(rowActionLead._id || rowActionLead.id, 'Connected');
      }
      setRowActionLead(null);
      refreshStaffSummary();
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-800 p-6 md:p-10 font-sans flex flex-col justify-between">
      
      {/* 1. Header Area */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-650 hover:text-slate-850 border border-slate-200 cursor-pointer shadow-sm flex items-center justify-center"
              title="Back"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Leads Management</h1>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                Track online inquiries, manage cycle status, follow ups, and staff assignment.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-start md:self-center">
            
            {/* Bell notification button */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`bg-white border border-[#DEDCD8] hover:bg-[#F0EEEA] text-slate-650 hover:text-slate-850 p-2 rounded-full transition-colors relative cursor-pointer shadow-sm w-9 h-9 flex items-center justify-center ${
                  todayFollowUps.some(item => item.isOverdue) 
                    ? 'animate-bell-pulse-red' 
                    : todayFollowUps.length > 0 
                    ? 'animate-bell-ring' 
                    : ''
                }`}
                title="Notifications"
              >
                <Bell size={15} />
                {todayFollowUps.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E31C1C] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md">
                    {todayFollowUps.length}
                  </span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-[#E8E6E1] rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-[#EBEAE6] pb-2">
                    <span className="text-xs font-black text-slate-800 tracking-tight">Today's Follow-up Tasks</span>
                    <span className="text-[9px] bg-rose-50 text-[#E31C1C] px-2 py-0.5 rounded-full font-black border border-rose-100 uppercase tracking-wider">{todayFollowUps.length} Pending</span>
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {todayFollowUps.length === 0 ? (
                      <div className="py-6 text-center text-slate-450 text-xs font-semibold leading-relaxed">
                        🎉 No follow-up reminders scheduled for today!
                      </div>
                    ) : (
                      todayFollowUps.map(({ lead, time, isOverdue }) => (
                        <div 
                          key={lead._id || lead.id}
                          onClick={() => {
                            setSelectedLead(lead);
                            setShowNotifications(false);
                          }}
                          className="p-3 bg-[#FAF9F6] hover:bg-[#FFF5F5] border border-[#E8E6E1] hover:border-[#FCD4D4] rounded-xl cursor-pointer transition-all space-y-1 group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#E31C1C] transition-colors">{lead.name}</span>
                            {isOverdue ? (
                              <span className="text-[9px] text-white font-black uppercase tracking-wider bg-[#E31C1C] px-2 py-0.5 rounded-md animate-pulse">
                                Overdue • {time}
                              </span>
                            ) : (
                              <span className="text-[9px] text-[#E31C1C] font-black uppercase tracking-wider bg-[#FFF5F5] border border-[#FCD4D4] px-1.5 py-0.2 rounded-md">
                                {time}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                            Please contact regarding <span className="text-slate-700 font-bold">{lead.course}</span> today.
                          </p>
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest pt-1 border-t border-[#EBEAE6]/40 mt-1 flex items-center gap-1">
                            <span>📞 Call or Send message</span>
                            <span className="text-[#E31C1C] opacity-0 group-hover:opacity-100 transition-opacity ml-auto">View Profile →</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-[#DEDCD8]">
              <div className="w-9 h-9 rounded-full bg-[#E31C1C] text-white font-black text-sm flex items-center justify-center shrink-0 shadow-inner">
                AJ
              </div>
              <div className="flex flex-col hidden sm:flex">
                <span className="text-slate-800 text-xs font-black leading-tight">Addish jain</span>
                <span className="text-[#E31C1C] text-[9px] font-black tracking-wider uppercase mt-0.5">ADMIN</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Custom Tabs */}
        <div className="flex border-b border-[#E3E1DC] gap-4">
          <button 
            onClick={() => setActiveTab('online')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'online' 
                ? 'text-[#E31C1C] border-[#E31C1C]' 
                : 'text-slate-450 border-transparent hover:text-slate-700'
            }`}
          >
            Online Leads
          </button>
          <button 
            onClick={() => setActiveTab('offline')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'offline' 
                ? 'text-[#E31C1C] border-[#E31C1C]' 
                : 'text-slate-450 border-transparent hover:text-slate-700'
            }`}
          >
            Admission Form
          </button>
          <button 
            onClick={() => setActiveTab('offlineLeads')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'offlineLeads' 
                ? 'text-[#E31C1C] border-[#E31C1C]' 
                : 'text-slate-450 border-transparent hover:text-slate-700'
            }`}
          >
            Offline Leads
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`pb-2.5 text-xs font-bold transition-all border-b-2 -mb-[2px] cursor-pointer ${
              activeTab === 'analytics' 
                ? 'text-[#E31C1C] border-[#E31C1C]' 
                : 'text-slate-450 border-transparent hover:text-slate-700'
            }`}
          >
            Performance Analytics
          </button>
        </div>

        {/* 3. Main Content Switching */}
        {selectedLead ? (
          <div className="bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-sm">
            <LeadDetails
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onUpdateStatus={handleUpdateStatus}
              onDeleteLead={handleDelete}
              onActivityAdded={refreshStaffSummary}
            />
          </div>
        ) : activeTab === 'analytics' ? (
          <div className="bg-white border border-[#E8E6E1] rounded-3xl p-6 shadow-sm">
            <LeadConnectionSummary activities={staffSummary} />
          </div>
        ) : activeTab === 'offline' ? (
          <AdmissionTab />
        ) : activeTab === 'offlineLeads' ? (
          <OfflineLeadsTab leads={leads} refreshLeads={refreshLeads} />
        ) : activeTab !== 'online' ? (
          <div className="bg-white border border-[#EBEAE6] rounded-2xl p-16 text-center shadow-sm">
            <p className="text-xs font-bold text-slate-400">Coming soon</p>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Stats Bar */}
            <LeadStats 
              counts={statsCounts}
              activeStatusFilter={activeStatusFilter}
              setActiveStatusFilter={setActiveStatusFilter}
            />

            {/* Filters Toolbar */}
            <div className="bg-white border border-[#E8E6E1] shadow-sm rounded-2xl p-4 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
              <LeadSearch query={searchQuery} setQuery={setSearchQuery} />
              <LeadFilters
                selectedCourse={selectedCourse}
                setSelectedCourse={setSelectedCourse}
                selectedSource={selectedSource}
                setSelectedSource={setSelectedSource}
                selectedAssignment={selectedAssignment}
                setSelectedAssignment={setSelectedAssignment}
                sortBy={sortBy}
                setSortBy={setSortBy}
                clearFilters={clearFilters}
                isFiltered={isFiltered}
              />
            </div>

            {/* Inquiries Count bar */}
            <div className="flex items-center justify-between px-1">
              <div className="text-[11px] text-slate-500 font-extrabold">
                Showing {filteredLeads.length} of {leads.length} online website inquiries
              </div>
              <div className="text-[10px] text-slate-450 font-bold hidden sm:block">
                * Click student details card or status badges to operate.
              </div>
            </div>

            {/* Leads Card Stack */}
            {loading && leads.length === 0 ? (
              <div className="py-20 text-center text-slate-450 bg-white border border-[#E8E6E1] rounded-2xl">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 border-t-[#E31C1C] animate-spin mx-auto mb-3" />
                <p className="text-xs font-semibold">Loading lead records...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl">
                <p className="text-xs font-bold">{error}</p>
              </div>
            ) : (
              <LeadTable
                leads={filteredLeads}
                latestActivitiesMap={latestActivitiesMap}
                connectedLeadsMap={connectedLeadsMap}
                onOpenDetails={(l) => setSelectedLead(l)}
                onUpdateStatus={handleUpdateStatus}
                onDelete={handleDelete}
                onOpenWhatsApp={(l) => {
                  setRowActionLead(l);
                  setActiveMessageModal(true);
                }}
                onOpenCallLog={(l) => {
                  setRowActionLead(l);
                  setActiveCallModal(true);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Footer Bar */}
      {activeTab === 'online' && !selectedLead && (
        <div className="mt-8 pt-5 border-t border-[#E3E1DC] flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-bold text-slate-450">
          {/* Refresh Timer */}
          <div className="flex items-center gap-1.5 shrink-0">
            <RefreshCw size={13} className={`text-[#E31C1C] cursor-pointer ${loading ? 'animate-spin' : ''}`} onClick={handleManualRefresh} />
            <span>Auto refresh in <span className="text-[#E31C1C]">{countdown}s</span></span>
            <span className="text-slate-300">|</span>
            <button onClick={handleManualRefresh} className="text-[#E31C1C] hover:underline cursor-pointer bg-transparent border-0 font-bold">
              Refresh Now
            </button>
          </div>

          {/* Quick status summary dots */}
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#3b82f6] rounded-full inline-block" />
              <span className="text-slate-600">{statsCounts.New} New Inquiry</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#f59e0b] rounded-full inline-block" />
              <span className="text-slate-600">{statsCounts.Connected} Connected</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#a855f7] rounded-full inline-block" />
              <span className="text-slate-600">{statsCounts['Follow-up']} Follow-up</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-[#10b981] rounded-full inline-block" />
              <span className="text-slate-600">{statsCounts.Converted} Converted</span>
            </div>
          </div>

          {/* CRM tag */}
          <div className="tracking-wider text-slate-400 font-extrabold uppercase shrink-0">
            JAINS COMPUTER CRM V2.0
          </div>
        </div>
      )}

      {/* Row action modals */}
      {activeCallModal && rowActionLead && (
        <ActivityModal
          lead={rowActionLead}
          onClose={() => {
            setActiveCallModal(false);
            setRowActionLead(null);
          }}
          onSave={handleSaveActivityRow}
        />
      )}

      {activeMessageModal && rowActionLead && (
        <MessageModal
          lead={rowActionLead}
          onClose={() => {
            setActiveMessageModal(false);
            setRowActionLead(null);
          }}
          onSave={handleSaveActivityRow}
        />
      )}
    </div>
  );
}
