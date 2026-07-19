export default function Slide06Services() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[7vw] py-[6vh]">
      <div className="absolute top-0 right-0 w-[30vw] h-[30vh] bg-[#C21875]/8 rounded-full blur-[5vw] pointer-events-none" />

      {/* Header */}
      <div className="mb-[4vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">06 / What We Do</p>
        <div className="flex items-end gap-[3vw]">
          <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Services We Provide</h2>
          <p className="font-body text-[1.7vw] text-white/45 mb-[0.5vh]">Available with a single call or app tap.</p>
        </div>
      </div>

      {/* Row 1 — 4 services */}
      <div className="grid grid-cols-4 gap-[2vw] mb-[2.5vh]">
        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Battery Charge</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Jump-start using professional equipment</p>
        </div>

        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Fuel Delivery</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Emergency fuel when you run dry</p>
        </div>

        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Tire Change</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Quick swap with zero rim damage</p>
        </div>

        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Emergency Towing</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Safe flatbed towing, your choice of workshop</p>
        </div>
      </div>

      {/* Row 2 — 3 services + 1 empty spacer */}
      <div className="grid grid-cols-4 gap-[2vw]">
        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Lockout Assist</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Non-destructive vehicle entry</p>
        </div>

        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Light Mechanical</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">On-spot repairs by certified mechanics</p>
        </div>

        <div className="p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[4vw] h-[4vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <svg className="w-[2vw] h-[2vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1vh]">Fault Diagnostics</p>
          <p className="font-body text-[1.5vw] text-white/50 leading-snug">Advanced OBD scanning on-site</p>
        </div>

        <div className="p-[2.5vw] bg-gradient-to-br from-[#2D1B69]/40 to-[#C21875]/20 rounded-[1.5vw] border border-[#C21875]/30 flex flex-col justify-center items-center text-center">
          <p className="font-display font-black text-[3.5vw] text-[#C21875] leading-none mb-[1vh]">7</p>
          <p className="font-body text-[1.6vw] text-white/70 leading-snug">Services included</p>
        </div>
      </div>
    </div>
  );
}
