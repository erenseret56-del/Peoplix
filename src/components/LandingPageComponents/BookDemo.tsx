import { GoDotFill } from "react-icons/go";

const BookDemo = () => {
  return (
    <section className="relative max-w-5xl mb-20 rounded-[40px] mx-auto flex items-center justify-center px-6 py-15 overflow-hidden">
      {/* Background Gradient & Glow */}
      <div
        className="absolute inset-0 w-full h-full overflow-hidden"
        style={{
          background: "#080808",
        }}
      >
        {/* Main Top Radial Glow */}
        <div 
          className="absolute inset-x-0 top-0 h-[150%] pointer-events-none"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(55,114,255,0.12) 0%, rgba(55,114,255,0.03) 40%, transparent 70%)"
          }}
        />
        
        {/* Secondary Bottom Glow */}
        <div 
          className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none opacity-50"
          style={{
            background: "radial-gradient(circle at 50% 100%, rgba(55,114,255,0.08) 0%, transparent 70%)"
          }}
        />
        
        {/* Subtle border to define the container */}
        <div className="absolute inset-0 border border-divider rounded-[40px] pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-3xl">
        {/* Tag */}
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 text-sm text-white py-1 px-3 rounded-full border border-divider bg-dark-gray/50 backdrop-blur-md whitespace-nowrap">
          <GoDotFill className="text-primary" />
          Close Strong
        </div>

        {/* Heading */}
        <h2 className="mt-14 text-4xl sm:text-5xl lg:text-6xl font-semibold text-white leading-tight tracker-tighter">
          See Peoplix in Action
        </h2>

        {/* Content */}
        <p className="mt-6 text-base font-normal text-white leading-relaxed">
          Experience how autonomous AI agents can transform HR operations.
        </p>

        {/* Button */}
        <button className="inline-flex mt-10 cursor-pointer items-center gap-2 bg-primary px-8 py-3 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <span className="text-sm text-white font-bold tracking-wide">
            Book a Demo
          </span>
        </button>
      </div>
    </section>
  );
};

export default BookDemo;
