export default function Slide12Accidents() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      <div className="absolute inset-0 bg-gradient-to-br from-[#C21875]/10 via-[#2D1B69]/15 to-transparent pointer-events-none" />
      <div className="absolute top-0 right-0 w-[35vw] h-[35vh] bg-[#C21875]/15 rounded-full blur-[6vw] pointer-events-none" />

      {/* Left — price hero */}
      <div className="relative w-[40vw] h-full flex flex-col justify-center px-[7vw] border-r border-[#C21875]/20">
        <div className="inline-flex mb-[3vh]">
          <span className="bg-[#C21875] text-white font-display font-bold text-[1.4vw] px-[2vw] py-[0.8vh] rounded-full tracking-widest uppercase">Most Popular</span>
        </div>
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[2vh]">12 / Accidents Plan</p>
        <p className="font-display font-black text-[11vw] text-white leading-none tracking-tighter">299</p>
        <p className="font-body text-[2.5vw] text-white/50 mt-[1vh] mb-[3vh]">SAR / year</p>
        <p className="font-display font-bold text-[2.5vw] text-[#C21875]">باقة الحوادث</p>
        <div className="mt-[3vh] w-[8vw] h-[0.4vh] bg-[#C21875]/40 rounded-full" />
        <p className="font-body text-[1.7vw] text-white/40 mt-[3vh] leading-relaxed">Activates within 48 hours. Valid 12 months. One vehicle.</p>
      </div>

      {/* Right — features */}
      <div className="flex-1 flex flex-col justify-center px-[5vw] pr-[7vw]">
        <h3 className="font-display font-bold text-[2.5vw] text-white mb-[4vh]">Full incident-to-resolution coverage</h3>
        <div className="flex flex-col gap-[2.8vh]">
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/90">All Basic plan benefits</p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/90">Accident vehicle transfer — official assessment center</p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/90">Transfer to workshop of client's choice</p>
          </div>
          <div className="flex items-center gap-[2vw]">
            <div className="w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875] flex items-center justify-center flex-shrink-0">
              <svg className="w-[1.2vw] h-[1.2vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-body text-[2vw] text-white/90">Priority dispatch unit assignment</p>
          </div>
        </div>
        <div className="mt-[5vh] p-[2.5vw] bg-[#C21875]/10 rounded-[1.5vw] border border-[#C21875]/30">
          <p className="font-body text-[1.7vw] text-white/70 leading-relaxed">Designed for drivers who want full incident-to-resolution coverage.</p>
        </div>
      </div>
    </div>
  );
}
