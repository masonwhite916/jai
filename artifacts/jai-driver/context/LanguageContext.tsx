import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'ar';

type Translations = {
  [key: string]: string;
};

const en: Translations = {
  appName: 'JAI Driver',
  welcome: 'Roadside partner',
  signIn: 'Sign in',
  phoneLabel: 'Phone number',
  nameLabel: 'Full name',
  phoneHint: '05X XXX XXXX',
  continue: 'Continue',
  tabRequests: 'Requests',
  tabActive: 'Active',
  tabEarnings: 'Earnings',
  tabProfile: 'Profile',
  online: 'Online',
  offline: 'Offline',
  today: 'Today',
  thisWeek: 'This week',
  thisMonth: 'This month',
  totalJobs: 'Total jobs',
  earnings: 'Earnings',
  noRequests: 'No requests nearby',
  pullToRefresh: 'Pull to refresh',
  incomingRequests: 'Incoming requests',
  accept: 'Accept',
  decline: 'Decline',
  navigate: 'Navigate',
  arrived: 'Arrived',
  startWork: 'Start work',
  complete: 'Complete',
  cancelJob: 'Cancel job',
  jobDetails: 'Job details',
  customer: 'Customer',
  vehicle: 'Vehicle',
  distance: 'Distance',
  eta: 'ETA',
  payout: 'Payout',
  status: 'Status',
  statusPending: 'Pending',
  statusAccepted: 'Accepted',
  statusEnRoute: 'En route',
  statusArrived: 'Arrived',
  statusWorking: 'Working',
  statusCompleted: 'Completed',
  statusCancelled: 'Cancelled',
  logout: 'Log out',
  language: 'Language',
  english: 'English',
  arabic: 'العربية',
  rating: 'Rating',
  jobsDone: 'Jobs completed',
  availability: 'Availability',
  activeJob: 'Active job',
  noActiveJob: 'No active job',
  refresh: 'Refresh',
  sosCall: 'Emergency call',
  requestAccepted: 'Request accepted',
  jobCompleted: 'Job completed',
  tapToView: 'Tap to view',
  km: 'km',
  min: 'min',
  sar: 'SAR',
  confirmCancel: 'Cancel this job?',
  yes: 'Yes',
  no: 'No',
  ok: 'OK',
  tryAgain: 'Try again',
  permissionDenied: 'Permission denied',
  locating: 'Locating...',
  tapToLocate: 'Tap to locate',
  nearby: 'Nearby',
  urgent: 'Urgent',
  standard: 'Standard',
  towTruck: 'Tow',
  battery: 'Battery',
  tire: 'Tire',
  fuel: 'Fuel',
  lockout: 'Lockout',
  address: 'Address',
  earningsSummary: 'Earnings summary',
  performance: 'Performance',
  mechanic: 'Mechanic',
  electric: 'Electrical',
  inviteCode: 'Invite code',
  inviteCodeHint: 'JAI-TECH-XXXX',
  verificationCode: 'Verification code',
  otpSentTo: 'We sent a verification code to',
  sendCode: 'Send code',
  verify: 'Verify',
  resendCode: 'Resend code',
  changeNumber: 'Change number',
  errEnterName: 'Enter your full name',
  errEnterInvite: 'Enter your technician invite code',
  errEnterPhone: 'Enter a valid phone number',
  errEnterOtp: 'Enter the verification code',
  errNotTechnician: 'This account is not a technician account. Check your invite code or contact dispatch.',
  errGeneric: 'Something went wrong. Try again.',
  jobTaken: 'This job is no longer available',
  loadJobsError: 'Couldn\u2019t load jobs — check your connection',
};

const ar: Translations = {
  appName: 'جاي للسائقين',
  welcome: 'شريك الطريق',
  signIn: 'تسجيل الدخول',
  phoneLabel: 'رقم الجوال',
  nameLabel: 'الاسم الكامل',
  phoneHint: '05X XXX XXXX',
  continue: 'متابعة',
  tabRequests: 'الطلبات',
  tabActive: 'النشط',
  tabEarnings: 'الأرباح',
  tabProfile: 'الحساب',
  online: 'متصل',
  offline: 'غير متصل',
  today: 'اليوم',
  thisWeek: 'هذا الأسبوع',
  thisMonth: 'هذا الشهر',
  totalJobs: 'إجمالي المهام',
  earnings: 'الأرباح',
  noRequests: 'لا توجد طلبات بالقرب',
  pullToRefresh: 'اسحب للتحديث',
  incomingRequests: 'طلبات واردة',
  accept: 'قبول',
  decline: 'رفض',
  navigate: 'التنقل',
  arrived: 'تم الوصول',
  startWork: 'بدء العمل',
  complete: 'إنهاء',
  cancelJob: 'إلغاء المهمة',
  jobDetails: 'تفاصيل المهمة',
  customer: 'العميل',
  vehicle: 'المركبة',
  distance: 'المسافة',
  eta: 'الوقت المتوقع',
  payout: 'المبلغ',
  status: 'الحالة',
  statusPending: 'قيد الانتظار',
  statusAccepted: 'مقبول',
  statusEnRoute: 'في الطريق',
  statusArrived: 'تم الوصول',
  statusWorking: 'جاري العمل',
  statusCompleted: 'مكتمل',
  statusCancelled: 'ملغى',
  logout: 'تسجيل الخروج',
  language: 'اللغة',
  english: 'English',
  arabic: 'العربية',
  rating: 'التقييم',
  jobsDone: 'المهام المنجزة',
  availability: 'الاتصال',
  activeJob: 'المهمة النشطة',
  noActiveJob: 'لا توجد مهمة نشطة',
  refresh: 'تحديث',
  sosCall: 'اتصال طوارئ',
  requestAccepted: 'تم قبول الطلب',
  jobCompleted: 'تم إنهاء المهمة',
  tapToView: 'اضغط للعرض',
  km: 'كم',
  min: 'دقيقة',
  sar: 'ر.س',
  confirmCancel: 'إلغاء المهمة؟',
  yes: 'نعم',
  no: 'لا',
  ok: 'موافق',
  tryAgain: 'إعادة المحاولة',
  permissionDenied: 'الإذن مرفوض',
  locating: 'جاري تحديد الموقع...',
  tapToLocate: 'اضغط لتحديد الموقع',
  nearby: 'بالقرب',
  urgent: 'عاجل',
  standard: 'عادي',
  towTruck: 'سطحة',
  battery: 'بطارية',
  tire: 'إطار',
  fuel: 'وقود',
  lockout: 'مفاتيح',
  address: 'العنوان',
  earningsSummary: 'ملخص الأرباح',
  performance: 'الأداء',
  mechanic: 'ميكانيكي',
  electric: 'كهرباء',
  inviteCode: 'رمز الدعوة',
  inviteCodeHint: 'JAI-TECH-XXXX',
  verificationCode: 'رمز التحقق',
  otpSentTo: 'أرسلنا رمز التحقق إلى',
  sendCode: 'إرسال الرمز',
  verify: 'تأكيد',
  resendCode: 'إعادة إرسال الرمز',
  changeNumber: 'تغيير الرقم',
  errEnterName: 'أدخل اسمك الكامل',
  errEnterInvite: 'أدخل رمز دعوة الفني',
  errEnterPhone: 'أدخل رقم جوال صحيح',
  errEnterOtp: 'أدخل رمز التحقق',
  errNotTechnician: 'هذا الحساب ليس حساب فني. تحقق من رمز الدعوة أو تواصل مع الإدارة.',
  errGeneric: 'حدث خطأ. حاول مرة أخرى.',
  jobTaken: 'هذه المهمة لم تعد متاحة',
  loadJobsError: 'تعذّر تحميل الطلبات — تحقق من الاتصال',
};

const dictionaries: Record<Lang, Translations> = { en, ar };

interface FontSet {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  font: FontSet;
  t: (key: string) => string;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? 'en');

  useEffect(() => {
    if (initialLang) return;
    AsyncStorage.getItem('jai_driver_lang').then((stored) => {
      if (stored === 'ar' || stored === 'en') setLangState(stored);
    });
  }, [initialLang]);

  const setLang = (next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem('jai_driver_lang', next);
    I18nManager.forceRTL(next === 'ar');
  };

  const isRTL = lang === 'ar';
  const font: FontSet = isRTL
    ? { regular: 'Cairo_400Regular', medium: 'Cairo_500Medium', semibold: 'Cairo_600SemiBold', bold: 'Cairo_700Bold' }
    : { regular: 'Inter_400Regular', medium: 'Inter_500Medium', semibold: 'Inter_600SemiBold', bold: 'Inter_700Bold' };

  const t = (key: string): string => dictionaries[lang][key] ?? en[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, isRTL, font, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
