export default function Slide04Mission() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#2D1B69]/20 via-transparent to-[#C21875]/10 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[35vw] h-[35vh] bg-[#C21875]/8 rounded-full blur-[6vw] pointer-events-none" />

      {/* Header */}
      <div className="mb-[4vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">03 / Purpose</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Our Mission</h2>
      </div>

      {/* Quote */}
      <div className="mb-[5vh] border-l-[0.4vw] border-[#C21875] pl-[3vw]">
        <p className="font-display font-semibold text-[2.5vw] text-white/90 leading-relaxed italic" style={{textWrap: 'balance'}}>
          "We don't just rescue vehicles.<br/>We rescue people's peace of mind."
        </p>
      </div>

      {/* 4 pillars */}
      <div className="grid grid-cols-4 gap-[2vw] flex-1">
        <div className="flex flex-col p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-[#C21875]" />
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1.2vh] leading-snug">Rapid Response</p>
          <p className="font-body text-[1.55vw] text-white/50 leading-relaxed">Predictable, fast arrival every time.</p>
        </div>

        <div className="flex flex-col p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-[#C21875]" />
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1.2vh] leading-snug">Transparent Pricing</p>
          <p className="font-body text-[1.55vw] text-white/50 leading-relaxed">VAT-inclusive — no hidden fees.</p>
        </div>

        <div className="flex flex-col p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-[#C21875]" />
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1.2vh] leading-snug">Certified Technicians</p>
          <p className="font-body text-[1.55vw] text-white/50 leading-relaxed">Trained, vetted professionals only.</p>
        </div>

        <div className="flex flex-col p-[2.5vw] bg-[#12092E] rounded-[1.5vw] border border-white/5">
          <div className="w-[3.5vw] h-[3.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/40 flex items-center justify-center mb-[2vh]">
            <div className="w-[1.2vw] h-[1.2vw] rounded-full bg-[#C21875]" />
          </div>
          <p className="font-display font-bold text-[1.8vw] text-white mb-[1.2vh] leading-snug">24/7 Availability</p>
          <p className="font-body text-[1.55vw] text-white/50 leading-relaxed">Every hour, every day of the year.</p>
        </div>
      </div>
    </div>
  );
}
