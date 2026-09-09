import { GoDotFill } from "react-icons/go";
import ExpandingCard from "./ExpandingCard";

const TheProblem = () => {
  return (
    <div className="flex flex-col items-center mt-12 md:mt-20 px-4 mb-20">

      {/* Header Badge */}
      <div className="bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 flex gap-1 items-center">
        <GoDotFill className="text-gray-500" />
        <span className="text-sm text-gray-600 font-semibold">The Problem</span>
      </div>

      {/* Title */}
      <div className="text-gray-900 tracking-tighter text-2xl sm:text-4xl lg:text-[65px] lg:leading-[1.2] font-bold flex flex-col items-center mt-5 text-center mb-10">
        <span>Enterprise Service Teams</span>
        <span>Are Overwhelmed</span>
      </div>

      {/* Expanding Card */}
      <ExpandingCard />
    </div>
  );
};

export default TheProblem;
