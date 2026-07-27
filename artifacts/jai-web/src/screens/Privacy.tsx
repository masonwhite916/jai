'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const sections = [
  {
    en: {
      title: '1. Who We Are',
      body: 'JAI Roadside Assistance ("JAI", "we", "our") is a roadside assistance service operating in the Kingdom of Saudi Arabia. This Privacy Policy explains how we collect, use, share, and protect your personal data when you use our mobile application or website.',
    },
    ar: {
      title: '١. من نحن',
      body: 'جاي للمساعدة على الطريق ("جاي"، "نحن"، "لنا") هي خدمة مساعدة على الطريق تعمل في المملكة العربية السعودية. توضّح سياسة الخصوصية هذه كيفية جمع بياناتك الشخصية واستخدامها ومشاركتها وحمايتها عند استخدامك لتطبيقنا أو موقعنا الإلكتروني.',
    },
  },
  {
    en: {
      title: '2. Data We Collect',
      body: 'We collect the following categories of personal data: (a) Identity & Contact — your name, mobile phone number, and email address provided during registration; (b) Vehicle — make, model, year, colour, and licence plate of your registered vehicle(s); (c) Location — GPS coordinates at the time of a service request, updated in real time until the technician arrives; (d) Payment — transaction reference numbers and plan details processed via Moyasar. We do not store full card numbers; (e) Usage — in-app actions, service history, and ratings you submit.',
    },
    ar: {
      title: '٢. البيانات التي نجمعها',
      body: 'نجمع الفئات التالية من البيانات الشخصية: (أ) الهوية والتواصل — اسمك ورقم هاتفك المحمول وبريدك الإلكتروني المُقدَّمة عند التسجيل؛ (ب) المركبة — الشركة الصانعة والطراز والسنة واللون ورقم اللوحة لمركباتك المسجّلة؛ (ج) الموقع — إحداثيات GPS وقت طلب الخدمة، تُحدَّث في الوقت الفعلي حتى وصول الفني؛ (د) الدفع — أرقام مرجع المعاملات وتفاصيل الخطة المعالجة عبر موياسر. لا نحتفظ بأرقام البطاقات الكاملة؛ (هـ) الاستخدام — إجراءات داخل التطبيق وسجل الخدمة والتقييمات التي تُرسلها.',
    },
  },
  {
    en: {
      title: '3. How We Use Your Data',
      body: 'Your data is used exclusively to: (a) dispatch the nearest available technician to your location; (b) communicate service status updates via SMS or push notifications; (c) process membership payments and issue transaction records; (d) calculate and display your rewards points and membership tier; (e) improve service quality through aggregated, anonymised analytics.',
    },
    ar: {
      title: '٣. كيف نستخدم بياناتك',
      body: 'تُستخدم بياناتك حصراً من أجل: (أ) إرسال أقرب فني متاح إلى موقعك؛ (ب) إرسال تحديثات حالة الخدمة عبر رسائل SMS أو الإشعارات؛ (ج) معالجة مدفوعات العضوية وإصدار سجلات المعاملات؛ (د) حساب نقاط المكافآت ومستوى العضوية وعرضها؛ (هـ) تحسين جودة الخدمة من خلال تحليلات مجمّعة ومجهولة الهوية.',
    },
  },
  {
    en: {
      title: '4. Third-Party Services',
      body: 'To deliver our service we share limited data with the following trusted processors: Moyasar (payment processing — name, email, card token); Taqnyat (OTP SMS delivery — phone number only); Twilio (fallback SMS — phone number only); Google Maps / Nominatim (map display and address lookup — coordinates only, no account linkage). Each processor is contractually bound to use your data only for the specified purpose.',
    },
    ar: {
      title: '٤. خدمات الأطراف الثالثة',
      body: 'لتقديم خدمتنا، نشارك بيانات محدودة مع معالجي البيانات الموثوقين التاليين: موياسر (معالجة المدفوعات — الاسم والبريد الإلكتروني ورمز البطاقة)؛ تقنيات (توصيل رسائل OTP — رقم الهاتف فقط)؛ Twilio (رسائل SMS الاحتياطية — رقم الهاتف فقط)؛ خرائط Google / Nominatim (عرض الخرائط والبحث عن العناوين — الإحداثيات فقط، بدون ربط بالحساب). كل معالج مُلزَم تعاقدياً باستخدام بياناتك للغرض المحدد فقط.',
    },
  },
  {
    en: {
      title: '5. Data Retention',
      body: 'We retain your personal data for as long as your account is active and for up to 12 months after deletion, to comply with applicable legal obligations and resolve disputes. Location data collected during a service call is purged within 30 days of the service completion. Payment transaction references are retained for 5 years as required by Saudi financial regulations.',
    },
    ar: {
      title: '٥. مدة الاحتفاظ بالبيانات',
      body: 'نحتفظ ببياناتك الشخصية طوال مدة نشاط حسابك ولمدة تصل إلى ١٢ شهراً بعد الحذف، امتثالاً للالتزامات القانونية المعمول بها وتسوية النزاعات. تُحذف بيانات الموقع المجمَّعة خلال مكالمة الخدمة في غضون ٣٠ يوماً من إتمام الخدمة. تُحتفظ بمراجع معاملات الدفع لمدة ٥ سنوات وفقاً للأنظمة المالية السعودية.',
    },
  },
  {
    en: {
      title: '6. Your Rights',
      body: 'You have the right to: (a) access a copy of the personal data we hold about you; (b) request correction of inaccurate data; (c) request deletion of your account and all associated personal data; (d) withdraw consent for marketing communications at any time. To exercise any of these rights, contact us via the details in Section 8.',
    },
    ar: {
      title: '٦. حقوقك',
      body: 'يحق لك: (أ) الحصول على نسخة من البيانات الشخصية التي نحتفظ بها عنك؛ (ب) طلب تصحيح البيانات غير الدقيقة؛ (ج) طلب حذف حسابك وجميع البيانات الشخصية المرتبطة به؛ (د) سحب موافقتك على رسائل التسويق في أي وقت. لممارسة أي من هذه الحقوق، تواصل معنا عبر التفاصيل الواردة في القسم الثامن.',
    },
  },
  {
    en: {
      title: '7. Data Security',
      body: 'We apply industry-standard security measures including TLS encryption in transit, hashed credentials at rest, and role-based access controls. No method of transmission over the Internet is 100% secure; however, we are committed to protecting your data using commercially reasonable means.',
    },
    ar: {
      title: '٧. أمان البيانات',
      body: 'نطبّق معايير الأمان المعيارية في الصناعة، بما في ذلك تشفير TLS أثناء النقل، وبيانات الاعتماد المجزّأة في حالة التخزين، وضوابط الوصول المستندة إلى الأدوار. لا توجد طريقة نقل عبر الإنترنت آمنة بنسبة ١٠٠٪؛ غير أننا ملتزمون بحماية بياناتك بالوسائل المعقولة تجارياً.',
    },
  },
  {
    en: {
      title: '8. Contact Us',
      body: 'For privacy-related requests or questions, contact the JAI Data Protection team via WhatsApp at +966 55 561 6449 or by email at privacy@jaiksa.com. We will respond within 10 business days.',
    },
    ar: {
      title: '٨. تواصل معنا',
      body: 'للاستفسارات أو الطلبات المتعلقة بالخصوصية، تواصل مع فريق حماية البيانات في جاي عبر واتساب على الرقم ٠٥٥٥٦١٦٤٤٩ أو عبر البريد الإلكتروني privacy@jaiksa.com. سنردّ خلال ١٠ أيام عمل.',
    },
  },
  {
    en: {
      title: '9. Changes to This Policy',
      body: 'We may update this Privacy Policy from time to time. Material changes will be communicated via SMS to your registered number at least 14 days before taking effect. Continued use of the app after the effective date constitutes acceptance of the revised policy.',
    },
    ar: {
      title: '٩. تعديلات هذه السياسة',
      body: 'قد نُحدِّث سياسة الخصوصية هذه من وقت لآخر. ستُبلَّغ بالتغييرات الجوهرية عبر رسالة نصية على رقمك المسجّل قبل ١٤ يوماً على الأقل من سريانها. استمرارك في استخدام التطبيق بعد تاريخ السريان يُعدّ قبولاً للسياسة المحدَّثة.',
    },
  },
] as const;

export default function Privacy() {
  const { isRTL, lang } = useLanguage();
  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';
  const dir = isRTL ? 'rtl' : 'ltr';

  return (
    <div className="bg-[#0F0826] min-h-screen text-white font-sans selection:bg-[#C21875]/30">
      <Navbar />

      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-3xl">
          {/* Header */}
          <div className={`mb-14 ${isRTL ? 'text-right' : ''}`} dir={dir}>
            <Link
              href="/"
              className={`inline-flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm mb-8 ${arabic}`}
            >
              <span>←</span>
              <span>{isRTL ? 'العودة إلى الرئيسية' : 'Back to Home'}</span>
            </Link>
            <h1 className={`text-4xl md:text-5xl font-bold text-white mb-4 ${arabic}`}>
              {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
            </h1>
            <p className={`text-white/40 text-sm ${arabic}`}>
              {isRTL ? 'آخر تحديث: يوليو ٢٠٢٥' : 'Last updated: July 2025'}
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-[#C21875]/40 via-white/10 to-transparent" />
          </div>

          {/* Intro */}
          <p className={`text-white/60 leading-relaxed mb-12 ${arabic} ${isRTL ? 'text-right' : ''}`} dir={dir}>
            {isRTL
              ? 'نحن في جاي نُولي خصوصيتك أهمية قصوى. تُوضِّح هذه السياسة البيانات التي نجمعها ولماذا وكيف نحميها. باستخدامك لخدماتنا فأنت توافق على الشروط الواردة أدناه.'
              : 'At JAI we take your privacy seriously. This policy explains what data we collect, why we collect it, and how we keep it safe. By using our services you agree to the terms below.'}
          </p>

          {/* Sections */}
          <div className="space-y-10">
            {sections.map((s) => {
              const { title, body } = lang === 'ar' ? s.ar : s.en;
              return (
                <div key={title} className={isRTL ? 'text-right' : ''} dir={dir}>
                  <h2 className={`text-white font-semibold text-lg mb-3 ${arabic}`}>{title}</h2>
                  <p className={`text-white/55 leading-relaxed ${arabic}`}>{body}</p>
                </div>
              );
            })}
          </div>

          {/* Contact card */}
          <div className={`mt-16 p-6 rounded-2xl border border-white/10 bg-white/5 ${isRTL ? 'text-right' : ''}`} dir={dir}>
            <p className={`text-white/50 text-sm ${arabic}`}>
              {isRTL
                ? 'للاستفسار عن هذه السياسة، تواصل معنا عبر واتساب:'
                : 'For privacy questions, contact us via WhatsApp:'}
            </p>
            <a
              href="https://wa.me/966555616449"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-[#C21875] hover:text-[#C21875]/80 transition-colors font-medium"
              dir="ltr"
            >
              +966 55 561 6449
            </a>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
