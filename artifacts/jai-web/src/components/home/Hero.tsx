import { motion, useScroll, useTransform } from 'framer-motion';
import { Phone, ShieldAlert } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export default function Hero() {
  const baseUrl = import.meta.env.BASE_URL;
  const { t, isRTL } = useLanguage();
  const { settings } = useSiteSettings();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '40%']);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0]);

  // Use the API-served custom hero image when one has been uploaded;
  // fall back to the bundled static hero.jpg otherwise.
  const apiRoot = baseUrl.replace(/\/jai-web\/?$/, '');
  const heroSrc = settings?.heroImageUpdatedAt
    ? `${apiRoot}/api/hero-image?v=${encodeURIComponent(settings.heroImageUpdatedAt)}`
    : `${baseUrl}hero.jpg`;

  return (
    <section ref={ref} className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden pt-20">
      <motion.div style={{ y, opacity }} className="absolute inset-0 z-0">
        <img
          src={heroSrc}
          alt="JAI Roadside Assistance"
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0F0826]/90 via-[#2D1B69]/50 to-[#0F0826] mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0826] via-[#0F0826]/40 to-transparent" />
      </motion.div>

      <div className="relative z-10 container mx-auto px-6 flex flex-col items-center text-center max-w-5xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white text-sm font-medium tracking-wide shadow-2xl"
        >
          <ShieldAlert className="w-4 h-4 text-[#C21875] flex-shrink-0" />
          <span className={isRTL ? "font-['Cairo',sans-serif]" : ''}>{t('hero_badge')}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className={`text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-[1.15] mb-6 tracking-tight drop-shadow-2xl ${isRTL ? "font-['Cairo',sans-serif]" : ''}`}
        >
          {t('hero_h1a')} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-[#C21875]">
            {t('hero_h1b')}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className={`text-lg md:text-2xl text-white/80 max-w-2xl mb-12 font-light leading-relaxed drop-shadow-md ${isRTL ? "font-['Cairo',sans-serif]" : ''}`}
        >
          {t('hero_sub')}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-5 w-full sm:w-auto"
        >
          <a
            href="https://wa.me/966555616449"
            target="_blank"
            rel="noopener noreferrer"
            className={`group flex items-center justify-center gap-3 bg-[#C21875] hover:bg-[#C21875]/90 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_rgba(194,24,117,0.4)] hover:shadow-[0_0_60px_rgba(194,24,117,0.6)] ${isRTL ? "font-['Cairo',sans-serif]" : ''}`}
          >
            <Phone className="w-5 h-5 group-hover:scale-110 transition-transform flex-shrink-0" />
            <span>{t('hero_cta1')}</span>
          </a>
          <a
            href="#plans"
            className={`flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-full font-bold text-lg transition-all border border-white/10 hover:border-white/20 ${isRTL ? "font-['Cairo',sans-serif]" : ''}`}
          >
            <span>{t('hero_cta2')}</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
