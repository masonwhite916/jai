export default function Slide13Rental() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#5B2C91]/20 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[40vw] h-[50vh] bg-[#5B2C91]/15 rounded-full blur-[7vw] pointer-events-none" />

      {/* Left — price hero */}
      <div className="relative w-[40vw] h-full flex flex-col justify-center px-[7vw] border-r border-white/5">
        <p className="font-body text-[1.5vw] text-[#5B2C91] font-semibold tracking-[0.25em] uppercase mb-[2vh]">13 / Rental Plan</p>
        <p className="font-display font-black text-[11vw] text-white leading-none tracking-tighter">600</p>
        <p className="font-body text-[2.5vw] text-white/50 mt-[1vh] mb-[3vh]">SAR / year</p>
        <p className="font-display font-bold text-[2.5vw] text-[#5B2C91]">باقة الأجرة</p>
        <div className="mt-[3vh] w-[8vw] h-[0.4vh] bg-[#5B2C91]/60 rounded-full" />
        <p className="font-body text-[1.7vw] text-white/40 mt-[3vh] leading-relaxed">The complete package for high-mileage drivers and professionals.</p>
      </div>

      {/* Right — features */}
      <div className="flex-1 flex flex-col justify-center px-[5vw] pr-[7vw]">
        <h3 className="font-display font-bold text-[2.5vw] text-white mb-[4vh]">The most complete plan</h3>
        <div className="flex flex-col gap-[2.8vh]">
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#5B2C91] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">All Accidents plan benefits</p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#5B2C91] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Computer fault diagnostics <span className="text-[#5B2C91] font-semibold">×3</span></p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#5B2C91] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/80">Extended geographic support range</p>
          </div>
        </div>
        <div className="mt-[5vh] p-[2.5vw] bg-[#5B2C91]/15 rounded-[1.5vw] border border-[#5B2C91]/30">
          <p className="font-body text-[1.7vw] text-white/70 leading-relaxed">Built for fleet owners, high-mileage drivers, and professionals who depend on their vehicle daily.</p>
        </div>
      </div>
    </div>
  );
}
