export default function Slide16AppHighlights() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute top-0 left-0 w-[35vw] h-[35vh] bg-[#C21875]/8 rounded-full blur-[6vw] pointer-events-none" />

      <div className="mb-[4.5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">16 / App Features</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">App Highlights</h2>
      </div>

      <div className="grid grid-cols-2 gap-x-[5vw] gap-y-[2.5vh] flex-1">
        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">Onboarding in under 2 minutes</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">Streamlined first-time setup flow</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">4-step OTP authentication</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">Secure login, no passwords required</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">Guest mode for first-time requests</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">No account needed to get help</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">4-step service request wizard</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">With live technician tracking</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">In-app subscription with card payment</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">Subscribe directly from your phone</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">Push notifications &amp; request history</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">Stay informed at every step</p>
          </div>
        </div>

        <div className="flex gap-[2vw] items-start col-span-2">
          <div className="flex-shrink-0 w-[2.5vw] h-[2.5vw] rounded-full bg-[#C21875]/20 border border-[#C21875]/50 flex items-center justify-center mt-[0.3vh]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
          </div>
          <div>
            <p className="font-display font-bold text-[1.9vw] text-white leading-snug">Loyalty points system</p>
            <p className="font-body text-[1.6vw] text-white/45 leading-snug mt-[0.5vh]">+100 points awarded per subscription renewal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
