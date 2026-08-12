import React, { useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';

const STAFF_MEMBERS = [
  "Khushi Soni",
];

const MESSAGE_TEMPLATES = {
  general:
    "Hi {leadName},\n\nThis is {staffName} from Jains Computer. I'm reaching out regarding your inquiry about {course}.\n\nPlease feel free to reach out if you have any questions.\n\nThanks!",
  followUp:
    "Hi {leadName},\n\nThis is {staffName} from Jains Computer. I wanted to follow up on our conversation regarding {course}.\n\nWould you like to visit our institute for a demo?\n\nThanks!",
  visit:
    "Hi {leadName},\n\nThis is {staffName} from Jains Computer. Just a reminder about your upcoming visit to our institute.\n\nWe look forward to meeting you!\n\nAddress: [Institute Address]",
};

export default function MessageModal({ lead, onClose, onSave }) {
  const [staffName, setStaffName] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [sending, setSending] = useState(false);

  const fillTemplate = (templateKey, currentStaff = staffName) => {
    setSelectedTemplate(templateKey);
    const template = MESSAGE_TEMPLATES[templateKey];
    if (template) {
      setMessage(
        template
          .replace(/{leadName}/g, lead.name)
          .replace(/{staffName}/g, currentStaff || "[Staff Name]")
          .replace(/{course}/g, lead.course || "the course")
      );
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !staffName) return;
    setSending(true);
    try {
      const encoded = encodeURIComponent(message.trim());
      window.open(`https://wa.me/91${lead.phone}?text=${encoded}`, "_blank");
      
      // Save timeline event
      await onSave({
        staffName,
        callStatus: "Message Sent",
        notes: message.trim(),
        followUpDate: null
      });
      onClose();
    } catch (err) {
      console.error("Failed to log message activity:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b0a09]/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-[#E8E6E1] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EBEAE6] bg-[#FAF9F6]">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">Compose WhatsApp Message</h3>
            <p className="text-[10px] text-slate-450 font-bold mt-1">To: {lead.name} — <span className="font-mono">{lead.phone}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer bg-transparent border-0">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Sender Staff Selection */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">
              Send as <span className="text-[#E31C1C]">*</span>
            </label>
            <div className="relative">
              <select
                value={staffName}
                onChange={(e) => {
                  const val = e.target.value;
                  setStaffName(val);
                  if (selectedTemplate) fillTemplate(selectedTemplate, val);
                }}
                className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all cursor-pointer appearance-none pr-8"
                style={{
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2050/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '12px'
                }}
              >
                <option value="">— Select Staff —</option>
                {STAFF_MEMBERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Templates selection buttons */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">Quick Templates</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                className={`px-3 py-1.5 border text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  selectedTemplate === "general"
                    ? "bg-[#FDF2F2] border-[#FCD4D4] text-[#E31C1C]"
                    : "bg-white border-[#DEDCD8] text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6]"
                }`}
                onClick={() => fillTemplate("general")}
                disabled={!staffName}
              >
                General Intro
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 border text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  selectedTemplate === "followUp"
                    ? "bg-[#FDF2F2] border-[#FCD4D4] text-[#E31C1C]"
                    : "bg-white border-[#DEDCD8] text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6]"
                }`}
                onClick={() => fillTemplate("followUp")}
                disabled={!staffName}
              >
                Follow Up
              </button>
              <button
                type="button"
                className={`px-3 py-1.5 border text-xs font-bold rounded-xl cursor-pointer transition-colors ${
                  selectedTemplate === "visit"
                    ? "bg-[#FDF2F2] border-[#FCD4D4] text-[#E31C1C]"
                    : "bg-white border-[#DEDCD8] text-slate-500 hover:text-slate-800 hover:bg-[#FAF9F6]"
                }`}
                onClick={() => fillTemplate("visit")}
                disabled={!staffName}
              >
                Visit Reminder
              </button>
            </div>
            {!staffName && (
              <p className="text-[10px] text-amber-600 italic mt-1 font-semibold">Please select a staff member first to unlock quick templates.</p>
            )}
          </div>

          {/* Text Area */}
          <div className="space-y-1.5 flex flex-col">
            <label className="text-[10px] font-black text-slate-455 uppercase tracking-wide">
              Message <span className="text-[#E31C1C]">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSelectedTemplate("");
              }}
              className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-medium text-slate-850 outline-none focus:border-slate-500 focus:bg-white transition-all placeholder:text-slate-400"
              rows={6}
              placeholder="Type your WhatsApp message text here..."
            />
          </div>

          {/* Preview panel */}
          {message && (
            <div className="p-3.5 bg-[#FAF9F6] border border-[#E8E6E1] rounded-xl space-y-1">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Live Message Preview:</span>
              <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed font-mono">
                {message}
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EBEAE6]">
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-white border border-[#DEDCD8] hover:bg-[#FAF9F6] rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer shadow-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!message.trim() || !staffName || sending}
              className="px-4 py-2.5 bg-[#10b981] hover:bg-[#059669] hover:shadow-lg hover:shadow-emerald-500/10 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-sm border-0"
            >
              {sending ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  <span>Logging...</span>
                </>
              ) : (
                <>
                  <Send size={12} />
                  <span>Send via WhatsApp</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
