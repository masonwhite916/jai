import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Lang = 'en' | 'ar';

const translations = {
  en: {
    // Navbar
    nav_plans: 'Membership Plans',
    nav_emergency: 'Emergency Help',

    // Hero
    hero_badge: 'Available 24/7 Across Saudi Arabia',
    hero_h1a: 'Help is already',
    hero_h1b: 'on its way.',
    hero_sub: "The premium roadside assistance brand you trust when you're stranded. Rapid response, professional care, and complete peace of mind.",
    hero_cta1: 'Request Rescue',
    hero_cta2: 'View Memberships',

    // Trust
    trust_quote: "We don't just rescue vehicles. We rescue people's peace of mind.",
    trust_h2a: "Because panic isn't",
    trust_h2b: "on your itinerary.",
    trust_body: "When your car dies at 2 AM on a desert highway, you don't want excuses. You want highly-trained professionals, rapid response, and the certainty that everything will be fine. That's JAI.",
    trust_f1_title: 'Rapid Dispatch',
    trust_f1_desc: "Our nearest unit is routed instantly. We don't make you wait in the dark.",
    trust_f2_title: 'Riyadh Coverage',
    trust_f2_desc: 'Currently serving Riyadh and its surrounding areas, with more cities coming soon.',
    trust_f3_title: 'Premium Care',
    trust_f3_desc: 'Highly-trained professionals handling your vehicle with the utmost respect.',

    // Services
    svc_h2: 'Prepared for anything.',
    svc_sub: 'A full suite of premium emergency services, equipped to handle whatever the road throws at you.',
    svc_battery_title: 'Battery Charge',
    svc_battery_desc: 'Instant jump-starts to get you back on the road.',
    svc_tow_title: 'Emergency Towing',
    svc_tow_desc: 'Safe, premium towing to your preferred location.',
    svc_fuel_title: 'Fuel Supply',
    svc_fuel_desc: 'Emergency fuel delivery when you run dry.',
    svc_tire_title: 'Tire Change',
    svc_tire_desc: 'Quick flat tire replacement with your spare.',
    svc_lock_title: 'Lockout Service',
    svc_lock_desc: 'Non-destructive entry if you lock your keys inside.',
    svc_mech_title: 'Light Mechanical',
    svc_mech_desc: 'On-the-spot minor repairs by certified mechanics.',
    svc_diag_title: 'Computer Diagnostics',
    svc_diag_desc: 'Advanced fault reading to identify underlying issues.',

    // Pricing
    price_h2: 'Choose your peace of mind.',
    price_sub: 'Annual memberships covering you 24/7 across the Kingdom. Prices include VAT.',
    price_popular: 'Most Popular',
    price_currency: 'SAR / yr',
    price_cta: 'Purchase Plan',
    plan_basic_name: 'Basic',
    plan_basic_arabic: 'الباقة الأساسية',
    plan_accidents_name: 'Accidents',
    plan_accidents_arabic: 'باقة الحوادث',
    plan_rental_name: 'Rental',
    plan_rental_arabic: 'باقة الأجرة',
    plan_basic_f1: 'Battery charge (×6)',
    plan_basic_f2: 'Fuel supply (×6)',
    plan_basic_f3: 'Tire change (×6)',
    plan_basic_f4: 'Light mechanical repair (×2)',
    plan_basic_f5: 'Emergency towing (×2)',
    plan_accidents_f1: 'All Basic Plan features',
    plan_accidents_f2: 'Accident vehicle transfer to assessment center',
    plan_accidents_f3: 'Transfer to workshop of choice',
    plan_accidents_f4: 'Priority dispatch unit',
    plan_rental_f1: 'All Accidents Plan features',
    plan_rental_f2: 'Computer fault diagnostics (×3)',
    plan_rental_f3: 'Premium vehicle fleet access',
    plan_rental_f4: 'Extended range support',

    // AppDownload
    app_h2: 'Assistance in your pocket.',
    app_sub: 'Track your rescue unit in real-time, manage your membership, and request help with a single tap. Coming soon to all devices.',
    app_ios_label: 'Download on the',
    app_ios_name: 'App Store',
    app_android_label: 'Get it on',
    app_android_name: 'Google Play',
    app_soon: 'Launching soon',

    // Footer
    footer_desc: "The kingdom's premier roadside assistance network. We turn emergencies into minor inconveniences. Fast, safe, and professional.",
    footer_services: 'Services',
    footer_s1: 'Battery Assistance',
    footer_s2: 'Emergency Towing',
    footer_s3: 'Fuel Delivery',
    footer_s4: 'Lockout Service',
    footer_s5: 'Tire Change',
    footer_company: 'Company',
    footer_c1: 'About Us',
    footer_c2: 'Membership Plans',
    footer_c3: 'Contact',
    footer_c4: 'Terms & Conditions',
    footer_note1: 'Membership activates within 48 hours of purchase. Valid 1 year from activation.',
    footer_note2: 'Valid for one vehicle only.',
    footer_copy: 'JAI Roadside Assistance | jai.com.sa',
  },
  ar: {
    // Navbar
    nav_plans: 'باقات العضوية',
    nav_emergency: 'طلب مساعدة',

    // Hero
    hero_badge: 'متاح 24/7 عبر المملكة العربية السعودية',
    hero_h1a: 'المساعدة',
    hero_h1b: 'في طريقها إليك.',
    hero_sub: 'الخدمة الاحترافية للطوارئ على الطريق التي تثق بها عند التعطل. استجابة سريعة، رعاية متميزة، وراحة بال تامة.',
    hero_cta1: 'اطلب مساعدة',
    hero_cta2: 'عرض الباقات',

    // Trust
    trust_quote: 'نحن لا ننقذ السيارات فقط. نحن ننقذ راحة البال.',
    trust_h2a: 'لأن الذعر',
    trust_h2b: 'ليس في خططك.',
    trust_body: 'حين تتعطل سيارتك في الساعة الثانية صباحاً على طريق صحراوي، لا تريد أعذاراً. تريد محترفين مدربين، استجابة فورية، ويقيناً بأن كل شيء سيكون على ما يرام. هذا هو جاي.',
    trust_f1_title: 'استجابة فورية',
    trust_f1_desc: 'يصلك أقرب فريق لنا فوراً. لن ندعك تنتظر في الظلام.',
    trust_f2_title: 'تغطية الرياض',
    trust_f2_desc: 'نخدم حالياً الرياض ومحيطها، مع التوسع لمزيد من المدن قريباً.',
    trust_f3_title: 'رعاية متميزة',
    trust_f3_desc: 'متخصصون مدربون يتعاملون مع سيارتك باحترافية وأمان تامين.',

    // Services
    svc_h2: 'مستعدون لكل شيء.',
    svc_sub: 'مجموعة كاملة من خدمات الطوارئ الاحترافية، جاهزة للتعامل مع أي موقف على الطريق.',
    svc_battery_title: 'شحن البطارية',
    svc_battery_desc: 'إعادة تشغيل فورية لتعود إلى الطريق بسرعة.',
    svc_tow_title: 'سطحة الطوارئ',
    svc_tow_desc: 'نقل آمن واحترافي إلى الوجهة التي تختارها.',
    svc_fuel_title: 'توصيل الوقود',
    svc_fuel_desc: 'توصيل طارئ للوقود عند نفاده في الطريق.',
    svc_tire_title: 'تغيير الإطار',
    svc_tire_desc: 'تغيير سريع للإطار المثقوب بإطارك الاحتياطي.',
    svc_lock_title: 'فتح السيارة',
    svc_lock_desc: 'دخول آمن دون تلف إذا نسيت مفاتيحك بالداخل.',
    svc_mech_title: 'إصلاح ميكانيكي خفيف',
    svc_mech_desc: 'إصلاحات بسيطة في الموقع على يد ميكانيكيين معتمدين.',
    svc_diag_title: 'تشخيص الكمبيوتر',
    svc_diag_desc: 'قراءة أعطال متقدمة للكشف عن المشكلات الخفية.',

    // Pricing
    price_h2: 'اختر راحة بالك.',
    price_sub: 'عضويات سنوية تحميك على مدار الساعة في كل أنحاء المملكة. الأسعار شاملة ضريبة القيمة المضافة.',
    price_popular: 'الأكثر طلباً',
    price_currency: 'ريال / سنة',
    price_cta: 'اشترك الآن',
    plan_basic_name: 'الأساسية',
    plan_basic_arabic: 'الباقة الأساسية',
    plan_accidents_name: 'الحوادث',
    plan_accidents_arabic: 'باقة الحوادث',
    plan_rental_name: 'الإيجار',
    plan_rental_arabic: 'باقة الأجرة',
    plan_basic_f1: 'شحن البطارية (×6)',
    plan_basic_f2: 'توصيل الوقود (×6)',
    plan_basic_f3: 'تغيير الإطار (×6)',
    plan_basic_f4: 'إصلاح ميكانيكي خفيف (×2)',
    plan_basic_f5: 'سطحة طوارئ (×2)',
    plan_accidents_f1: 'جميع مزايا الباقة الأساسية',
    plan_accidents_f2: 'نقل السيارة إلى مركز تقدير الأضرار',
    plan_accidents_f3: 'نقل إلى ورشة العميل المختارة',
    plan_accidents_f4: 'أولوية في الإرسال',
    plan_rental_f1: 'جميع مزايا باقة الحوادث',
    plan_rental_f2: 'تشخيص أعطال الكمبيوتر (×3)',
    plan_rental_f3: 'الوصول إلى أسطول المركبات المميزة',
    plan_rental_f4: 'دعم موسّع للمدى الجغرافي',

    // AppDownload
    app_h2: 'المساعدة في جيبك.',
    app_sub: 'تتبّع وحدة الإنقاذ في الوقت الفعلي، وأدر عضويتك، واطلب المساعدة بنقرة واحدة. قريباً على جميع الأجهزة.',
    app_ios_label: 'حمّل من',
    app_ios_name: 'App Store',
    app_android_label: 'احصل عليه من',
    app_android_name: 'Google Play',
    app_soon: 'قريباً',

    // Footer
    footer_desc: 'الشبكة الرائدة في خدمات المساعدة على الطريق بالمملكة. نحوّل الطوارئ إلى مجرد إزعاج بسيط. بسرعة وأمان واحترافية.',
    footer_services: 'الخدمات',
    footer_s1: 'مساعدة البطارية',
    footer_s2: 'سطحة الطوارئ',
    footer_s3: 'توصيل الوقود',
    footer_s4: 'فتح السيارة',
    footer_s5: 'تغيير الإطار',
    footer_company: 'الشركة',
    footer_c1: 'من نحن',
    footer_c2: 'باقات العضوية',
    footer_c3: 'تواصل معنا',
    footer_c4: 'الشروط والأحكام',
    footer_note1: 'تُفعَّل العضوية خلال 48 ساعة من الشراء. صالحة لمدة سنة من تاريخ التفعيل.',
    footer_note2: 'صالحة لمركبة واحدة فقط.',
    footer_copy: 'جاي للمساعدة على الطريق | jai.com.sa',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  t: (key: TranslationKey) => string;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('jai-lang') as Lang) ?? 'en';
  });

  const isRTL = lang === 'ar';

  useEffect(() => {
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.body.style.fontFamily = isRTL
      ? "'Cairo', 'Inter', sans-serif"
      : "'Inter', sans-serif";
    localStorage.setItem('jai-lang', lang);
  }, [lang, isRTL]);

  const t = (key: TranslationKey): string => translations[lang][key];
  const toggleLang = () => setLang(l => l === 'en' ? 'ar' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, isRTL, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
