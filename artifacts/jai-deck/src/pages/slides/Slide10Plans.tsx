export default function Slide10Plans() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[7vw] py-[7vh]">
      <div className="absolute top-[20vh] left-1/2 -translate-x-1/2 w-[60vw] h-[40vh] bg-[#C21875]/8 rounded-full blur-[8vw] pointer-events-none" />

      <div className="mb-[5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">10 / Membership</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Membership Plans</h2>
        <p className="font-body text-[1.8vw] text-white/45 mt-[1.5vh]">Three annual plans — VAT included, no hidden fees, one vehicle each.</p>
      </div>

      <div className="grid grid-cols-3 gap-[2.5vw] flex-1">
        {/* Basic */}
        <div className="flex flex-col p-[3vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <p className="font-body text-[1.5vw] text-white/40 tracking-widest uppercase mb-[2vh]">Basic</p>
          <p className="font-display font-black text-[4.5vw] text-white leading-none mb-[0.5vh]">199</p>
          <p className="font-body text-[1.7vw] text-white/40 mb-[3vh]">SAR / year</p>
          <div className="w-full h-[1px] bg-white/10 mb-[3vh]" />
          <div className="flex flex-col gap-[1.8vh] flex-1">
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">Battery ×6 · Fuel ×6 · Tire ×6</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">Light mechanical ×2</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">Emergency towing ×2</p>
            </div>
          </div>
          <div className="mt-auto pt-[2.5vh]">
            <p className="font-body text-[1.55vw] text-white/30">الباقة الأساسية</p>
          </div>
        </div>

        {/* Accidents — highlighted */}
        <div className="flex flex-col p-[3vw] bg-gradient-to-b from-[#2D1B69] to-[#12092E] rounded-[2vw] border-2 border-[#C21875] relative">
          <div className="absolute -top-[2.2vh] left-1/2 -translate-x-1/2 bg-[#C21875] text-white text-[1.3vw] font-display font-bold px-[2vw] py-[0.6vh] rounded-full tracking-widest uppercase whitespace-nowrap">
            Most Popular
          </div>
          <p className="font-body text-[1.5vw] text-[#C21875] tracking-widest uppercase mb-[2vh]">Accidents</p>
          <p className="font-display font-black text-[4.5vw] text-white leading-none mb-[0.5vh]">299</p>
          <p className="font-body text-[1.7vw] text-white/40 mb-[3vh]">SAR / year</p>
          <div className="w-full h-[1px] bg-white/10 mb-[3vh]" />
          <div className="flex flex-col gap-[1.8vh] flex-1">
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/80">All Basic plan benefits</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/80">Accident vehicle transfer</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#C21875] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/80">Priority dispatch unit</p>
            </div>
          </div>
          <div className="mt-auto pt-[2.5vh]">
            <p className="font-body text-[1.55vw] text-white/40">باقة الحوادث</p>
          </div>
        </div>

        {/* Rental */}
        <div className="flex flex-col p-[3vw] bg-[#12092E] rounded-[2vw] border border-white/5">
          <p className="font-body text-[1.5vw] text-white/40 tracking-widest uppercase mb-[2vh]">Rental</p>
          <p className="font-display font-black text-[4.5vw] text-white leading-none mb-[0.5vh]">600</p>
          <p className="font-body text-[1.7vw] text-white/40 mb-[3vh]">SAR / year</p>
          <div className="w-full h-[1px] bg-white/10 mb-[3vh]" />
          <div className="flex flex-col gap-[1.8vh] flex-1">
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#5B2C91] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">All Accidents plan benefits</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#5B2C91] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">Fault diagnostics ×3</p>
            </div>
            <div className="flex items-center gap-[1.2vw]">
              <div className="w-[0.7vw] h-[0.7vw] rounded-full bg-[#5B2C91] flex-shrink-0" />
              <p className="font-body text-[1.65vw] text-white/65">Extended support range</p>
            </div>
          </div>
          <div className="mt-auto pt-[2.5vh]">
            <p className="font-body text-[1.55vw] text-white/30">باقة الأجرة</p>
          </div>
        </div>
      </div>
    </div>
  );
}
