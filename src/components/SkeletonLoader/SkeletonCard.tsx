import type { JSX } from "react";

const SkeletonCard = (): JSX.Element => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-gray-100 mb-3" />
      <div className="h-3 bg-gray-100 rounded w-3/4 mb-2" />
      <div className="h-6 bg-gray-100 rounded w-1/2" />
    </div>
  );
};

export default SkeletonCard;
