const base = import.meta.env.BASE_URL;

export default function Slide05Coverage() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      {/* Left image */}
      <div className="relative w-[48vw] h-full">
        <img src={`${base}coverage.jpg`} crossOrigin="anonymous" alt="Riyadh" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#09061A]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09061A]/50 to-transparent" />
      </div>

      {/* Right content */}
      <div className="flex-1 flex flex-col justify-center pl-[4vw] pr-[7vw]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">05 / Where We Operate</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight mb-[5vh]">Current Coverage</h2>

        <div className="flex flex-col gap-[3.5vh]">
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.5vh] w-[1vw] h-[1vw] rounded-full bg-[#C21875]" />
            <div>
              <p className="font-display font-bold text-[2vw] text-white mb-[0.8vh]">Active Service Area</p>
              <p className="font-body text-[1.75vw] text-white/55 leading-relaxed">Riyadh and surrounding districts — full coverage, rapid dispatch.</p>
            </div>
          </div>

          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.5vh] w-[1vw] h-[1vw] rounded-full bg-[#5B2C91]" />
            <div>
              <p className="font-display font-bold text-[2vw] text-white mb-[0.8vh]">Strategic Positioning</p>
              <p className="font-body text-[1.75vw] text-white/55 leading-relaxed">Units located across Riyadh for minimum response time.</p>
            </div>
          </div>

          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.5vh] w-[1vw] h-[1vw] rounded-full bg-[#5B2C91]" />
            <div>
              <p className="font-display font-bold text-[2vw] text-white mb-[0.8vh]">Expansion Roadmap</p>
              <p className="font-body text-[1.75vw] text-white/55 leading-relaxed">Additional Saudi cities planned for upcoming phases.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
