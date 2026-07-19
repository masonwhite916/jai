export default function Slide08FuelTire() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute inset-0 bg-gradient-to-tl from-[#2D1B69]/15 to-transparent pointer-events-none" />

      <div className="mb-[5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">08 / Service Deep Dive</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Fuel, Tire &amp; Lockout</h2>
      </div>

      <div className="grid grid-cols-3 gap-[2.5vw] flex-1">
        <div className="flex flex-col p-[2.8vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5vw] h-[5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2.5vh]">
            <svg className="w-[2.3vw] h-[2.3vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.3vw] text-white mb-[2vh] leading-tight">Fuel Supply</h3>
          <p className="font-body text-[1.7vw] text-white/60 leading-relaxed mb-[2.5vh]">Emergency delivery of the correct fuel grade when you run dry — no jerry cans, no guesswork.</p>
          <div className="mt-auto pt-[2vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.65vw] text-[#C21875]">×6 per year</p>
            <p className="font-body text-[1.5vw] text-white/40 mt-[0.4vh]">All plans included</p>
          </div>
        </div>

        <div className="flex flex-col p-[2.8vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5vw] h-[5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2.5vh]">
            <svg className="w-[2.3vw] h-[2.3vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.3vw] text-white mb-[2vh] leading-tight">Tire Change</h3>
          <p className="font-body text-[1.7vw] text-white/60 leading-relaxed mb-[2.5vh]">Quick swap with your spare using professional tools — zero rim damage guaranteed.</p>
          <div className="mt-auto pt-[2vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.65vw] text-[#C21875]">×6 per year</p>
            <p className="font-body text-[1.5vw] text-white/40 mt-[0.4vh]">All plans included</p>
          </div>
        </div>

        <div className="flex flex-col p-[2.8vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <div className="w-[5vw] h-[5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2.5vh]">
            <svg className="w-[2.3vw] h-[2.3vw] text-[#C21875]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h3 className="font-display font-black text-[2.3vw] text-white mb-[2vh] leading-tight">Lockout Service</h3>
          <p className="font-body text-[1.7vw] text-white/60 leading-relaxed mb-[2.5vh]">Non-destructive entry if you lock your keys inside — no damage to your vehicle.</p>
          <div className="mt-auto pt-[2vh] border-t border-white/10">
            <p className="font-display font-bold text-[1.65vw] text-[#C21875]">All plans</p>
            <p className="font-body text-[1.5vw] text-white/40 mt-[0.4vh]">Every JAI membership</p>
          </div>
        </div>
      </div>
    </div>
  );
}
