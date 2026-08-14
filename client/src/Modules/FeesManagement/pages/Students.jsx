import React, { useState } from 'react';
import { User, Eye, CreditCard, Download, UserPlus, SlidersHorizontal, Edit2, Trash2, RefreshCw, X } from 'lucide-react';
import { useSystemSettings } from '../context/SettingsContext';
import { COURSES } from '../../../constants/Courses';
import CommonTable from '../components/CommonTable';
import StatusBadge from '../components/StatusBadge';
import FilterPanel from '../components/FilterPanel';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ConfirmationDialog from '../components/ConfirmationDialog';
import { useStudents } from '../hooks/useStudents';

const Students = ({ onNavigate, setSelectedStudentId }) => {
  const { students, loading, error, refetchStudents, editStudent, removeStudent } = useStudents();
  const { settings } = useSystemSettings();

  const [courseFilter, setCourseFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    fatherName: '',
    email: '',
    mobile: ''
  });

  // Delete Confirmation State
  const [deleteTarget, setDeleteTarget] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Format currency
  const formatINR = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Filter students
  const filteredStudents = students.filter((stu) => {
    const feeStatus = stu.feePlan?.status || 'Pending';
    const matchesCourse = courseFilter === 'All' || stu.course === courseFilter;
    const matchesStatus = statusFilter === 'All' || feeStatus.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesSearch =
      (stu.fullName && stu.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stu.studentId && stu.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stu.email && stu.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (stu.mobile && stu.mobile.includes(searchQuery));

    return matchesCourse && matchesStatus && matchesSearch;
  });

  // Export to CSV Handler
  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      showToast('No student records to export.', 'error');
      return;
    }
    const headers = ['Student ID', 'Name', 'Course', 'Phone', 'Email', 'Payment Plan', 'Fee Status', 'Remaining Amount'];
    const rows = filteredStudents.map(stu => [
      stu.studentId,
      stu.fullName,
      stu.course,
      stu.mobile,
      stu.email,
      stu.feePlan?.paymentPlan || 'N/A',
      stu.feePlan?.status || 'Pending',
      stu.feePlan?.remainingAmount || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `JCMS_Students_Dues_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Student registry downloaded successfully!');
  };

  // Delete student confirm action
  const executeDeleteStudent = async () => {
    if (!deleteTarget) return;
    try {
      await removeStudent(deleteTarget.id);
      showToast(`Student ${deleteTarget.name} deleted successfully!`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to delete student.', 'error');
    }
  };

  // Open Edit Modal
  const openEditModal = (student) => {
    setEditingStudent(student);
    setEditForm({
      fullName: student.fullName || '',
      fatherName: student.fatherName || '',
      email: student.email || '',
      mobile: student.mobile || ''
    });
    setIsEditModalOpen(true);
  };

  // Submit student updates
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await editStudent(editingStudent._id, editForm);
      if (res.success) {
        showToast('Student profile updated successfully!');
        setIsEditModalOpen(false);
        refetchStudents();
      }
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update student profile.', 'error');
    }
  };

  // Table Column Definitions
  const columns = [
    {
      header: 'Student ID',
      accessor: 'studentId',
      render: (stu) => <span className="font-mono text-slate-500">{stu.studentId}</span>
    },
    {
      header: 'Student Name',
      accessor: 'fullName',
      render: (stu) => (
        <div className="space-y-0.5">
          <div className="font-bold text-slate-800">{stu.fullName}</div>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{stu.course}</span>
        </div>
      )
    },
    {
      header: 'Father Name',
      accessor: 'fatherName',
      render: (stu) => <span className="text-slate-600">{stu.fatherName || '-'}</span>
    },
    {
      header: 'Contact Info',
      accessor: 'mobile',
      render: (stu) => (
        <div>
          <div className="font-semibold text-slate-700">{stu.mobile}</div>
          <div className="text-[10px] text-slate-400 font-normal">{stu.email}</div>
        </div>
      )
    },
    {
      header: 'Fee Status',
      accessor: 'feePlan',
      render: (stu) => <StatusBadge status={stu.feePlan?.status || 'PENDING'} />
    },
    {
      header: 'Remaining Dues',
      accessor: 'remainingAmount',
      className: 'text-right',
      render: (stu) => {
        const remaining = stu.feePlan?.remainingAmount || 0;
        return (
          <span className={`font-extrabold ${remaining > 0 ? 'text-rose-600' : 'text-emerald-650'}`}>
            {formatINR(remaining)}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      className: 'text-right',
      render: (stu) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedStudentId(stu._id);
              onNavigate(`student-profile?studentId=${stu._id}`);
            }}
            className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-slate-655 hover:bg-[#FAF9F6] transition-all cursor-pointer"
            title="View Financial Profile"
          >
            <Eye size={12} />
          </button>
          
          {stu.feePlan && stu.feePlan.remainingAmount > 0 && (
            <button
              onClick={() => {
                setSelectedStudentId(stu._id);
                onNavigate(`collect-payment?studentId=${stu._id}&collect=true`);
              }}
              className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-amber-500 hover:bg-[#FAF9F6] transition-all cursor-pointer"
              title="Collect Fees"
            >
              <CreditCard size={12} />
            </button>
          )}

          <button
            onClick={() => openEditModal(stu)}
            className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-blue-500 hover:bg-[#FAF9F6] transition-all cursor-pointer"
            title="Edit Details"
          >
            <Edit2 size={12} />
          </button>

          <button
            onClick={() => setDeleteTarget({ id: stu._id, name: stu.fullName })}
            className="p-1.5 rounded-lg border border-[#DEDCD8] bg-white text-rose-500 hover:bg-[#FAF9F6] transition-all cursor-pointer"
            title="Delete Student"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )
    }
  ];

  const dropdownFilters = (
    <FilterPanel showIcon={true}>
      <select
        value={courseFilter}
        onChange={(e) => setCourseFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Courses</option>
        {COURSES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="bg-transparent border-none outline-none text-xs font-bold cursor-pointer text-slate-700"
      >
        <option value="All">All Fee Status</option>
        <option value="Paid">Paid</option>
        <option value="Partial">Partial</option>
        <option value="Pending">Pending</option>
        <option value="Overdue">Overdue</option>
      </select>
    </FilterPanel>
  );

  return (
    <div className="space-y-4">
      
      {/* Toast popup */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl text-xs font-bold transition-all border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-100 text-rose-600' 
            : 'bg-emerald-50 border-emerald-100 text-emerald-600'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header action panel */}
      <div className="flex justify-between items-center bg-white p-4 border border-[#EBEAE6] rounded-2xl shadow-sm">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Students Directory</h3>
          <p className="text-[10px] font-semibold text-slate-400">Total registered profiles: {students.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-[#DEDCD8] bg-white text-slate-655 hover:bg-[#FAF9F6] rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 flex items-center gap-1.5"
            title="Download directory CSV"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => onNavigate('enrollment')}
            className="py-2 px-3.5 bg-amber-500 hover:bg-amber-600 border-0 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
          >
            <UserPlus size={14} />
            <span>Enroll Student</span>
          </button>
          <button 
            onClick={refetchStudents}
            className="p-2 border border-[#DEDCD8] bg-white text-slate-500 rounded-xl hover:bg-[#FAF9F6] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={refetchStudents} />}

      {/* Main Table view */}
      <CommonTable
        columns={columns}
        data={filteredStudents}
        loading={loading}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search Name, ID, Email, Phone..."
        emptyMessage="No student records found matching selections."
        filters={dropdownFilters}
        itemsPerPage={15}
      />

      {/* Edit Student Modal Drawer */}
      {isEditModalOpen && editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-sm bg-white border border-[#EBEAE6] rounded-3xl shadow-2xl overflow-hidden p-6 space-y-4">
            
            <div className="flex justify-between items-center pb-2 border-b border-[#FAF9F6]">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Edit Student Bio</h4>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-[#FAF9F6] text-slate-400 hover:text-slate-650 transition-all cursor-pointer outline-none"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs font-bold text-slate-655">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Full Name *</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Father's Name</label>
                <input
                  type="text"
                  value={editForm.fatherName}
                  onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase text-slate-400 font-bold">Contact Mobile</label>
                <input
                  type="text"
                  value={editForm.mobile}
                  onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                  className="w-full px-3 py-2 border border-[#DEDCD8] rounded-xl font-semibold outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-full py-2 border border-[#DEDCD8] bg-white text-slate-655 hover:bg-[#FAF9F6] rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold cursor-pointer transition-all active:scale-95"
                >
                  Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDeleteStudent}
        title="Delete Student Profile?"
        message={`Are you absolutely sure you want to delete ${deleteTarget?.name}'s profile? All fee structure balances and transaction histories relative to this profile will be soft deleted.`}
        confirmText="Yes, Delete"
        type="danger"
      />

    </div>
  );
};

export default Students;
