import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, ShieldAlert, 
  Calendar, Search, Plus, User, Edit2, Trash2, Award, Briefcase, Clock
} from 'lucide-react';
import { certificateApi } from '../../../api/certificateApi';
import Card from '../../../components/Card';
import { formatDate } from '../../../utils/dateUtils';

export default function CertificateManagement() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('list'); // 'list' or 'add'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Certificates list & search state
  const [certificates, setCertificates] = useState([]);
  const [search, setSearch] = useState('');

  // Add certificate form state
  const [studentName, setStudentName] = useState('');
  const [enrollmentNumber, setEnrollmentNumber] = useState('');
  const [course, setCourse] = useState('');
  const [courseIssueDate, setCourseIssueDate] = useState('');
  const [duration, setDuration] = useState('');
  const [internship, setInternship] = useState('');
  const [internshipDuration, setInternshipDuration] = useState('');
  const [issueDate, setIssueDate] = useState('');

  // Edit certificate state
  const [editItem, setEditItem] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // Fetch all certificates
  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await certificateApi.getCertificates();
      if (res.success) {
        setCertificates(res.data || []);
      }
    } catch (err) {
      console.error('Failed to get certificates:', err);
      setError(err.response?.data?.message || 'Failed to fetch certificate records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Add new certificate
  const handleAddCertificate = async (e) => {
    e.preventDefault();
    if (!studentName || !enrollmentNumber || !course || !courseIssueDate || !duration || !internship || !issueDate) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await certificateApi.createCertificate({
        studentName,
        enrollmentNumber,
        course,
        courseIssueDate,
        duration,
        internship,
        internshipDuration,
        issueDate
      });

      if (res.success) {
        setSuccess('Certificate added successfully! ✅');
        // Reset form
        setStudentName('');
        setEnrollmentNumber('');
        setCourse('');
        setCourseIssueDate('');
        setDuration('');
        setInternship('');
        setInternshipDuration('');
        setIssueDate('');
        fetchCertificates();
        
        // Switch to list tab after short delay
        setTimeout(() => {
          setActiveTab('list');
          setSuccess('');
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to add certificate:', err);
      setError(err.response?.data?.message || 'Failed to create certificate record.');
    } finally {
      setLoading(false);
    }
  };

  // Save edited certificate
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      setEditLoading(true);
      setError('');
      setSuccess('');
      const res = await certificateApi.updateCertificate(editItem._id, editItem);
      
      if (res.success) {
        setSuccess('Certificate details updated successfully! ✅');
        setEditItem(null);
        fetchCertificates();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      console.error('Failed to update certificate:', err);
      setError(err.response?.data?.message || 'Failed to update certificate details.');
    } finally {
      setEditLoading(false);
    }
  };

  // Delete certificate
  const handleDeleteCertificate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this certificate record? This action cannot be undone.')) return;
    try {
      setLoading(true);
      setError('');
      const res = await certificateApi.deleteCertificate(id);
      if (res.success) {
        setSuccess('Certificate record deleted successfully. ✅');
        fetchCertificates();
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      console.error('Failed to delete certificate:', err);
      setError(err.response?.data?.message || 'Failed to delete certificate record.');
    } finally {
      setLoading(false);
    }
  };

  // Search filter
  const filtered = useMemo(() => {
    return certificates.filter((c) =>
      c.enrollmentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
      c.course?.toLowerCase().includes(search.toLowerCase())
    );
  }, [certificates, search]);

  return (
    <div className="space-y-8 animate-fade-in text-slate-800 font-sans pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-[#E3E1DC]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/dashboard')} 
            className="p-2.5 rounded-full hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-850 border border-slate-200 cursor-pointer shadow-sm flex items-center justify-center bg-white"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
          
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Certificate Management</h1>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold bg-[#FAF9F6] border border-[#E8E6E1] py-1.5 px-3 rounded-lg shadow-sm">
                <Award size={14} className="text-slate-400" />
                <span>Active Registry</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-bold tracking-wide uppercase">Issue & Verify Student Credentials</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveTab('list')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'list' 
                ? 'bg-slate-800 border-slate-800 text-white' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Certificate Records ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              activeTab === 'add' 
                ? 'bg-[#E31C1C] border-[#E31C1C] text-white hover:bg-[#b81414]' 
                : 'bg-white border-slate-200 text-slate-655 hover:bg-slate-50'
            }`}
          >
            <Plus size={14} />
            <span>Add Certificate</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 text-brand-red text-xs font-bold p-3.5 rounded-2xl animate-fade-in flex items-center gap-2">
          <ShieldAlert size={15} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold p-3.5 rounded-2xl animate-fade-in flex items-center gap-2">
          <Check size={15} style={{ color: '#10b981' }} />
          <span>{success}</span>
        </div>
      )}

      {/* Main Content Area */}
      {activeTab === 'list' ? (
        <div className="space-y-6">
          
          {/* List Toolbar / Search */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full max-w-md">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student name, course or enrollment number..."
                className="w-full bg-white border border-[#DEDCD8] rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 transition-all placeholder:text-slate-400 shadow-sm"
              />
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            </div>
            {search && (
              <span className="text-xs font-semibold text-slate-450 self-end sm:self-center">
                Found {filtered.length} matches
              </span>
            )}
          </div>

          {/* Certificate Table Card */}
          <div className="bg-white border border-[#E8E6E1] rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
                <thead>
                  <tr className="border-b border-[#E8E6E1] text-[10px] font-black text-slate-500 uppercase tracking-wider bg-[#FAF9F6]">
                    <th className="p-4">Student</th>
                    <th className="p-4">Enrollment Number</th>
                    <th className="p-4">Course</th>
                    <th className="p-4">Course Issue Date</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Internship</th>
                    <th className="p-4">Internship Duration</th>
                    <th className="p-4">Certificate Issue Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBEAE6]">
                  {loading && certificates.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-12 text-center text-slate-400">
                        <div className="w-6 h-6 rounded-full border-2 border-slate-200 border-t-slate-800 animate-spin mx-auto mb-2" />
                        <span>Syncing database credentials registry...</span>
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="p-16 text-center text-slate-400 italic">
                        No certificate records matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item._id} className="hover:bg-[#FAF9F6]/40 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-brand-red font-black border border-rose-100 text-[10px]">
                              {item.studentName[0]?.toUpperCase()}
                            </div>
                            <span className="font-extrabold text-slate-800">{item.studentName}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700">{item.enrollmentNumber}</td>
                        <td className="p-4 text-slate-500 font-bold">{item.course}</td>
                        <td className="p-4 text-slate-400">{formatDate(item.courseIssueDate)}</td>
                        <td className="p-4 text-slate-500 font-semibold">{item.duration}</td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide border ${
                            item.internship === 'Yes' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                          }`}>
                            {item.internship}
                          </span>
                        </td>
                        <td className="p-4 text-slate-550">{item.internshipDuration || '-'}</td>
                        <td className="p-4 font-bold text-slate-700">{formatDate(item.issueDate)}</td>
                        <td className="p-4 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => setEditItem({ ...item })}
                              className="w-7 h-7 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center cursor-pointer border-0 outline-none transition-all active:scale-90"
                              title="Edit Certificate"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteCertificate(item._id)}
                              className="w-7 h-7 rounded-full bg-rose-50 hover:bg-rose-100 text-brand-red flex items-center justify-center cursor-pointer border-0 outline-none transition-all active:scale-90"
                              title="Delete Record"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Add Certificate Form View */
        <Card className="max-w-4xl mx-auto border border-[#E8E6E1] p-6 shadow-xs relative">
          <div className="flex items-center gap-2 mb-2 pb-3 border-b border-[#EBEAE6]">
            <Award className="text-brand-red" size={20} />
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Add Certificate Form</h2>
          </div>
          <p className="text-xs text-slate-500 mb-6 font-semibold">Declare and sign student graduation credential information in registry.</p>

          <form onSubmit={handleAddCertificate} className="space-y-6">
            <div className="flex flex-wrap gap-5">
              
              {/* Student Name */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Student Name</label>
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter student name"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs"
                  required
                />
              </div>

              {/* Enrollment Number */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Enrollment Number</label>
                <input
                  type="text"
                  value={enrollmentNumber}
                  placeholder="RJ/2025/..."
                  onChange={(e) => {
                    let value = e.target.value;
                    // Auto-format rule matching user code exactly
                    value = value.replace("RJ/", "");
                    value = value.replace(/[^0-9]/g, "");
                    let year = value.slice(0, 4);
                    let enroll = value.slice(4, 8);
                    let finalValue = "RJ/";
                    if (year) finalValue += year;
                    if (year.length === 4) finalValue += "/";
                    if (enroll) finalValue += enroll;
                    setEnrollmentNumber(finalValue);
                  }}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs"
                  required
                />
              </div>

              {/* Course */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Course Name</label>
                <input
                  type="text"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="Enter course"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs"
                  required
                />
              </div>

              {/* Course Issue Date */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Course Issue Date (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={courseIssueDate}
                  onChange={(e) => setCourseIssueDate(e.target.value)}
                  placeholder="DD/MM/YYYY (e.g. 12/03/2025)"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs font-mono"
                  required
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Course Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g. 6 Months"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs"
                  required
                />
              </div>

              {/* Internship Status */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Internship Experience</label>
                <select
                  value={internship}
                  onChange={(e) => setInternship(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs cursor-pointer"
                  required
                >
                  <option value="">Select Option</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              {/* Internship Duration */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Internship Duration</label>
                <input
                  type="text"
                  value={internshipDuration}
                  onChange={(e) => setInternshipDuration(e.target.value)}
                  placeholder="e.g. 3 Months (Leave empty if No)"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs"
                  disabled={internship === 'No'}
                />
              </div>

              {/* Certificate Issue Date */}
              <div className="space-y-1.5 flex flex-col">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Certificate Issue Date (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  placeholder="DD/MM/YYYY (e.g. 01/01/2026)"
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-3 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all shadow-xs font-mono"
                  required
                />
              </div>

            </div>

            <div className="pt-4 border-t border-[#EBEAE6] flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#E31C1C] hover:bg-[#b81414] text-white rounded-xl text-xs font-black transition-all cursor-pointer border-0 active:scale-95 shadow-sm uppercase tracking-wider"
              >
                {loading ? 'Saving to Ledger...' : 'Save Certificate'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* EDIT OVERLAY MODAL */}
      {editItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 sm:p-6 z-50 animate-fade-in">
          <div className="bg-white border border-[#E8E6E1] rounded-3xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col max-h-[85vh] overflow-hidden">
            <button 
              onClick={() => setEditItem(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer bg-transparent border-0 flex items-center justify-center outline-none"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Edit2 className="text-[#E31C1C]" size={18} />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Edit Certificate Details</h3>
            </div>

            <form onSubmit={handleEditSave} className="overflow-y-auto flex-1 pr-1 space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Student Name</label>
                <input
                  type="text"
                  value={editItem.studentName}
                  onChange={(e) => setEditItem({ ...editItem, studentName: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Enrollment Number</label>
                <input
                  type="text"
                  value={editItem.enrollmentNumber}
                  onChange={(e) => setEditItem({ ...editItem, enrollmentNumber: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Course</label>
                <input
                  type="text"
                  value={editItem.course}
                  onChange={(e) => setEditItem({ ...editItem, course: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Course Issue Date (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={editItem.courseIssueDate}
                  onChange={(e) => setEditItem({ ...editItem, courseIssueDate: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDCD8] text-xs font-bold text-slate-800 focus:border-slate-400 outline-none bg-white font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Duration</label>
                <input
                  type="text"
                  value={editItem.duration}
                  onChange={(e) => setEditItem({ ...editItem, duration: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                  required
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Internship</label>
                <select
                  value={editItem.internship}
                  onChange={(e) => setEditItem({ ...editItem, internship: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all cursor-pointer"
                  required
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Internship Duration</label>
                <input
                  type="text"
                  value={editItem.internshipDuration || ''}
                  onChange={(e) => setEditItem({ ...editItem, internshipDuration: e.target.value })}
                  className="w-full bg-[#FAF9F6] border border-[#DEDCD8] rounded-xl p-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-slate-500 focus:bg-white transition-all"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="text-xs font-bold text-slate-655 uppercase tracking-wide block">Certificate Issue Date (DD/MM/YYYY)</label>
                <input
                  type="text"
                  value={editItem.issueDate}
                  onChange={(e) => setEditItem({ ...editItem, issueDate: e.target.value })}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DEDCD8] text-xs font-bold text-slate-800 focus:border-slate-400 outline-none bg-white font-mono"
                  required
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#EBEAE6]">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 bg-white hover:bg-slate-50 border border-[#DEDCD8] text-slate-500 rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm transition-all"
                  disabled={editLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-brand-red hover:bg-[#b81414] text-white rounded-xl text-xs font-bold py-2.5 cursor-pointer shadow-sm border-0 transition-all flex items-center justify-center gap-1.5"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
