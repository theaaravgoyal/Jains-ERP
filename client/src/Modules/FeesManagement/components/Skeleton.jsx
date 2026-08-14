import React from 'react';

/**
 * TableSkeleton - Renders rows of pulsing row-skeletons.
 */
export const TableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-white border border-[#EBEAE6] rounded-2xl p-4 space-y-4">
      {/* Header Row */}
      <div className="flex gap-4 border-b border-slate-100 pb-3 animate-pulse">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <div key={cIdx} className="h-4 bg-slate-100 rounded flex-1" />
        ))}
      </div>
      {/* Body Rows */}
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex gap-4 items-center py-2 animate-pulse">
          {Array.from({ length: cols }).map((_, cIdx) => (
            <div key={cIdx} className="h-3 bg-slate-50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * CardSkeleton - Renders card-skeletons for stats widgets.
 */
export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="bg-white border border-[#EBEAE6] p-4 rounded-2xl space-y-3 animate-pulse">
          <div className="flex justify-between">
            <div className="h-4 bg-slate-100 rounded w-1/3" />
            <div className="w-8 h-8 rounded-xl bg-slate-100" />
          </div>
          <div className="h-6 bg-slate-150 rounded w-1/2" />
          <div className="h-3 bg-slate-50 rounded w-2/3" />
        </div>
      ))}
    </div>
  );
};

/**
 * DetailSkeleton - Renders full-width profile details skeleton.
 */
export const DetailSkeleton = () => {
  return (
    <div className="bg-white border border-[#EBEAE6] p-6 rounded-2xl space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-slate-100" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-slate-150 rounded w-1/4" />
          <div className="h-3 bg-slate-100 rounded w-1/3" />
        </div>
      </div>
      <div className="h-px bg-slate-100" />
      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <div className="h-3 bg-slate-50 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-3/4" />
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-slate-50 rounded w-1/3" />
          <div className="h-4 bg-slate-100 rounded w-3/4" />
        </div>
      </div>
    </div>
  );
};

const Skeleton = {
  Table: TableSkeleton,
  Card: CardSkeleton,
  Detail: DetailSkeleton
};

export default Skeleton;
