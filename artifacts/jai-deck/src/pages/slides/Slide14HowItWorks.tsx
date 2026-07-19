const base = import.meta.env.BASE_URL;

export default function Slide14HowItWorks() {
  return (
    <div className="relative w-screen h-screen overflow-hidden flex">
      <img src={`${base}process.jpg`} crossOrigin="anonymous" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09061A] via-[#09061A]/85 to-[#09061A]/60" />
      <div className="absolute inset-0 bg-[#09061A]/40" />

      <div className="relative w-full h-full flex flex-col px-[8vw] py-[7vh]">
        <div className="mb-[6vh]">
          <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">14 / Process</p>
          <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">How It Works</h2>
        </div>

        <div className="flex gap-0 flex-1 items-center">
          {/* Step 1 */}
          <div className="flex-1 flex flex-col items-center text-center relative">
            <div className="w-[8vw] h-[8vw] rounded-full bg-[#C21875] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(194,24,117,0.5)] z-10">
              <span className="font-display font-black text-[3.5vw] text-white">1</span>
            </div>
            <h3 className="font-display font-black text-[2.2vw] text-white mb-[1.5vh]">Subscribe</h3>
            <p className="font-body text-[1.65vw] text-white/60 leading-relaxed max-w-[17vw]">Choose a plan and activate in under 48 hours.</p>
            <div className="absolute top-[4vw] left-[calc(50%+4vw)] w-[calc(100%-4vw)] h-[1px] bg-gradient-to-r from-[#C21875]/60 to-transparent" />
          </div>

          {/* Step 2 */}
          <div className="flex-1 flex flex-col items-center text-center relative">
            <div className="w-[8vw] h-[8vw] rounded-full bg-[#2D1B69] border-2 border-[#C21875]/60 flex items-center justify-center mb-[3vh] z-10">
              <span className="font-display font-black text-[3.5vw] text-white">2</span>
            </div>
            <h3 className="font-display font-black text-[2.2vw] text-white mb-[1.5vh]">Request</h3>
            <p className="font-body text-[1.65vw] text-white/60 leading-relaxed max-w-[17vw]">Call, WhatsApp, or tap the app whenever you need help.</p>
            <div className="absolute top-[4vw] left-[calc(50%+4vw)] w-[calc(100%-4vw)] h-[1px] bg-gradient-to-r from-[#C21875]/60 to-transparent" />
          </div>

          {/* Step 3 */}
          <div className="flex-1 flex flex-col items-center text-center relative">
            <div className="w-[8vw] h-[8vw] rounded-full bg-[#2D1B69] border-2 border-[#C21875]/60 flex items-center justify-center mb-[3vh] z-10">
              <span className="font-display font-black text-[3.5vw] text-white">3</span>
            </div>
            <h3 className="font-display font-black text-[2.2vw] text-white mb-[1.5vh]">Dispatch</h3>
            <p className="font-body text-[1.65vw] text-white/60 leading-relaxed max-w-[17vw]">Nearest qualified unit is routed to your location instantly.</p>
            <div className="absolute top-[4vw] left-[calc(50%+4vw)] w-[calc(100%-4vw)] h-[1px] bg-gradient-to-r from-[#C21875]/60 to-transparent" />
          </div>

          {/* Step 4 */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div className="w-[8vw] h-[8vw] rounded-full bg-[#C21875] flex items-center justify-center mb-[3vh] shadow-[0_0_3vw_rgba(194,24,117,0.5)]">
              <span className="font-display font-black text-[3.5vw] text-white">4</span>
            </div>
            <h3 className="font-display font-black text-[2.2vw] text-white mb-[1.5vh]">Resolved</h3>
            <p className="font-body text-[1.65vw] text-white/60 leading-relaxed max-w-[17vw]">Technician arrives, service is completed, you drive away.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
