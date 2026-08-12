import React from 'react';

const COURSES = [
  'Python Programming',
  'Web Development',
  'Graphic Design',
  'Digital Marketing',
  'Tally & GST',
  'Video Editing',
  'Data Analytics',
  'C++ & Java Masterclass'
];

const SOURCES = [
  'Website',
  'Course Page',
  'Facebook',
  'Instagram',
  'Popup',
  'Google Search'
];

const STAFF_MEMBERS = [
  "Khushi Soni",
];

export default function LeadFilters({
  selectedCourse,
  setSelectedCourse,
  selectedSource,
  setSelectedSource,
  selectedAssignment,
  setSelectedAssignment,
  sortBy,
  setSortBy,
  clearFilters,
  isFiltered
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Course filter */}
      <div className="relative">
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="bg-white border border-[#DEDCD8] text-xs font-bold px-4 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px'
          }}
        >
          <option value="">All Courses</option>
          {COURSES.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>
      </div>

      {/* Source filter */}
      <div className="relative">
        <select
          value={selectedSource}
          onChange={(e) => setSelectedSource(e.target.value)}
          className="bg-white border border-[#DEDCD8] text-xs font-bold px-4 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px'
          }}
        >
          <option value="">All Sources</option>
          {SOURCES.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      {/* Assignment status filter */}
      <div className="relative">
        <select
          value={selectedAssignment}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          className="bg-white border border-[#DEDCD8] text-xs font-bold px-4 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px'
          }}
        >
          <option value="">All Staff</option>
          <option value="unassigned">🚨 Unassigned</option>
          <option value="assigned">✓ Assigned (Any)</option>
          {STAFF_MEMBERS.map((staff) => (
            <option key={staff} value={staff}>{staff}</option>
          ))}
        </select>
      </div>

      {/* Sorting options */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white border border-[#DEDCD8] text-xs font-black px-4 py-2.5 rounded-xl text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer appearance-none pr-8"
          style={{
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
            backgroundSize: '12px'
          }}
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="alphabetical">Sort: Name (A-Z)</option>
        </select>
      </div>

      {/* Clear Filters button */}
      {isFiltered && (
        <button
          onClick={clearFilters}
          className="text-xs font-bold text-[#E31C1C] hover:text-[#b81414] bg-[#FDF2F2] px-4 py-2.5 rounded-xl border border-[#FCD4D4] cursor-pointer shrink-0 text-center transition-colors shadow-sm"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
