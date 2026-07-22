'use client';

import { motion } from 'framer-motion';
import { Clock, MapPin, Shield } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Trust() {
  const { t, isRTL } = useLanguage();

  const features = [
    { icon: Clock, titleKey: 'trust_f1_title', descKey: 'trust_f1_desc' },
    { icon: MapPin,  titleKey: 'trust_f2_title', descKey: 'trust_f2_desc' },
    { icon: Shield,  titleKey: 'trust_f3_title', descKey: 'trust_f3_desc' },
  ] as const;

  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';

  return (
    <section className="py-32 bg-[#0F0826] relative overflow-hidden z-10">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div
            initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-[2.5rem] overflow-hidden aspect-[4/5] border border-white/10 shadow-2xl group"
          >
            <img
              src="/jai-web/mechanic.jpg"
              alt="JAI Mechanic"
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0826] via-[#0F0826]/40 to-transparent opacity-80" />
            <div className={`absolute bottom-10 left-10 right-10 ${isRTL ? 'text-right' : ''}`}>
              <div className={`w-16 h-1 bg-[#C21875] mb-6 rounded-full ${isRTL ? 'mr-0 ml-auto' : ''}`} />
              <p className={`text-2xl font-light text-white italic leading-relaxed ${arabic}`}>
                "{t('trust_quote')}"
              </p>
            </div>
          </motion.div>

          <div className="flex flex-col gap-12">
            <div>
              <motion.h2
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight ${arabic}`}
              >
                {t('trust_h2a')} <br /> {t('trust_h2b')}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`text-white/60 text-lg md:text-xl leading-relaxed ${arabic}`}
              >
                {t('trust_body')}
              </motion.p>
            </div>

            <div className="grid gap-8">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="flex gap-5 items-start group"
                >
                  <div className="w-14 h-14 rounded-full bg-[#5B2C91]/20 flex items-center justify-center flex-shrink-0 border border-[#5B2C91]/30 group-hover:bg-[#C21875] group-hover:border-[#C21875] transition-all duration-300">
                    <f.icon className="w-6 h-6 text-[#C21875] group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h3 className={`text-xl font-semibold text-white mb-2 ${arabic}`}>{t(f.titleKey)}</h3>
                    <p className={`text-white/50 leading-relaxed ${arabic}`}>{t(f.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
