import React, { useState } from 'react';
import { Plus, List } from 'lucide-react';
import OfflineLeadForm from './OfflineLeadForm';
import { leadService } from '../services/leadService';
import { formatDate } from '../../../utils/dateUtils';

export default function OfflineLeadsTab({ leads = [], refreshLeads }) {
  const [nestedTab, setNestedTab] = useState('new-lead'); // 'new-lead' | 'saved-leads'
  const [editingLead, setEditingLead] = useState(null);

  // Filter out online leads (which have source = "popup")
  const offlineLeads = Array.isArray(leads) 
    ? leads.filter(l => l.source !== 'popup') 
    : [];

  const handleLeadSubmit = async (leadData) => {
    if (!leadData) return; // cancelled
    try {
      const payload = {
        name: leadData.name,
        phone: leadData.contact,
        source: leadData.reference,
        course: leadData.course,
        counsellor: leadData.counsellor,
        date: leadData.date
      };

      if (editingLead) {
        await leadService.updateLead(editingLead._id || editingLead.id, payload);
      } else {
        await leadService.createOfflineLead(payload);
      }

      if (typeof refreshLeads === 'function') {
        refreshLeads();
      }

      setEditingLead(null);
      setNestedTab('saved-leads');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save offline lead.');
    }
  };

  const handleEditLead = (lead) => {
    setEditingLead({
      ...lead,
      id: lead._id || lead.id,
      contact: lead.phone,
      reference: lead.source,
      // Normalize date to YYYY-MM-DD
      date: lead.date ? new Date(lead.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
    });
    setNestedTab('new-lead');
  };

  const handleDeleteLead = async (id) => {
    if (window.confirm('Are you sure you want to delete this lead?')) {
      try {
        await leadService.deleteLead(id);
        if (typeof refreshLeads === 'function') {
          refreshLeads();
        }
      } catch (err) {
        console.error(err);
        alert('Failed to delete lead.');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingLead(null);
    setNestedTab('saved-leads');
  };

  return (
    <div className="space-y-6">
      {/* Nested Tabs — identical style to AdmissionTab */}
      <div className="bg-white border border-[#E8E6E1] rounded-2xl p-2 flex items-center shadow-sm w-fit gap-2">
        <button
          onClick={() => {
            setNestedTab('new-lead');
            setEditingLead(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            nestedTab === 'new-lead'
              ? 'bg-rose-50 text-[#E31C1C]'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <Plus size={14} />
          {editingLead ? 'Edit Lead' : 'New Offline Lead'}
        </button>
        <button
          onClick={() => {
            setNestedTab('saved-leads');
            setEditingLead(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            nestedTab === 'saved-leads'
              ? 'bg-slate-100 text-slate-800'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <List size={14} />
          Saved Leads ({offlineLeads.length})
        </button>
      </div>

      {/* Content Area */}
      {nestedTab === 'new-lead' ? (
        <OfflineLeadForm
          onSubmit={handleLeadSubmit}
          editingLead={editingLead}
          onCancel={editingLead ? handleCancelEdit : null}
        />
      ) : (
        /* Saved Leads Table — same aesthetic as RegisteredStudents */
        <div className="bg-white border border-[#E8E6E1] rounded-2xl shadow-sm overflow-hidden">
          {offlineLeads.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-xs font-bold text-slate-400">No offline leads recorded yet.</p>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">Use the "New Offline Lead" tab to add entries.</p>
            </div>
          ) : (
            <>
              {/* Table Header */}
              <div className="grid grid-cols-7 gap-2 px-5 py-3 bg-[#FAF9F6] border-b border-[#E8E6E1] text-[10px] font-black text-slate-500 uppercase tracking-wider">
                <span>Name</span>
                <span>Contact</span>
                <span>Reference</span>
                <span>Course</span>
                <span>Counsellor</span>
                <span>Date</span>
                <span className="text-right">Actions</span>
              </div>

              {/* Table Rows */}
              {offlineLeads.map(lead => (
                <div
                  key={lead._id || lead.id}
                  className="grid grid-cols-7 gap-2 px-5 py-3.5 border-b border-[#F0EEEA] last:border-b-0 hover:bg-[#FAFAF9] transition-colors items-center"
                >
                  <span className="text-xs font-bold text-slate-800 truncate">{lead.name}</span>
                  <span className="text-xs font-semibold text-slate-600">{lead.phone}</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{lead.source}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate">{lead.course}</span>
                  <span className="text-xs font-semibold text-slate-600">{lead.counsellor || '—'}</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {formatDate(lead.date || lead.createdAt)}
                  </span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEditLead(lead)}
                      className="text-[10px] font-black text-[#E31C1C] hover:underline cursor-pointer bg-transparent border-0 outline-none"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLead(lead._id || lead.id)}
                      className="text-[10px] font-black text-slate-400 hover:text-red-600 cursor-pointer bg-transparent border-0 outline-none"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
