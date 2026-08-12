import React, { useState } from 'react';
import { Plus, List } from 'lucide-react';
import AdmissionForm from './AdmissionForm';
import RegisteredStudents from './RegisteredStudents';

export default function AdmissionTab() {
  const [nestedTab, setNestedTab] = useState('new-admission'); // 'new-admission' | 'registered-students'
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);

  const handleAdmissionSubmit = (studentData) => {
    if (!studentData) return; // cancelled
    if (editingStudent) {
      setRegisteredStudents(prev =>
        prev.map(s => s.id === editingStudent.id ? { ...studentData, id: s.id } : s)
      );
      setEditingStudent(null);
      setNestedTab('registered-students');
    } else {
      setRegisteredStudents(prev => [{ ...studentData, id: Date.now().toString() }, ...prev]);
      setNestedTab('registered-students');
    }
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setNestedTab('new-admission');
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setNestedTab('registered-students');
  };

  return (
    <div className="space-y-6">
      {/* Nested Tabs */}
      <div className="bg-white border border-[#E8E6E1] rounded-2xl p-2 flex items-center shadow-sm w-fit gap-2">
        <button
          onClick={() => {
            setNestedTab('new-admission');
            setEditingStudent(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            nestedTab === 'new-admission'
              ? 'bg-rose-50 text-[#E31C1C]'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <Plus size={14} />
          {editingStudent ? 'Edit Admission' : 'New Admission'}
        </button>
        <button
          onClick={() => {
            setNestedTab('registered-students');
            setEditingStudent(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
            nestedTab === 'registered-students'
              ? 'bg-slate-100 text-slate-800'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
          }`}
        >
          <List size={14} />
          Registered Students ({registeredStudents.length})
        </button>
      </div>

      {/* Content Area */}
      {nestedTab === 'new-admission' ? (
        <AdmissionForm
          onSubmit={handleAdmissionSubmit}
          editingStudent={editingStudent}
          onCancel={editingStudent ? handleCancelEdit : null}
        />
      ) : (
        <RegisteredStudents
          students={registeredStudents}
          onEdit={handleEditStudent}
        />
      )}
    </div>
  );
}
