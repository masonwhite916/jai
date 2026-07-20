import { motion } from 'framer-motion';
import { Phone } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Navbar() {
  const baseUrl = import.meta.env.BASE_URL;
  const { t, lang, toggleLang } = useLanguage();

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between bg-[#0F0826]/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="flex items-center gap-2">
        <img src={`${baseUrl}jai-logo.png`} alt="JAI" className="h-12 object-contain" />
      </div>

      <div className="flex items-center gap-3">
        <a
          href="#plans"
          className="hidden md:block text-white/80 hover:text-white transition-colors text-sm font-medium"
        >
          {t('nav_plans')}
        </a>

        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 transition-all text-sm font-semibold text-white/80 hover:text-white tracking-wide select-none"
          aria-label="Toggle language"
        >
          <span className={lang === 'en' ? 'text-white' : 'text-white/40'}>EN</span>
          <span className="text-white/20">|</span>
          <span className={lang === 'ar' ? 'text-white font-["Cairo",sans-serif]' : 'text-white/40 font-["Cairo",sans-serif]'}>ع</span>
        </button>

        <a
          href="https://wa.me/966555616449"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-[#C21875] hover:bg-[#C21875]/90 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-all shadow-[0_0_20px_rgba(194,24,117,0.3)] hover:shadow-[0_0_30px_rgba(194,24,117,0.5)]"
        >
          <Phone className="w-4 h-4" />
          <span>{t('nav_emergency')}</span>
        </a>
      </div>
    </motion.nav>
  );
}
