const base = import.meta.env.BASE_URL;

export default function Slide20GetStarted() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col items-center justify-center text-center px-[10vw]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D1B69]/40 via-[#09061A] to-[#C21875]/20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60vw] h-[50vh] bg-[#C21875]/12 rounded-full blur-[8vw] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[50vw] h-[40vh] bg-[#2D1B69]/30 rounded-full blur-[8vw] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <img src={`${base}jai-logo.png`} crossOrigin="anonymous" alt="JAI" className="h-[12vh] object-contain mb-[5vh] opacity-95" />

        <div className="w-[10vw] h-[0.5vh] bg-[#C21875] mb-[5vh]" />

        <h1 className="font-display font-black text-[5.5vw] text-white leading-tight tracking-tight mb-[3vh]" style={{textWrap: 'balance'}}>
          Get Started with JAI
        </h1>
        <p className="font-body font-light text-[2.3vw] text-white/60 mb-[7vh]">Subscribe today and drive with confidence.</p>

        <div className="flex gap-[5vw] items-center justify-center">
          <div className="flex flex-col items-center gap-[1vh]">
            <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mb-[1vh]">
              <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <p className="font-body text-[1.5vw] text-white/40 uppercase tracking-widest">WhatsApp</p>
            <p className="font-display font-bold text-[2vw] text-white" dir="ltr">+966 55 561 6449</p>
          </div>

          <div className="w-[1px] h-[8vh] bg-white/15" />

          <div className="flex flex-col items-center gap-[1vh]">
            <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mb-[1vh]">
              <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" /></svg>
            </div>
            <p className="font-body text-[1.5vw] text-white/40 uppercase tracking-widest">Website</p>
            <p className="font-display font-bold text-[2vw] text-white">jai.com.sa</p>
          </div>

          <div className="w-[1px] h-[8vh] bg-white/15" />

          <div className="flex flex-col items-center gap-[1vh]">
            <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mb-[1vh]">
              <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <p className="font-body text-[1.5vw] text-white/40 uppercase tracking-widest">App</p>
            <p className="font-display font-bold text-[2vw] text-white">iOS &amp; Android</p>
          </div>
        </div>

        <div className="mt-[7vh] w-[10vw] h-[0.5vh] bg-white/10" />
        <p className="font-body text-[1.5vw] text-white/25 mt-[2vh] tracking-[0.2em] uppercase">JAI · جاي · Riyadh, Saudi Arabia</p>
      </div>
    </div>
  );
}
