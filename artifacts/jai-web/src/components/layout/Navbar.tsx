import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';

export default function Navbar() {
  const baseUrl = import.meta.env.BASE_URL;
  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-[#0F0826]/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="flex items-center gap-2">
        <img src={`${baseUrl}jai-logo.png`} alt="JAI" className="h-8 object-contain" />
      </div>
      <div className="flex items-center gap-4">
        <a href="#plans" className="hidden md:block text-white/80 hover:text-white transition-colors text-sm font-medium">
          Membership Plans
        </a>
        <a href="https://wa.me/966555616449" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#C21875] hover:bg-[#C21875]/90 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_20px_rgba(194,24,117,0.3)] hover:shadow-[0_0_30px_rgba(194,24,117,0.5)]">
          <Phone className="w-4 h-4" />
          <span>Emergency Help</span>
        </a>
      </div>
    </motion.nav>
  );
}