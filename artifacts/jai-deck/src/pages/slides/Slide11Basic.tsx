export default function Slide11Basic() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D1B69]/20 to-transparent pointer-events-none" />

      {/* Left — price hero */}
      <div className="relative w-[40vw] h-full flex flex-col justify-center px-[7vw] border-r border-white/5">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[2vh]">11 / Basic Plan</p>
        <p className="font-display font-black text-[11vw] text-white leading-none tracking-tighter">199</p>
        <p className="font-body text-[2.5vw] text-white/50 mt-[1vh] mb-[3vh]">SAR / year</p>
        <p className="font-display font-bold text-[2.5vw] text-[#C21875]">الباقة الأساسية</p>
        <div className="mt-[3vh] w-[8vw] h-[0.4vh] bg-white/15 rounded-full" />
        <p className="font-body text-[1.7vw] text-white/40 mt-[3vh] leading-relaxed">Activates within 48 hours. Valid 12 months. One vehicle.</p>
      </div>

      {/* Right — features */}
      <div className="flex-1 flex flex-col justify-center px-[5vw] pr-[7vw]">
        <h3 className="font-display font-bold text-[2.5vw] text-white mb-[4vh]">What's included</h3>
        <div className="flex flex-col gap-[2.8vh]">
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Battery charge <span className="text-[#C21875] font-semibold">×6</span></p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Fuel supply <span className="text-[#C21875] font-semibold">×6</span></p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Tire change <span className="text-[#C21875] font-semibold">×6</span></p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Light mechanical repair <span className="text-[#C21875] font-semibold">×2</span></p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Emergency towing <span className="text-[#C21875] font-semibold">×2</span></p>
          </div>
        </div>
        <div className="mt-[5vh] p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <p className="font-body text-[1.7vw] text-white/50 leading-relaxed">Ideal for everyday drivers who want core coverage at an accessible price.</p>
        </div>
      </div>
    </div>
  );
}
