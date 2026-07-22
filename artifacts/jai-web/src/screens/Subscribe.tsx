'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';

type PlanId = 'basic' | 'accidents' | 'rental';

const PLANS: Record<PlanId, { price: string; color: string; featureKeys: string[] }> = {
  basic: {
    price: '199',
    color: '#5B2C91',
    featureKeys: ['plan_basic_f1', 'plan_basic_f2', 'plan_basic_f3', 'plan_basic_f4', 'plan_basic_f5'],
  },
  accidents: {
    price: '299',
    color: '#C21875',
    featureKeys: ['plan_accidents_f1', 'plan_accidents_f2', 'plan_accidents_f3', 'plan_accidents_f4'],
  },
  rental: {
    price: '600',
    color: '#2D1B69',
    featureKeys: ['plan_rental_f1', 'plan_rental_f2', 'plan_rental_f3', 'plan_rental_f4'],
  },
};

const PLAN_NAME_KEYS: Record<PlanId, string> = {
  basic: 'plan_basic_name',
  accidents: 'plan_accidents_name',
  rental: 'plan_rental_name',
};

const PLAN_ARABIC_KEYS: Record<PlanId, string> = {
  basic: 'plan_basic_arabic',
  accidents: 'plan_accidents_arabic',
  rental: 'plan_rental_arabic',
};

function getPlanFromSearch(): PlanId {
  const params = new URLSearchParams(window.location.search);
  const p = params.get('plan') as PlanId;
  return p && PLANS[p] ? p : 'accidents';
}

type FormData = {
  name: string;
  phone: string;
  email: string;
  make: string;
  model: string;
  year: string;
  plate: string;
  note: string;
  terms: boolean;
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function Subscribe() {
  const { t, isRTL } = useLanguage();
  const arabic = isRTL ? "font-['Cairo',sans-serif]" : '';
  const router = useRouter();

  const [plan, setPlan] = useState<PlanId>(getPlanFromSearch);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [form, setForm] = useState<FormData>({
    name: '', phone: '', email: '',
    make: '', model: '', year: '', plate: '',
    note: '', terms: false,
  });

  // Sync plan from URL search
  useEffect(() => {
    setPlan(getPlanFromSearch());
  }, []);

  const planInfo = PLANS[plan];

  function set(field: keyof FormData, value: string | boolean) {
    setForm(f => ({ ...f, [field]: value }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate(): boolean {
    const e: Errors = {};
    const req = t('sub_required');
    if (!form.name.trim()) e.name = req;
    if (!form.phone.trim()) e.phone = req;
    if (!form.email.trim()) e.email = req;
    if (!form.make.trim()) e.make = req;
    if (!form.model.trim()) e.model = req;
    if (!form.year.trim()) e.year = req;
    if (!form.plate.trim()) e.plate = req;
    if (!form.terms) e.terms = req;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/jai-web/payment-success`;

      const resp = await fetch('/api/whop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          redirect_url: redirectUrl,
          name: form.name,
          phone: form.phone,
          email: form.email,
          make: form.make,
          model: form.model,
          year: form.year,
          plate: form.plate,
          note: form.note,
        }),
      });

      const data = await resp.json() as { purchase_url?: string; error?: string };

      if (!resp.ok || !data.purchase_url) {
        throw new Error(data.error ?? 'Checkout failed. Please try again.');
      }

      // Redirect to Whop hosted checkout
      window.location.href = data.purchase_url;
    } catch (err) {
      setLoading(false);
      alert(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  const inputBase =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-[#C21875]/60 focus:bg-white/8 transition-all text-sm';

  const errorBorder = 'border-red-500/60 focus:border-red-500/60';

  return (
    <div className={`min-h-screen bg-[#09061A] ${arabic}`}>
      <Navbar />

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#5B2C91]/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[#C21875]/8 rounded-full blur-[140px]" />
      </div>

      <div className="relative pt-28 pb-24 px-6">
        <div className="max-w-6xl mx-auto">

          {/* Back link */}
          <a
            href="/#plans"
            onClick={e => { e.preventDefault(); router.push('/'); setTimeout(() => { document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }}
            className={`inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm mb-12 group ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ChevronLeft className={`w-4 h-4 group-hover:-translate-x-0.5 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
            {t('sub_back')}
          </a>

          <AnimatePresence mode="wait">
            {submitted ? (
              /* ── Success state ── */
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-lg mx-auto text-center py-20"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-[#C21875]/15 border border-[#C21875]/30 flex items-center justify-center mx-auto mb-8"
                >
                  <CheckCircle2 className="w-10 h-10 text-[#C21875]" />
                </motion.div>
                <h2 className={`text-4xl font-bold text-white mb-4 ${arabic}`}>{t('sub_success_h2')}</h2>
                <p className={`text-white/60 text-lg leading-relaxed mb-10 ${arabic}`}>{t('sub_success_body')}</p>
                <button
                  onClick={() => router.push('/')}
                  className={`inline-flex items-center gap-2 bg-[#C21875] hover:bg-[#C21875]/90 text-white px-8 py-3.5 rounded-full font-medium transition-all shadow-[0_0_30px_rgba(194,24,117,0.25)] ${arabic} ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('sub_success_cta')}
                  <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
              </motion.div>
            ) : (
              /* ── Form state ── */
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Header */}
                <div className="mb-12">
                  <h1 className={`text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight ${arabic}`}>
                    {t('sub_h2')}
                  </h1>
                  <p className={`text-white/50 text-lg ${arabic}`}>{t('sub_sub')}</p>
                </div>

                <div className={`grid lg:grid-cols-[1fr_380px] gap-12 items-start ${isRTL ? 'lg:grid-cols-[380px_1fr]' : ''}`}>

                  {/* ── Left: Form ── */}
                  <form onSubmit={handleSubmit} noValidate className="space-y-10">

                    {/* Plan selector */}
                    <div>
                      <p className={`text-white/40 text-xs uppercase tracking-widest font-semibold mb-4 ${arabic}`}>
                        {t('sub_plan_label')}
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        {(Object.keys(PLANS) as PlanId[]).map(pid => (
                          <button
                            key={pid}
                            type="button"
                            onClick={() => setPlan(pid)}
                            className={`relative rounded-2xl p-4 text-center transition-all border ${
                              plan === pid
                                ? 'bg-[#2D1B69]/60 border-[#C21875] shadow-[0_0_20px_rgba(194,24,117,0.15)]'
                                : 'bg-white/3 border-white/8 hover:border-white/20'
                            }`}
                          >
                            {plan === pid && (
                              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#C21875] flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </span>
                            )}
                            <div className={`text-sm font-bold text-white mb-1 ${arabic}`}>
                              {t(PLAN_NAME_KEYS[pid] as Parameters<typeof t>[0])}
                            </div>
                            <div className="text-[#C21875] font-bold text-lg">{PLANS[pid].price}</div>
                            <div className={`text-white/30 text-xs ${arabic}`}>SAR</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Personal info */}
                    <div>
                      <h3 className={`text-lg font-semibold text-white mb-6 ${arabic}`}>{t('sub_step1_title')}</h3>
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_name')}</label>
                          <input
                            type="text"
                            value={form.name}
                            onChange={e => set('name', e.target.value)}
                            placeholder={t('sub_name_ph')}
                            className={`${inputBase} ${errors.name ? errorBorder : ''}`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          {errors.name && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.name}</p>}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_phone')}</label>
                            <input
                              type="tel"
                              value={form.phone}
                              onChange={e => set('phone', e.target.value)}
                              placeholder={t('sub_phone_ph')}
                              className={`${inputBase} ${errors.phone ? errorBorder : ''}`}
                              dir="ltr"
                            />
                            {errors.phone && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.phone}</p>}
                          </div>
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_email')}</label>
                            <input
                              type="email"
                              value={form.email}
                              onChange={e => set('email', e.target.value)}
                              placeholder={t('sub_email_ph')}
                              className={`${inputBase} ${errors.email ? errorBorder : ''}`}
                              dir="ltr"
                            />
                            {errors.email && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.email}</p>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle info */}
                    <div>
                      <h3 className={`text-lg font-semibold text-white mb-6 ${arabic}`}>{t('sub_step2_title')}</h3>
                      <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_make')}</label>
                            <input
                              type="text"
                              value={form.make}
                              onChange={e => set('make', e.target.value)}
                              placeholder={t('sub_make_ph')}
                              className={`${inputBase} ${errors.make ? errorBorder : ''}`}
                            />
                            {errors.make && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.make}</p>}
                          </div>
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_model')}</label>
                            <input
                              type="text"
                              value={form.model}
                              onChange={e => set('model', e.target.value)}
                              placeholder={t('sub_model_ph')}
                              className={`${inputBase} ${errors.model ? errorBorder : ''}`}
                            />
                            {errors.model && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.model}</p>}
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_year')}</label>
                            <input
                              type="number"
                              value={form.year}
                              onChange={e => set('year', e.target.value)}
                              placeholder={t('sub_year_ph')}
                              min="1990"
                              max="2030"
                              className={`${inputBase} ${errors.year ? errorBorder : ''}`}
                              dir="ltr"
                            />
                            {errors.year && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.year}</p>}
                          </div>
                          <div>
                            <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_plate')}</label>
                            <input
                              type="text"
                              value={form.plate}
                              onChange={e => set('plate', e.target.value.toUpperCase())}
                              placeholder={t('sub_plate_ph')}
                              className={`${inputBase} tracking-wider ${errors.plate ? errorBorder : ''}`}
                              dir="ltr"
                            />
                            {errors.plate && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.plate}</p>}
                          </div>
                        </div>

                        <div>
                          <label className={`block text-white/60 text-sm mb-2 ${arabic}`}>{t('sub_note')}</label>
                          <textarea
                            value={form.note}
                            onChange={e => set('note', e.target.value)}
                            placeholder={t('sub_note_ph')}
                            rows={3}
                            className={`${inputBase} resize-none`}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Terms */}
                    <div>
                      <label className={`flex gap-3 cursor-pointer items-start ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div
                          onClick={() => set('terms', !form.terms)}
                          className={`mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                            form.terms ? 'bg-[#C21875] border border-[#C21875]' : `border ${errors.terms ? 'border-red-500/60' : 'border-white/20'} bg-white/5`
                          }`}
                        >
                          {form.terms && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={`text-white/50 text-sm leading-relaxed ${arabic}`}>{t('sub_terms')}</span>
                      </label>
                      {errors.terms && <p className={`text-red-400 text-xs mt-1.5 ${arabic}`}>{errors.terms}</p>}
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loading}
                      className={`w-full py-4 bg-[#C21875] hover:bg-[#C21875]/90 disabled:opacity-70 disabled:cursor-not-allowed text-white rounded-full font-bold text-base transition-all shadow-[0_0_30px_rgba(194,24,117,0.25)] hover:shadow-[0_0_40px_rgba(194,24,117,0.4)] flex items-center justify-center gap-3 ${arabic}`}
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          {t('sub_submit')}
                          <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* ── Right: Order summary ── */}
                  <div className="lg:sticky lg:top-28">
                    <div className="rounded-[2rem] bg-[#150B33] border border-white/8 p-8 overflow-hidden relative">
                      {/* Gradient accent */}
                      <div
                        className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]"
                        style={{ background: `linear-gradient(90deg, ${planInfo.color}, #C21875)` }}
                      />

                      <p className={`text-white/40 text-xs uppercase tracking-widest font-semibold mb-6 ${arabic}`}>
                        {t('sub_summary_title')}
                      </p>

                      <div className="mb-6">
                        <h3 className={`text-2xl font-bold text-white ${arabic}`}>
                          {t(PLAN_NAME_KEYS[plan] as Parameters<typeof t>[0])}
                        </h3>
                        <p className={`text-[#C21875] font-['Cairo',sans-serif] text-base mt-1`}>
                          {t(PLAN_ARABIC_KEYS[plan] as Parameters<typeof t>[0])}
                        </p>
                      </div>

                      <div className="flex items-end gap-2 mb-8 pb-8 border-b border-white/8">
                        <span className="text-5xl font-extrabold text-white tracking-tight">{planInfo.price}</span>
                        <span className={`text-white/40 mb-1.5 ${arabic}`}>{t('sub_per_year')}</span>
                      </div>
                      <p className={`text-white/30 text-xs mb-6 ${arabic}`}>{t('sub_vat')}</p>

                      <div className="space-y-4">
                        {planInfo.featureKeys.map((fk, i) => (
                          <div key={i} className={`flex gap-3 items-start ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                            <div className="mt-0.5 w-4 h-4 rounded-full bg-[#C21875]/20 flex items-center justify-center flex-shrink-0">
                              <Check className="w-2.5 h-2.5 text-[#C21875]" />
                            </div>
                            <span className={`text-white/60 text-sm leading-relaxed ${arabic}`}>
                              {t(fk as Parameters<typeof t>[0])}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/8">
                        <p className={`text-white/30 text-xs leading-relaxed ${arabic}`}>
                          {t('footer_note1')}
                        </p>
                        <p className={`text-white/30 text-xs mt-2 ${arabic}`}>
                          {t('footer_note2')}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
