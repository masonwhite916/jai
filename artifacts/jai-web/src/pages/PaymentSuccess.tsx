import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight, Phone } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useLocation } from 'wouter';
import Navbar from '@/components/layout/Navbar';

export default function PaymentSuccess() {
  const { t, isRTL } = useLanguage();
  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';
  const [, navigate] = useLocation();

  return (
    <div className={`min-h-screen bg-[#09061A] ${arabic}`}>
      <Navbar />

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#C21875]/8 rounded-full blur-[160px]" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-lg w-full text-center"
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.15 }}
            className="w-24 h-24 rounded-full bg-[#C21875]/15 border border-[#C21875]/30 flex items-center justify-center mx-auto mb-10"
          >
            <CheckCircle2 className="w-12 h-12 text-[#C21875]" />
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight ${arabic}`}
          >
            {t('pay_success_h1')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className={`text-white/55 text-lg leading-relaxed mb-3 ${arabic}`}
          >
            {t('pay_success_body')}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className={`text-white/35 text-sm leading-relaxed mb-12 ${arabic}`}
          >
            {t('pay_success_note')}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className={`flex flex-col sm:flex-row gap-4 justify-center ${isRTL ? 'sm:flex-row-reverse' : ''}`}
          >
            <button
              onClick={() => navigate('/')}
              className={`inline-flex items-center justify-center gap-2 bg-[#C21875] hover:bg-[#C21875]/90 text-white px-8 py-3.5 rounded-full font-bold transition-all shadow-[0_0_30px_rgba(194,24,117,0.25)] hover:shadow-[0_0_40px_rgba(194,24,117,0.4)] ${arabic} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              {t('pay_success_home')}
              <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            </button>

            <a
              href="https://wa.me/966555616449"
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-3.5 rounded-full font-medium transition-all ${arabic} ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <Phone className="w-4 h-4" />
              {t('pay_success_contact')}
            </a>
          </motion.div>

          {/* Fine print */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className={`text-white/20 text-xs mt-12 ${arabic}`}
          >
            {t('footer_note1')}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
