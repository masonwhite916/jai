'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/LanguageContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const sections = [
  {
    en: { title: '1. Membership Coverage', body: 'JAI Roadside Assistance membership covers one (1) registered vehicle for a period of twelve (12) months from the date of activation. Coverage is personal and non-transferable to another vehicle or individual.' },
    ar: { title: '١. نطاق العضوية', body: 'تغطي عضوية جاي للمساعدة على الطريق مركبة واحدة (١) مسجّلة لمدة اثني عشر (١٢) شهراً من تاريخ التفعيل. العضوية شخصية وغير قابلة للنقل إلى مركبة أو شخص آخر.' },
  },
  {
    en: { title: '2. Activation', body: 'Membership is activated within 48 hours of successful payment. You will receive confirmation via your registered mobile number. Coverage begins upon activation, not the date of purchase.' },
    ar: { title: '٢. التفعيل', body: 'تُفعَّل العضوية خلال ٤٨ ساعة من اكتمال الدفع بنجاح. ستتلقى تأكيداً على رقم هاتفك المسجّل. تبدأ التغطية من تاريخ التفعيل وليس من تاريخ الشراء.' },
  },
  {
    en: { title: '3. Covered Services', body: 'The membership includes: battery jump-start, emergency towing (up to 50 km per incident), fuel delivery (up to 5 litres), vehicle lockout assistance, and tire change. Each service is subject to a fair-use limit of once per calendar month per covered vehicle.' },
    ar: { title: '٣. الخدمات المشمولة', body: 'تشمل العضوية: مساعدة البطارية، السطحة (بحد أقصى ٥٠ كم لكل حادثة)، توصيل الوقود (بحد أقصى ٥ لترات)، فتح السيارة، وتغيير الإطار. كل خدمة خاضعة لحد الاستخدام المعقول مرة واحدة في الشهر الميلادي للمركبة المشمولة.' },
  },
  {
    en: { title: '4. Geographic Scope', body: 'Services are available within the Kingdom of Saudi Arabia only. Coverage is subject to technician availability in the requested area. Remote or restricted areas may experience extended response times.' },
    ar: { title: '٤. النطاق الجغرافي', body: 'الخدمات متاحة داخل المملكة العربية السعودية فقط. التغطية مشروطة بتوافر فنيين في المنطقة المطلوبة. قد تشهد المناطق النائية أو المقيّدة أوقات استجابة أطول.' },
  },
  {
    en: { title: '5. Exclusions', body: 'The following are not covered: mechanical or electrical repairs beyond roadside assistance, accidents requiring insurance involvement, damage caused by misuse or negligence, and services requested outside the membership period.' },
    ar: { title: '٥. الاستثناءات', body: 'لا تشمل العضوية: الإصلاحات الميكانيكية أو الكهربائية التي تتجاوز المساعدة الميدانية، الحوادث التي تستلزم تدخل التأمين، الأضرار الناجمة عن سوء الاستخدام أو الإهمال، والخدمات المطلوبة خارج فترة العضوية.' },
  },
  {
    en: { title: '6. Payment & Refunds', body: 'All membership fees are collected via Whop and are non-refundable after 48 hours from purchase, except where required by applicable law. Renewals are billed automatically at the start of each membership cycle unless cancelled.' },
    ar: { title: '٦. الدفع والاسترداد', body: 'تُجمَّع رسوم العضوية عبر Whop وهي غير قابلة للاسترداد بعد ٤٨ ساعة من الشراء، إلا في الحالات التي يوجبها النظام. تُجدَّد الاشتراكات تلقائياً في بداية كل دورة ما لم يتم الإلغاء.' },
  },
  {
    en: { title: '7. Privacy', body: 'Your personal data (name, phone number, vehicle details, and location during a service request) is processed solely to deliver the requested roadside assistance. JAI does not sell personal data to third parties. Location data is retained only for the duration of the active service call.' },
    ar: { title: '٧. الخصوصية', body: 'تُعالَج بياناتك الشخصية (الاسم، رقم الهاتف، بيانات المركبة، والموقع أثناء طلب الخدمة) فقط لتقديم مساعدة الطوارئ المطلوبة. لا تبيع جاي البيانات الشخصية لأطراف ثالثة. تُحتفظ ببيانات الموقع طوال مدة مكالمة الخدمة النشطة فقط.' },
  },
  {
    en: { title: '8. Limitation of Liability', body: 'JAI\'s liability is limited to the cost of the membership plan purchased. JAI is not liable for indirect, consequential, or incidental damages arising from the use or inability to use the services.' },
    ar: { title: '٨. حدود المسؤولية', body: 'تقتصر مسؤولية جاي على تكلفة خطة العضوية المشتراة. لا تتحمل جاي أي مسؤولية عن الأضرار غير المباشرة أو التبعية أو العرضية الناجمة عن استخدام الخدمات أو تعذّر استخدامها.' },
  },
  {
    en: { title: '9. Governing Law', body: 'These Terms & Conditions are governed by the laws of the Kingdom of Saudi Arabia. Any disputes shall be resolved before the competent courts in the Kingdom.' },
    ar: { title: '٩. القانون الحاكم', body: 'تخضع هذه الشروط والأحكام لأنظمة المملكة العربية السعودية. تُحسم أي نزاعات أمام المحاكم المختصة في المملكة.' },
  },
  {
    en: { title: '10. Changes to Terms', body: 'JAI reserves the right to update these Terms & Conditions at any time. Continued use of the membership after changes are posted constitutes acceptance of the revised terms. Material changes will be communicated via SMS to your registered number.' },
    ar: { title: '١٠. تعديل الشروط', body: 'تحتفظ جاي بحق تحديث هذه الشروط والأحكام في أي وقت. استمرارك في استخدام العضوية بعد نشر التعديلات يُعدّ قبولاً للشروط المحدَّثة. ستُبلَّغ بالتغييرات الجوهرية عبر رسالة نصية على رقمك المسجّل.' },
  },
] as const;

export default function Terms() {
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
              {isRTL ? 'الشروط والأحكام' : 'Terms & Conditions'}
            </h1>
            <p className={`text-white/40 text-sm ${arabic}`}>
              {isRTL ? 'آخر تحديث: يناير ٢٠٢٥' : 'Last updated: January 2025'}
            </p>
            <div className="mt-6 h-px bg-gradient-to-r from-[#C21875]/40 via-white/10 to-transparent" />
          </div>

          {/* Intro */}
          <p className={`text-white/60 leading-relaxed mb-12 ${arabic} ${isRTL ? 'text-right' : ''}`} dir={dir}>
            {isRTL
              ? 'يُرجى قراءة هذه الشروط والأحكام بعناية قبل الاشتراك في خدمة جاي للمساعدة على الطريق. باشتراكك فإنك توافق على الالتزام بهذه الشروط.'
              : 'Please read these Terms & Conditions carefully before subscribing to JAI Roadside Assistance. By subscribing you agree to be bound by these terms.'}
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

          {/* Contact */}
          <div className={`mt-16 p-6 rounded-2xl border border-white/10 bg-white/5 ${isRTL ? 'text-right' : ''}`} dir={dir}>
            <p className={`text-white/50 text-sm ${arabic}`}>
              {isRTL
                ? 'للاستفسار عن هذه الشروط، تواصل معنا عبر واتساب:'
                : 'For questions about these Terms, contact us via WhatsApp:'}
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
