import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Pricing() {
  const { t, isRTL } = useLanguage();
  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';

  const plans = [
    {
      nameKey: 'plan_basic_name',
      arabicKey: 'plan_basic_arabic',
      price: '199',
      featureKeys: ['plan_basic_f1', 'plan_basic_f2', 'plan_basic_f3', 'plan_basic_f4', 'plan_basic_f5'],
    },
    {
      nameKey: 'plan_accidents_name',
      arabicKey: 'plan_accidents_arabic',
      price: '299',
      popular: true,
      featureKeys: ['plan_accidents_f1', 'plan_accidents_f2', 'plan_accidents_f3', 'plan_accidents_f4'],
    },
    {
      nameKey: 'plan_rental_name',
      arabicKey: 'plan_rental_arabic',
      price: '600',
      featureKeys: ['plan_rental_f1', 'plan_rental_f2', 'plan_rental_f3', 'plan_rental_f4'],
    },
  ] as const;

  return (
    <section id="plans" className="py-32 bg-[#0F0826] relative z-10 overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-px bg-gradient-to-r from-transparent via-[#C21875]/50 to-transparent" />
      <div className="absolute -top-[300px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#C21875]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight ${arabic}`}
          >
            {t('price_h2')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className={`text-white/60 text-lg md:text-xl ${arabic}`}
          >
            {t('price_sub')}
          </motion.p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center">
          {plans.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
              className={`relative rounded-[2.5rem] p-10 flex flex-col h-full ${p.popular ? 'bg-gradient-to-b from-[#2D1B69] to-[#0F0826] border-2 border-[#C21875] shadow-[0_0_50px_rgba(194,24,117,0.15)] lg:-translate-y-4 lg:scale-105 z-10' : 'bg-[#150B33] border border-white/5 hover:border-white/10 transition-colors z-0 mt-8 lg:mt-0'}`}
            >
              {p.popular && (
                <div className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#C21875] text-white px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg whitespace-nowrap ${arabic}`}>
                  {t('price_popular')}
                </div>
              )}

              <div className={`text-center mb-10 pb-8 border-b border-white/10`}>
                <h3 className={`text-3xl font-bold text-white mb-2 ${arabic}`}>{t(p.nameKey)}</h3>
                <p className={`text-xl font-semibold text-[#C21875] font-['Cairo',sans-serif] mb-6`}>{t(p.arabicKey)}</p>
                <div className="flex justify-center items-end gap-2">
                  <span className="text-6xl font-extrabold text-white tracking-tight">{p.price}</span>
                  <span className={`text-white/50 mb-2 font-medium ${arabic}`}>{t('price_currency')}</span>
                </div>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                {p.featureKeys.map((fk, j) => (
                  <div key={j} className={`flex gap-4 items-start ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                    <div className="mt-1 w-5 h-5 rounded-full bg-[#C21875]/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-[#C21875]" />
                    </div>
                    <span className={`text-white/70 font-medium leading-relaxed ${arabic}`}>{t(fk)}</span>
                  </div>
                ))}
              </div>

              <a
                href="https://wa.me/966555616449"
                target="_blank"
                rel="noopener noreferrer"
                className={`block w-full py-4 text-center rounded-full font-bold transition-all ${p.popular ? 'bg-[#C21875] hover:bg-[#C21875]/90 text-white shadow-lg' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'} ${arabic}`}
              >
                {t('price_cta')}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
