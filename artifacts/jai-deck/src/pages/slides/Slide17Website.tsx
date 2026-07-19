export default function Slide17Website() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex flex-col px-[8vw] py-[7vh]">
      <div className="absolute top-0 right-0 w-[30vw] h-[30vh] bg-[#2D1B69]/20 rounded-full blur-[5vw] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[25vw] h-[25vh] bg-[#C21875]/10 rounded-full blur-[5vw] pointer-events-none" />

      <div className="mb-[4.5vh]">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">17 / Digital Presence</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-none tracking-tight">Marketing Website</h2>
      </div>

      <div className="grid grid-cols-2 gap-[4vw] flex-1">
        {/* Left — bullets */}
        <div className="flex flex-col gap-[2.8vh] justify-center">
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Built with React + Vite — fast, modern, SEO-ready</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Matches the app's brand identity exactly</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Hero, Services, Plans, About, App Download sections</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">WhatsApp CTA on every key section</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Parallax scroll animations throughout</p>
          </div>
        </div>

        {/* Right — website wireframe mockup */}
        <div className="flex flex-col justify-center">
          <div className="w-full aspect-video bg-[#12092E] rounded-[1.5vw] border border-white/10 overflow-hidden relative shadow-2xl">
            {/* Browser chrome */}
            <div className="h-[8%] bg-[#1A0D40] border-b border-white/10 flex items-center px-[3%] gap-[1.5%]">
              <div className="w-[2.5%] aspect-square rounded-full bg-[#C21875]/60" />
              <div className="w-[2.5%] aspect-square rounded-full bg-white/20" />
              <div className="w-[2.5%] aspect-square rounded-full bg-white/20" />
              <div className="flex-1 mx-[4%] h-[40%] bg-white/10 rounded-full" />
            </div>
            {/* Hero area */}
            <div className="h-[40%] bg-gradient-to-br from-[#2D1B69] to-[#09061A] relative flex items-center px-[6%]">
              <div className="flex flex-col gap-[4%]">
                <div className="w-[40%] h-[12%] bg-white/10 rounded-sm" />
                <div className="w-[60%] h-[25%] bg-white/20 rounded-sm" />
                <div className="w-[50%] h-[10%] bg-white/10 rounded-sm" />
              </div>
              <div className="absolute right-[4%] top-1/2 -translate-y-1/2 w-[10%] h-[30%] bg-[#C21875]/40 rounded-md" />
            </div>
            {/* Content area */}
            <div className="flex-1 px-[6%] py-[4%] flex flex-col gap-[4%]">
              <div className="flex gap-[3%]">
                <div className="flex-1 h-[6vh] bg-white/5 rounded-md" />
                <div className="flex-1 h-[6vh] bg-white/5 rounded-md" />
                <div className="flex-1 h-[6vh] bg-white/5 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
