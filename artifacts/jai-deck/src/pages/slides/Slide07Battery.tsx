export default function Slide07Battery() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D1B69]/15 to-transparent pointer-events-none" />

      <div className="mb-[5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">07 / Service Deep Dive</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Battery &amp; Towing</h2>
      </div>

      <div className="grid grid-cols-2 gap-[3vw] flex-1">
        {/* Battery Card */}
        <div className="flex flex-col p-[3.5vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5.5vw] h-[5.5vw] rounded-full bg-[#C21875] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(194,24,117,0.4)]">
            <svg className="w-[2.5vw] h-[2.5vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.8vw] text-white mb-[2.5vh] leading-tight">Battery Charge</h3>
          <p className="font-body text-[1.8vw] text-white/60 leading-relaxed mb-[3vh]">Instant jump-start using professional equipment — back on the road in minutes.</p>
          <div className="mt-auto pt-[2.5vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.7vw] text-[#C21875]">Up to ×6 per year</p>
            <p className="font-body text-[1.6vw] text-white/40 mt-[0.5vh]">Included in all membership tiers</p>
          </div>
        </div>

        {/* Towing Card */}
        <div className="flex flex-col p-[3.5vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5.5vw] h-[5.5vw] rounded-full bg-[#5B2C91] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(91,44,145,0.4)]">
            <svg className="w-[2.5vw] h-[2.5vw] text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.8vw] text-white mb-[2.5vh] leading-tight">Emergency Towing</h3>
          <p className="font-body text-[1.8vw] text-white/60 leading-relaxed mb-[3vh]">Safe flatbed or wheel-lift towing to any workshop or destination of your choice.</p>
          <div className="mt-auto pt-[2.5vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.7vw] text-[#5B2C91]">Up to ×2 per year</p>
            <p className="font-body text-[1.6vw] text-white/40 mt-[0.5vh]">Covered under every membership tier</p>
          </div>
        </div>
      </div>
    </div>
  );
}
