import type { JSX } from "react";

const SkeletonChart = (): JSX.Element => {
  return (
    <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="flex items-start justify-between mb-1">
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
        <div className="h-6 bg-gray-100 rounded w-32" />
      </div>
      <div className="mt-4 h-56 bg-gray-50 rounded-xl" />
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-50">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-2 bg-gray-100 rounded w-2/3 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SkeletonChart;
