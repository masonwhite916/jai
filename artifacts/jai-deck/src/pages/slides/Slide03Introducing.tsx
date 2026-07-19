const base = import.meta.env.BASE_URL;

export default function Slide03Introducing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      {/* Left brand column */}
      <div className="relative w-[42vw] h-full bg-gradient-to-br from-[#2D1B69] via-[#1A0D40] to-[#09061A] flex flex-col justify-center px-[6vw]">
        <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-[#C21875]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[40vh] bg-gradient-to-t from-[#C21875]/10 to-transparent pointer-events-none" />
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.3em] uppercase mb-[3.5vh]">02 / Introducing</p>
        <h1 className="font-display font-black text-[10vw] text-white leading-none mb-[1.5vh] tracking-tighter">JAI</h1>
        <p className="font-display font-black text-[5vw] text-white/25 leading-none mb-[4vh]">جاي</p>
        <div className="w-[6vw] h-[0.5vh] bg-[#C21875]" />
      </div>

      {/* Right content column */}
      <div className="flex-1 flex flex-col justify-center px-[5vw] pr-[7vw]">
        <h2 className="font-display font-black text-[3vw] text-white leading-tight mb-[4vh] tracking-tight" style={{textWrap: 'balance'}}>
          Saudi Arabia's first<br/>premium roadside<br/>assistance brand.
        </h2>
        <p className="font-body text-[1.9vw] text-white/60 leading-relaxed mb-[4.5vh]">
          JAI combines a world-class mobile app, a powerful membership model, and a 24/7 professional dispatch network.
        </p>
        <div className="flex flex-col gap-[2.5vh]">
          <div className="flex items-center gap-[1.5vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#C21875] flex-shrink-0" />
            <p className="font-body text-[1.9vw] text-white/80">Currently serving Riyadh</p>
          </div>
          <div className="flex items-center gap-[1.5vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#5B2C91] flex-shrink-0" />
            <p className="font-body text-[1.9vw] text-white/80">Expanding across the Kingdom</p>
          </div>
          <div className="flex items-center gap-[1.5vw]">
            <div className="w-[0.8vw] h-[0.8vw] rounded-full bg-[#5B2C91] flex-shrink-0" />
            <p className="font-body text-[1.9vw] text-white/80">24/7 professional dispatch network</p>
          </div>
        </div>
      </div>
    </div>
  );
}
