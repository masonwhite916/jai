const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <img src={`${base}hero.jpg`} crossOrigin="anonymous" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09061A] via-[#09061A]/75 to-[#09061A]/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#09061A]/70 via-transparent to-transparent" />

      {/* Top bar */}
      <div className="absolute top-[4.5vh] left-[6vw] right-[6vw] flex items-center justify-between">
        <img src={`${base}jai-logo.png`} crossOrigin="anonymous" alt="JAI" className="h-[6.5vh] object-contain" />
        <span className="font-body text-[1.5vw] text-white/40 tracking-[0.35em] uppercase">Client Presentation</span>
      </div>

      {/* Main copy */}
      <div className="absolute bottom-[16vh] left-[6vw] max-w-[55vw]">
        <div className="w-[7vw] h-[0.45vh] bg-[#C21875] mb-[3.5vh]" />
        <h1 className="font-display font-black text-[6.5vw] text-white leading-none tracking-tight mb-[2.5vh]" style={{textWrap: 'balance'}}>
          Roadside<br/>Assistance.
        </h1>
        <p className="font-body font-light text-[2.1vw] text-white/65 leading-relaxed max-w-[42vw]">
          The premium roadside assistance platform built for Saudi Arabia.
        </p>
      </div>

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[9vh] border-t border-[#C21875]/20 bg-[#09061A]/60 backdrop-blur-sm flex items-center px-[6vw] gap-[3vw]">
        <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875]" />
        <span className="font-body text-[1.5vw] text-white/35 tracking-[0.25em] uppercase">JAI · جاي · Riyadh, Saudi Arabia</span>
      </div>
    </div>
  );
}
