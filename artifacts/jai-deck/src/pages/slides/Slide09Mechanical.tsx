export default function Slide09Mechanical() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-[#C21875]/8 rounded-full blur-[6vw] pointer-events-none" />

      <div className="mb-[5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">09 / Service Deep Dive</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Mechanical &amp; Diagnostics</h2>
      </div>

      <div className="grid grid-cols-2 gap-[3vw] flex-1">
        <div className="flex flex-col p-[3.5vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5.5vw] h-[5.5vw] rounded-full bg-[#C21875] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(194,24,117,0.4)]">
            <svg className="w-[2.5vw] h-[2.5vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.8vw] text-white mb-[2.5vh] leading-tight">Light Mechanical Repair</h3>
          <p className="font-body text-[1.8vw] text-white/60 leading-relaxed mb-[2.5vh]">On-the-spot fixes by certified mechanics — belts, hoses, minor electrical, and more.</p>
          <div className="mt-auto pt-[2.5vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.7vw] text-[#C21875]">×2 per year</p>
            <p className="font-body text-[1.6vw] text-white/40 mt-[0.5vh]">Basic and above</p>
          </div>
        </div>

        <div className="flex flex-col p-[3.5vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5.5vw] h-[5.5vw] rounded-full bg-[#5B2C91] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(91,44,145,0.4)]">
            <svg className="w-[2.5vw] h-[2.5vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.8vw] text-white mb-[2.5vh] leading-tight">Computer Fault Diagnostics</h3>
          <p className="font-body text-[1.8vw] text-white/60 leading-relaxed mb-[2.5vh]">Advanced OBD scanning to identify hidden faults before they become expensive repairs.</p>
          <div className="mt-auto pt-[2.5vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.7vw] text-[#5B2C91]">×3 per year</p>
            <p className="font-body text-[1.6vw] text-white/40 mt-[0.5vh]">Rental plan exclusive</p>
          </div>
        </div>
      </div>
    </div>
  );
}
