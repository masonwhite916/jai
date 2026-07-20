import { Phone, Instagram, Twitter, Facebook } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export default function Footer() {
  const baseUrl = import.meta.env.BASE_URL;
  const { t, isRTL } = useLanguage();
  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';

  return (
    <footer className="bg-[#05020D] pt-20 pb-10 border-t border-white/5 relative z-10">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          <div className={`lg:col-span-2 ${isRTL ? 'text-right' : ''}`}>
            <img
              src={`${baseUrl}jai-logo.png`}
              alt="JAI"
              className={`h-10 object-contain mb-6 opacity-90 ${isRTL ? 'mr-0 ml-auto md:ml-0' : ''}`}
            />
            <p className={`text-white/60 max-w-sm mb-6 leading-relaxed ${arabic} ${isRTL ? 'mr-0 ml-auto md:ml-0' : ''}`}>
              {t('footer_desc')}
            </p>
            <div className={`flex items-center gap-4 text-white/80 mb-8 ${isRTL ? 'justify-end md:justify-start' : ''}`}>
              <a
                href="https://instagram.com/jai.saudi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C21875] hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/jai_saudi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X / Twitter"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C21875] hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://facebook.com/jai.saudi"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#C21875] hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
            <div className={`flex items-center gap-4 text-white/80 ${isRTL ? 'justify-end md:justify-start' : ''}`}>
              <a
                href="https://wa.me/966555616449"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-[#C21875] transition-colors"
              >
                <Phone className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-lg" dir="ltr">+966 55 561 6449</span>
              </a>
            </div>
          </div>

          <div className={isRTL ? 'text-right' : ''}>
            <h4 className={`text-white font-semibold mb-6 ${arabic}`}>{t('footer_services')}</h4>
            <ul className={`space-y-4 text-white/50 text-sm ${arabic}`}>
              <li>{t('footer_s1')}</li>
              <li>{t('footer_s2')}</li>
              <li>{t('footer_s3')}</li>
              <li>{t('footer_s4')}</li>
              <li>{t('footer_s5')}</li>
            </ul>
          </div>

          <div className={isRTL ? 'text-right' : ''}>
            <h4 className={`text-white font-semibold mb-6 ${arabic}`}>{t('footer_company')}</h4>
            <ul className={`space-y-4 text-white/50 text-sm ${arabic}`}>
              <li>{t('footer_c1')}</li>
              <li>{t('footer_c2')}</li>
              <li>{t('footer_c3')}</li>
              <li>{t('footer_c4')}</li>
            </ul>
          </div>
        </div>

        <div className={`pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-white/40 ${isRTL ? 'md:flex-row-reverse text-right' : ''}`}>
          <div className={`space-y-1 ${isRTL ? 'text-center md:text-right' : 'text-center md:text-left'}`}>
            <p className={arabic}>{t('footer_note1')}</p>
            <p className={arabic}>{t('footer_note2')}</p>
          </div>
          <div className={`font-medium ${arabic}`}>
            © {new Date().getFullYear()} {t('footer_copy')}
          </div>
        </div>
      </div>
    </footer>
  );
}
