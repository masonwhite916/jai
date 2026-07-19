export default function Slide02Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute top-0 left-0 w-[28vw] h-[0.5vh] bg-gradient-to-r from-[#C21875] to-transparent" />
      <div className="absolute bottom-[12vh] right-0 w-[25vw] h-[45vh] bg-[#2D1B69]/15 rounded-full blur-[5vw] pointer-events-none" />

      {/* Header */}
      <div className="mb-[5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">01 / The Challenge</p>
        <h2 className="font-display font-black text-[4.8vw] text-white leading-none tracking-tight">The Problem</h2>
      </div>

      {/* 2×2 grid of problem cards */}
      <div className="grid grid-cols-2 gap-[2.5vw] flex-1">
        <div className="flex gap-[2vw] items-start p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="flex-shrink-0 w-[5vw] h-[5vw] rounded-full border border-[#C21875]/50 flex items-center justify-center">
            <span className="font-display font-black text-[2vw] text-[#C21875]">01</span>
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white mb-[1vh] leading-snug">No Reliable Help</p>
            <p className="font-body text-[1.65vw] text-white/55 leading-relaxed">Millions of drivers across Saudi Arabia face breakdowns with no reliable help nearby.</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="flex-shrink-0 w-[5vw] h-[5vw] rounded-full border border-[#C21875]/50 flex items-center justify-center">
            <span className="font-display font-black text-[2vw] text-[#C21875]">02</span>
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white mb-[1vh] leading-snug">Long Waits, Unknown Costs</p>
            <p className="font-body text-[1.65vw] text-white/55 leading-relaxed">Unpredictable wait times and hidden charges from unqualified technicians are the norm.</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="flex-shrink-0 w-[5vw] h-[5vw] rounded-full border border-[#C21875]/50 flex items-center justify-center">
            <span className="font-display font-black text-[2vw] text-[#C21875]">03</span>
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white mb-[1vh] leading-snug">Fragmented Market</p>
            <p className="font-body text-[1.65vw] text-white/55 leading-relaxed">No single platform combines fast dispatch, transparent pricing, and professional care.</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="flex-shrink-0 w-[5vw] h-[5vw] rounded-full border border-[#C21875]/50 flex items-center justify-center">
            <span className="font-display font-black text-[2vw] text-[#C21875]">04</span>
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white mb-[1vh] leading-snug">Danger &amp; Wasted Hours</p>
            <p className="font-body text-[1.65vw] text-white/55 leading-relaxed">Stranded drivers face real safety risks and lose hours of their day with no resolution.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
