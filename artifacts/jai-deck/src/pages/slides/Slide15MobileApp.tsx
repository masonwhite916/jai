const base = import.meta.env.BASE_URL;

export default function Slide15MobileApp() {
  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#09061A] flex">
      {/* Right image */}
      <div className="absolute right-0 top-0 w-[42vw] h-full">
        <img src={`${base}mobile.jpg`} crossOrigin="anonymous" alt="JAI App" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#09061A] via-[#09061A]/40 to-transparent" />
      </div>

      {/* Left content */}
      <div className="relative w-[58vw] flex flex-col justify-center px-[8vw] z-10">
        <p className="font-body text-[1.5vw] text-[#C21875] font-semibold tracking-[0.25em] uppercase mb-[1.5vh]">15 / Product</p>
        <h2 className="font-display font-black text-[4.5vw] text-white leading-tight tracking-tight mb-[5vh]">The JAI Mobile App</h2>

        <div className="flex flex-col gap-[2.5vh]">
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Built with React Native (Expo) for iOS and Android</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Full bilingual support: English and Arabic with RTL layout</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Request any service in seconds from the app</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Track your rescue unit in real-time</p>
          </div>
          <div className="flex gap-[2vw] items-start">
            <div className="flex-shrink-0 mt-[0.4vh] w-[0.9vw] h-[0.9vw] rounded-full bg-[#C21875]" />
            <p className="font-body text-[1.9vw] text-white/75 leading-relaxed">Manage membership, view history, earn loyalty points</p>
          </div>
        </div>
      </div>
    </div>
  );
}
