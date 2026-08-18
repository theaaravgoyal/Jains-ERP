import React, { useState, useEffect } from 'react';
import { X, Send, Check } from 'lucide-react';

const AGENTS = [
  { id: 'khushi', name: 'Khushi Soni', display: 'Khushi Soni' }
];

const TEMPLATES = [
  { 
    id: 'intro', 
    name: 'Course Info & Introduction',
    text: "Hi {leadName},\n\nThis is {agentName} from Jains Computer. I'm reaching out regarding your inquiry about the {course} course.\n\nPlease let me know if you would like details about batch timings and course fees.\n\nThanks!"
  },
  { 
    id: 'followUp', 
    name: 'Follow-up / Fee Discount',
    text: "Hi {leadName},\n\nThis is {agentName} from Jains Computer. I wanted to follow up on our conversation regarding {course} and let you know about our limited-time fee discounts.\n\nWould you like to reserve a seat?\n\nThanks!"
  },
  { 
    id: 'syllabus', 
    name: 'Syllabus & Details Share',
    text: "Hi {leadName},\n\nThis is {agentName} from Jains Computer.\n\nAs requested, here is the syllabus outline for the {course} course.\n\nThanks!"
  }
];

export default function WhatsAppWorkspaceModal({ lead, operatingStaff, onClose, onSave }) {
  const defaultAgent = AGENTS.find(a => a.display === operatingStaff) || AGENTS[0];
  const [selectedAgent, setSelectedAgent] = useState(defaultAgent);
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[2]); // Default to Syllabus & Details Share
  const [message, setMessage] = useState('');

  // Auto-generate message when agent or template changes
  useEffect(() => {
    if (selectedAgent && selectedTemplate) {
      const generated = selectedTemplate.text
        .replace(/{leadName}/g, lead.name)
        .replace(/{agentName}/g, selectedAgent.display)
        .replace(/{course}/g, lead.course || 'Data Analytics');
      setMessage(generated);
    }
  }, [selectedAgent, selectedTemplate, lead]);

  const handleSend = () => {
    if (!message.trim()) return;
    const encoded = encodeURIComponent(message.trim());
    window.open(`https://wa.me/91${lead.phone}?text=${encoded}`, '_blank');
    
    // Save timeline log
    onSave({
      staffName: selectedAgent.display,
      callStatus: "Message Sent",
      notes: message.trim(),
      followUpDate: null
    });
    
    onClose();
  };

  const getSourceDisplay = (src) => {
    if (!src) return 'Website Inquiry';
    return src.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Inquiry';
  };

  return (
    <div className="fixed inset-0 bg-[#0B0A09]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in font-sans">
      <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* 1. Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6]">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">WhatsApp Workspace</span>
            <h3 className="text-base font-black text-slate-800 tracking-tight mt-0.5">Send Template Message</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0">
            <X size={20} />
          </button>
        </div>

        {/* 2. Metadata Info Banner */}
        <div className="bg-[#FFF5F5] border-b border-[#FED7D7] p-4 flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black text-[#E31C1C] uppercase tracking-wide">Sending Message To</span>
            <h4 className="text-sm font-extrabold text-slate-800 leading-none">{lead.name}</h4>
            <p className="text-[11px] text-slate-500 font-semibold font-mono">{lead.phone} • course: {lead.course}</p>
          </div>
          
          <div>
            <span className="inline-block bg-white text-[#E31C1C] border border-[#FCD4D4] rounded-full px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wide shadow-sm">
              {getSourceDisplay(lead.source)}
            </span>
          </div>
        </div>

        {/* 3. Modal Workspace Body */}
        <div className="p-6 overflow-y-auto flex flex-col md:flex-row gap-6 items-start flex-1 min-h-0">
          
          {/* Left Column: Selectors */}
          <div className="space-y-6">
            
            {/* Sender Agent Stack */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                1. Select Sender Agent
              </span>
              <div className="flex flex-col gap-2">
                {AGENTS.map((agent) => {
                  const isSelected = selectedAgent.id === agent.id;
                  return (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => setSelectedAgent(agent)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? 'border-[#E31C1C] bg-[#FFF5F5] text-[#E31C1C] shadow-sm'
                          : 'bg-white border-[#DEDCD8] hover:border-slate-400 text-slate-650 hover:text-slate-800'
                      }`}
                    >
                      <span>{agent.name}</span>
                      {isSelected && <span className="w-4 h-4 bg-[#E31C1C] rounded-full flex items-center justify-center text-white text-[9px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Template Stack */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">
                2. Select Message Template
              </span>
              <div className="flex flex-col gap-2">
                {TEMPLATES.map((tmpl) => {
                  const isSelected = selectedTemplate.id === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplate(tmpl)}
                      className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between border cursor-pointer ${
                        isSelected
                          ? 'border-[#E31C1C] bg-[#FFF5F5] text-[#E31C1C] shadow-sm'
                          : 'bg-white border-[#DEDCD8] hover:border-slate-400 text-slate-650 hover:text-slate-800'
                      }`}
                    >
                      <span>{tmpl.name}</span>
                      {isSelected && <span className="w-4 h-4 bg-[#E31C1C] rounded-full flex items-center justify-center text-white text-[9px] font-bold">✓</span>}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column: Live Message Preview */}
          <div className="space-y-2.5 h-full flex flex-col justify-start">
            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider">
              <span className="text-slate-450 flex items-center gap-1">👁️ 3. Message Preview</span>
              <span className="text-[#E31C1C] font-black">
                (Sender Selected - {selectedAgent.display.split(' ')[0]})
              </span>
            </div>

            {/* Chat Bubble Container with WhatsApp style dot-grid background */}
            <div className="border border-[#E8E6E1] rounded-2xl p-4 flex-1 flex flex-col justify-between h-72 shadow-inner"
              style={{
                backgroundColor: '#efebe3',
                backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 1px)',
                backgroundSize: '12px 12px'
              }}
            >
              {/* WhatsApp Chat Bubble */}
              <div className="bg-white rounded-2xl p-3.5 shadow-sm max-w-[90%] relative border border-white/60">
                {/* Editable Text area styled natively */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full text-xs text-slate-800 leading-relaxed font-sans outline-none resize-none border-0 p-0 focus:ring-0 select-text"
                  rows={8}
                />
                
                {/* Timestamp / Read check row */}
                <div className="flex items-center justify-end gap-1 text-[8px] text-slate-400 font-extrabold mt-2 font-mono uppercase tracking-wider">
                  <span>12:00 PM</span>
                  <span className="text-[#34b7f1]">Double Check ✓✓</span>
                </div>
              </div>

              {/* Tips banner */}
              <div className="text-[10px] text-slate-500 font-semibold mt-4 text-center">
                💡 You can edit the text directly in the preview bubble above.
              </div>
            </div>
          </div>

        </div>

        {/* 4. Footer Actions */}
        <div className="p-5 border-t border-[#EBEAE6] bg-[#FAF9F6] flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[10px] text-slate-450 font-bold text-center sm:text-left">
            Will trigger local API and update lead timeline log.
          </span>
          
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-white border border-[#DEDCD8] hover:bg-[#FAF9F6] text-slate-650 hover:text-slate-850 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm border-0"
            >
              <Send size={12} />
              <span>Send WhatsApp Message</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
