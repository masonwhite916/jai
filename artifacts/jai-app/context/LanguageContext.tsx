import React, { createContext, useContext, useState, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reloadAppAsync } from 'expo';

export type Lang = 'en' | 'ar';

export const translations = {
  en: {
    // Auth
    enterPhone: 'Enter your mobile number',
    phoneHint: "We'll send a verification code to confirm your number",
    sendOTP: 'Send OTP',
    enterOTP: 'Enter Verification Code',
    otpSentTo: 'Sent to',
    verifyAndContinue: 'Verify & Continue',
    verifying: 'Verifying...',
    continueAsGuest: 'Continue as Guest',
    resendCode: 'Resend code in 60s',
    changeNumber: 'Change Number',
    phoneError: 'Please enter a valid phone number',
    otpError: 'Please enter the 4-digit OTP',
    or: 'or',
    // Onboarding
    slide1Title: 'We Arrive When\nYou Need Us',
    slide1Sub: "Fast, reliable roadside assistance anywhere in Saudi Arabia — we're always just minutes away.",
    slide2Title: 'Track Technicians\nLive',
    slide2Sub: "Watch your technician's location in real time and know exactly when help will arrive.",
    slide3Title: '24/7 Roadside\nAssistance',
    slide3Sub: "Day or night, rain or shine. JAI's expert technicians are on standby around the clock.",
    next: 'Next',
    skip: 'Skip',
    getStarted: 'Get Started',
    // Home
    goodMorning: 'Good morning,',
    locationCity: 'Riyadh, Saudi Arabia',
    searchPlaceholder: 'Search for a service...',
    emergencyLabel: 'Emergency?',
    emergencyTap: 'Tap SOS for immediate help',
    premiumMember: 'Premium Member',
    pts: 'pts',
    chooseService: 'Choose a Service',
    battery: 'Battery',
    fuel: 'Fuel',
    tire: 'Tire',
    tow: 'Tow Truck',
    lockout: 'Lockout',
    mechanic: 'Mechanic',
    electric: 'Electrical',
    quickContact: 'Quick Contact',
    whatsapp: 'WhatsApp',
    callCenter: 'Call Center',
    nearbyTechs: 'Nearby Technicians',
    techsNearby: '12 technicians nearby',
    within5km: 'within 5 km radius',
    avgETA: 'avg. ETA',
    latestOffers: 'Latest Offers',
    offer1Title: '30% Off Battery Jump Start',
    offer1Sub: 'Valid until July 31, 2026',
    offer2Title: 'Free Tire Check with Any Service',
    offer2Sub: 'This month only',
    hot: 'HOT',
    new: 'NEW',
    // Requests
    myRequests: 'My Requests',
    inProgress: 'Request in Progress',
    enRoute: 'Ahmed is on the way',
    requestHistory: 'Request History',
    statusActive: 'Active',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    // Membership
    membershipPlans: 'Membership Plans',
    choosePlan: 'Choose the plan that fits your needs',
    currentPlanLabel: 'Your current plan:',
    subscribe: 'Subscribe',
    currentPlan: 'Current Plan',
    contactSales: 'Contact Sales',
    perYear: 'year',
    mostPopular: 'MOST POPULAR',
    validUntil: 'Valid until Dec 31, 2026',
    membershipBasic: 'Basic',
    membershipPremium: 'Premium',
    membershipBusiness: 'Business',
    membershipEnterprise: 'Enterprise',
    membershipCustom: 'Custom',
    // Notifications
    notifications: 'Notifications',
    newNotifs: 'new',
    // Profile
    vehiclesLabel: 'Vehicles',
    requestsLabel: 'Requests',
    pointsLabel: 'Points',
    myVehicles: 'My Vehicles',
    addVehicle: 'Add Vehicle',
    savedLocations: 'Saved Locations',
    locationsSaved: '2 locations saved',
    invoices: 'Invoices & Billing',
    rewards: 'Rewards & Promo Codes',
    referral: 'Referral Program',
    referralSub: 'Earn 50 SAR per referral',
    faq: 'FAQ',
    safetyTips: 'Safety Tips',
    aiAssistant: 'AI Assistant',
    darkMode: 'Dark Mode',
    languageLabel: 'Language',
    languageValue: 'English',
    signOut: 'Sign Out',
    account: 'Account',
    support: 'Support',
    general: 'General',
    premiumMembership: 'Premium Membership',
    // Service Request
    selectVehicle: 'Select Your Vehicle',
    addNewVehicle: 'Add New Vehicle',
    describeProblem: 'Describe the Problem',
    describeProblemHint: 'Help our technician understand the issue better',
    problemPlaceholder: "e.g., Car won't start, battery seems completely dead...",
    optionalPhotos: 'Optional — add photos',
    uploadPhotos: 'Upload Photos',
    confirmLocation: 'Confirm Your Location',
    locationDetected: 'Location Detected',
    currentLocation: 'Current Location',
    change: 'Change',
    orderSummary: 'Order Summary',
    serviceLabel: 'Service',
    vehicleLabel: 'Vehicle',
    locationLabel: 'Location',
    estArrivalLabel: 'Est. Arrival',
    estimatedCost: 'Estimated Cost',
    paymentMethod: 'Payment Method',
    confirmRequest: 'Confirm Request',
    continueBtn: 'Continue',
    confirming: 'Confirming...',
    stepWord: 'Step',
    ofWord: 'of',
    applePay: 'Apple Pay',
    madaCard: 'Mada Card',
    visaMaster: 'Visa / Mastercard',
    cash: 'Cash',
    // Tracking
    technicianEnRoute: 'Technician En Route',
    estimatedArrival: 'Estimated arrival',
    kmAway: 'km away',
    cancelRequest: 'Cancel Request',
    batterySpecialist: 'Battery Specialist',
    // Service names
    serviceBattery: 'Battery Jump Start',
    serviceFuel: 'Fuel Delivery',
    serviceTire: 'Tire Replacement',
    serviceTow: 'Vehicle Towing',
    serviceLockout: 'Lockout Assistance',
    serviceMechanic: 'Light Mechanical Repair',
    serviceElectric: 'Electrical Repair',
    // Address
    addressKingFahd: 'King Fahd Road, Riyadh',
    addressOlaya: 'Olaya Street, Riyadh',
    addressPMBS: 'Prince Mohammed Bin Salman Road',
    addressNakheel: 'Al Nakheel District, Riyadh',
    addressKingFahdFull: 'King Fahd Road, Al Olaya District, Riyadh 12244',
    // Tech
    techName: 'Ahmed Al-Ghamdi',
    // Plan benefits
    basicB1: '2 free service calls/year', basicB2: 'Battery & Tire only', basicB3: 'Priority support', basicB4: 'Mobile app access',
    premiumB1: '10 free service calls/year', premiumB2: 'All 7 service types', premiumB3: '24/7 priority support', premiumB4: 'Free towing up to 50km', premiumB5: 'Roadside safety kit',
    businessB1: 'Up to 5 vehicles', businessB2: 'Unlimited service calls', businessB3: 'Fleet dashboard', businessB4: 'Monthly reports', businessB5: 'Dedicated account manager', businessB6: 'Corporate invoicing',
    enterpriseB1: 'Unlimited vehicles', enterpriseB2: 'Custom SLA agreements', enterpriseB3: 'Real-time fleet tracking', enterpriseB4: 'API integration', enterpriseB5: 'White-label options', enterpriseB6: '24/7 dedicated team',
    // Notifications
    notif1Title: 'Technician Assigned', notif1Body: 'Ahmed Al-Ghamdi has been assigned to your battery jump start request.',
    notif2Title: 'Technician Arriving', notif2Body: 'Ahmed is 8 minutes away from your location.',
    notif3Title: 'Special Offer — 30% Off!', notif3Body: 'Get 30% off your next battery jump start service. Valid until July 31.',
    notif4Title: 'Service Completed', notif4Body: 'Your tire replacement on Jul 15 has been completed. Rate your experience.',
    notif5Title: 'Membership Renews Soon', notif5Body: 'Your Premium membership expires in 14 days. Renew now to keep your benefits.',
    notif6Title: 'New Offer Available', notif6Body: 'Free tire check with any service this month. Limited time offer.',
    notifAgo2: '2 min ago', notifAgo5: '5 min ago', notifAgo1h: '1 hour ago', notifDate15: 'Jul 15', notifDate12: 'Jul 12', notifDate10: 'Jul 10',
    // Request list
    reqBattery: 'Battery Jump Start', reqTire: 'Tire Replacement', reqFuel: 'Fuel Delivery', reqLockout: 'Lockout Assistance',
    reqAddrFahd: 'King Fahd Road, Riyadh', reqAddrOlaya: 'Olaya Street, Riyadh', reqAddrPMBS: 'Prince Mohammed Bin Salman Road', reqAddrNakheel: 'Al Nakheel District, Riyadh',
    reqTechAhmed: 'Ahmed Al-Ghamdi', reqTechKhalid: 'Khalid Hassan', reqTechOmar: 'Omar Al-Shehri',
    // GPS / live location
    locating: 'Locating…',
    tapToLocate: 'Tap to detect location',
    // Tracking
    shareEtaMsg: 'My JAI technician is on the way — arriving in about 8 minutes. Help is coming!',
    // Notifications
    markAllRead: 'Mark all as read',
    // Saved locations
    savedLocationsEmpty: 'No saved places yet',
    savedLocationsHint: 'Home and work shortcuts are coming soon — for now we always use your live GPS location.',
    // Invoices
    invoicesEmpty: 'No invoices yet',
    invoicesHint: 'Receipts will appear here after each completed service.',
    // Rewards
    pointsBalance: 'Points Balance',
    pointsWorth: 'Every 100 points = 10 SAR off your next service',
    howToEarn: 'How to earn points',
    earn1: 'Complete a service request — 50 pts',
    earn2: 'Rate your technician — 10 pts',
    earn3: 'Refer a friend — 200 pts',
    // Referral
    yourReferralCode: 'Your referral code',
    referralHint: 'Share your code — you both get 50 SAR credit after your friend’s first service.',
    shareCode: 'Share Code',
    referralShareMsg: 'Join me on JAI Roadside Assistance! Use my referral code',
    // FAQ
    faqQ1: 'How fast will a technician arrive?',
    faqA1: 'Average arrival time is 8–15 minutes inside city limits, depending on traffic and technician availability.',
    faqQ2: 'Which cities does JAI cover?',
    faqA2: 'We currently serve Riyadh, Jeddah and Dammam, with more cities launching soon.',
    faqQ3: 'How do I pay for a service?',
    faqA3: 'You can pay with Apple Pay, mada, credit card, or cash once the service is completed.',
    faqQ4: 'What does a membership include?',
    faqA4: 'Memberships include free service calls, priority dispatch and exclusive discounts. Check the Membership tab for full details.',
    // Safety tips
    safety1Title: 'Pull over safely',
    safety1Body: 'Move your car to the shoulder or a safe area away from traffic before requesting help.',
    safety2Title: 'Turn on hazard lights',
    safety2Body: 'Keep your hazard lights on so other drivers and your technician can spot you easily.',
    safety3Title: 'Stay inside on highways',
    safety3Body: 'On fast roads, stay buckled inside your car until the technician arrives.',
    safety4Title: 'Verify your technician',
    safety4Body: 'Check the technician’s name and rating in the app before opening your window or door.',
    safety5Title: 'Keep essentials in your car',
    safety5Body: 'Water, a phone charger and a reflective triangle are always good to have on board.',
    // Driver / technician app
    driverTabRequests: 'Requests',
    driverTabActive: 'Active',
    driverTabEarnings: 'Earnings',
    driverTabProfile: 'Profile',
    driverOnline: 'Online',
    driverOffline: 'Offline',
    driverToday: 'Today',
    driverThisWeek: 'This week',
    driverThisMonth: 'This month',
    driverTotalJobs: 'Total jobs',
    driverEarnings: 'Earnings',
    driverNoRequests: 'No requests nearby',
    driverIncomingRequests: 'Incoming requests',
    driverAccept: 'Accept',
    driverDecline: 'Decline',
    driverNavigate: 'Navigate',
    driverArrived: 'Arrived',
    driverStartWork: 'Start work',
    driverComplete: 'Complete',
    driverCancelJob: 'Cancel job',
    driverJobDetails: 'Job details',
    driverVehicle: 'Vehicle',
    driverDistance: 'Distance',
    driverEta: 'ETA',
    driverPayout: 'Payout',
    driverAddress: 'Address',
    driverStatus: 'Status',
    driverStatusPending: 'Pending',
    driverStatusAccepted: 'Accepted',
    driverStatusEnRoute: 'En route',
    driverStatusArrived: 'Arrived',
    driverStatusWorking: 'Working',
    driverStatusCompleted: 'Completed',
    driverStatusCancelled: 'Cancelled',
    driverLogout: 'Sign out',
    driverLanguage: 'Language',
    driverJobsDone: 'Jobs completed',
    driverAvailability: 'Availability',
    driverActiveJob: 'Active job',
    driverNoActiveJob: 'No active job',
    driverCall: 'Call',
    driverKm: 'km',
    driverMin: 'min',
    driverSar: 'SAR',
    driverConfirmCancel: 'Cancel this job?',
    driverUrgent: 'Urgent',
    driverStandard: 'Standard',
    yes: 'Yes',
    no: 'No',
  },
  ar: {
    // Auth
    enterPhone: 'أدخل رقم جوالك',
    phoneHint: 'سنرسل رمز تحقق لتأكيد رقمك',
    sendOTP: 'إرسال رمز التحقق',
    enterOTP: 'أدخل رمز التحقق',
    otpSentTo: 'تم الإرسال إلى',
    verifyAndContinue: 'تحقق ومتابعة',
    verifying: 'جارٍ التحقق...',
    continueAsGuest: 'متابعة كزائر',
    resendCode: 'إعادة إرسال الرمز خلال 60 ثانية',
    changeNumber: 'تغيير الرقم',
    phoneError: 'يرجى إدخال رقم جوال صحيح',
    otpError: 'يرجى إدخال رمز التحقق المكون من 4 أرقام',
    or: 'أو',
    // Onboarding
    slide1Title: 'نصل إليك\nعندما تحتاجنا',
    slide1Sub: 'مساعدة سريعة وموثوقة على الطريق في أي مكان بالمملكة العربية السعودية.',
    slide2Title: 'تابع الفني\nمباشرةً',
    slide2Sub: 'شاهد موقع الفني في الوقت الفعلي واعرف بالضبط متى ستصل المساعدة إليك.',
    slide3Title: 'مساعدة على الطريق\nعلى مدار الساعة',
    slide3Sub: 'نهاراً أو ليلاً، في أي طقس. فنيو جاي المحترفون في حالة تأهب دائمة.',
    next: 'التالي',
    skip: 'تخطي',
    getStarted: 'ابدأ الآن',
    // Home
    goodMorning: 'صباح الخير،',
    locationCity: 'الرياض، المملكة العربية السعودية',
    searchPlaceholder: 'ابحث عن خدمة...',
    emergencyLabel: 'طوارئ؟',
    emergencyTap: 'اضغط SOS للمساعدة الفورية',
    premiumMember: 'عضو بريميوم',
    pts: 'نقطة',
    chooseService: 'اختر الخدمة',
    battery: 'بطارية',
    fuel: 'وقود',
    tire: 'إطار',
    tow: 'سطحة',
    lockout: 'فتح سيارة',
    mechanic: 'ميكانيكي',
    electric: 'كهربائي',
    quickContact: 'تواصل سريع',
    whatsapp: 'واتساب',
    callCenter: 'مركز الاتصال',
    nearbyTechs: 'فنيون قريبون',
    techsNearby: '١٢ فني قريب منك',
    within5km: 'في نطاق 5 كم',
    avgETA: 'متوسط وقت الوصول',
    latestOffers: 'أحدث العروض',
    offer1Title: 'خصم ٣٠٪ على شحن البطارية',
    offer1Sub: 'صالح حتى ٣١ يوليو ٢٠٢٦',
    offer2Title: 'فحص مجاني للإطارات مع أي خدمة',
    offer2Sub: 'هذا الشهر فقط',
    hot: 'رائج',
    new: 'جديد',
    // Requests
    myRequests: 'طلباتي',
    inProgress: 'طلب قيد التنفيذ',
    enRoute: 'أحمد في الطريق إليك',
    requestHistory: 'سجل الطلبات',
    statusActive: 'نشط',
    statusCompleted: 'مكتمل',
    statusCancelled: 'ملغي',
    // Membership
    membershipPlans: 'خطط العضوية',
    choosePlan: 'اختر الخطة المناسبة لك',
    currentPlanLabel: 'خطتك الحالية:',
    subscribe: 'اشترك الآن',
    currentPlan: 'الخطة الحالية',
    contactSales: 'تواصل مع المبيعات',
    perYear: 'سنة',
    mostPopular: 'الأكثر شيوعاً',
    validUntil: 'صالح حتى ٣١ ديسمبر ٢٠٢٦',
    membershipBasic: 'أساسي',
    membershipPremium: 'بريميوم',
    membershipBusiness: 'أعمال',
    membershipEnterprise: 'مؤسسي',
    membershipCustom: 'مخصص',
    // Notifications
    notifications: 'الإشعارات',
    newNotifs: 'جديدة',
    // Profile
    vehiclesLabel: 'مركبات',
    requestsLabel: 'طلبات',
    pointsLabel: 'نقاط',
    myVehicles: 'مركباتي',
    addVehicle: 'إضافة مركبة',
    savedLocations: 'المواقع المحفوظة',
    locationsSaved: 'موقعان محفوظان',
    invoices: 'الفواتير والمدفوعات',
    rewards: 'المكافآت وأكواد الخصم',
    referral: 'برنامج الإحالة',
    referralSub: 'اكسب ٥٠ ريال لكل إحالة',
    faq: 'الأسئلة الشائعة',
    safetyTips: 'نصائح السلامة',
    aiAssistant: 'المساعد الذكي',
    darkMode: 'الوضع الليلي',
    languageLabel: 'اللغة',
    languageValue: 'العربية',
    signOut: 'تسجيل الخروج',
    account: 'الحساب',
    support: 'الدعم',
    general: 'عام',
    premiumMembership: 'عضوية بريميوم',
    // Service Request
    selectVehicle: 'اختر مركبتك',
    addNewVehicle: 'إضافة مركبة جديدة',
    describeProblem: 'صف المشكلة',
    describeProblemHint: 'ساعد فنيّنا على فهم المشكلة بشكل أفضل',
    problemPlaceholder: 'مثال: السيارة لا تعمل، تبدو البطارية فارغة...',
    optionalPhotos: 'اختياري — أضف صوراً',
    uploadPhotos: 'رفع الصور',
    confirmLocation: 'تأكيد موقعك',
    locationDetected: 'تم تحديد الموقع',
    currentLocation: 'الموقع الحالي',
    change: 'تغيير',
    orderSummary: 'ملخص الطلب',
    serviceLabel: 'الخدمة',
    vehicleLabel: 'المركبة',
    locationLabel: 'الموقع',
    estArrivalLabel: 'وقت الوصول التقديري',
    estimatedCost: 'التكلفة التقديرية',
    paymentMethod: 'طريقة الدفع',
    confirmRequest: 'تأكيد الطلب',
    continueBtn: 'متابعة',
    confirming: 'جارٍ التأكيد...',
    stepWord: 'خطوة',
    ofWord: 'من',
    applePay: 'Apple Pay',
    madaCard: 'بطاقة مدى',
    visaMaster: 'فيزا / ماستركارد',
    cash: 'نقداً',
    // Tracking
    technicianEnRoute: 'الفني في الطريق',
    estimatedArrival: 'وقت الوصول التقديري',
    kmAway: 'كم',
    cancelRequest: 'إلغاء الطلب',
    batterySpecialist: 'متخصص بطاريات',
    // Service names
    serviceBattery: 'شحن البطارية',
    serviceFuel: 'توصيل الوقود',
    serviceTire: 'تغيير الإطار',
    serviceTow: 'سحب السيارة',
    serviceLockout: 'فتح السيارة',
    serviceMechanic: 'إصلاح ميكانيكي',
    serviceElectric: 'إصلاح كهربائي',
    // Address
    addressKingFahd: 'طريق الملك فهد، الرياض',
    addressOlaya: 'شارع العليا، الرياض',
    addressPMBS: 'طريق الأمير محمد بن سلمان',
    addressNakheel: 'حي النخيل، الرياض',
    addressKingFahdFull: 'طريق الملك فهد، حي العليا، الرياض ١٢٢٤٤',
    // Tech
    techName: 'أحمد الغامدي',
    // Plan benefits
    basicB1: 'مكالمتان مجانيتان/سنة', basicB2: 'البطارية والإطارات فقط', basicB3: 'دعم أولوية', basicB4: 'تطبيق الجوال',
    premiumB1: '١٠ مكالمات مجانية/سنة', premiumB2: 'جميع أنواع الخدمات السبع', premiumB3: 'دعم أولوية ٢٤/٧', premiumB4: 'سحب مجاني حتى ٥٠ كم', premiumB5: 'حقيبة سلامة الطريق',
    businessB1: 'حتى ٥ مركبات', businessB2: 'مكالمات غير محدودة', businessB3: 'لوحة إدارة الأسطول', businessB4: 'تقارير شهرية', businessB5: 'مدير حساب مخصص', businessB6: 'فوترة الشركات',
    enterpriseB1: 'مركبات غير محدودة', enterpriseB2: 'اتفاقيات مستوى خدمة مخصصة', enterpriseB3: 'تتبع الأسطول في الوقت الفعلي', enterpriseB4: 'تكامل API', enterpriseB5: 'خيارات العلامة البيضاء', enterpriseB6: 'فريق مخصص ٢٤/٧',
    // Notifications
    notif1Title: 'تم تعيين الفني', notif1Body: 'تم تعيين أحمد الغامدي لطلب شحن البطارية الخاص بك.',
    notif2Title: 'الفني في الطريق', notif2Body: 'أحمد على بعد ٨ دقائق من موقعك.',
    notif3Title: 'عرض خاص — خصم ٣٠٪!', notif3Body: 'احصل على خصم ٣٠٪ على خدمة شحن البطارية القادمة. صالح حتى ٣١ يوليو.',
    notif4Title: 'اكتملت الخدمة', notif4Body: 'اكتمل تغيير الإطار في ١٥ يوليو. قيّم تجربتك.',
    notif5Title: 'تجديد العضوية قريباً', notif5Body: 'تنتهي عضوية بريميوم خلال ١٤ يوماً. جدد الآن للحفاظ على مزاياك.',
    notif6Title: 'عرض جديد متاح', notif6Body: 'فحص مجاني للإطارات مع أي خدمة هذا الشهر. عرض لفترة محدودة.',
    notifAgo2: 'منذ دقيقتين', notifAgo5: 'منذ ٥ دقائق', notifAgo1h: 'منذ ساعة', notifDate15: '١٥ يوليو', notifDate12: '١٢ يوليو', notifDate10: '١٠ يوليو',
    // Request list
    reqBattery: 'شحن البطارية', reqTire: 'تغيير الإطار', reqFuel: 'توصيل الوقود', reqLockout: 'فتح السيارة',
    reqAddrFahd: 'طريق الملك فهد، الرياض', reqAddrOlaya: 'شارع العليا، الرياض', reqAddrPMBS: 'طريق الأمير محمد بن سلمان', reqAddrNakheel: 'حي النخيل، الرياض',
    reqTechAhmed: 'أحمد الغامدي', reqTechKhalid: 'خالد حسن', reqTechOmar: 'عمر الشهري',
    // GPS / live location
    locating: 'جارٍ تحديد موقعك…',
    tapToLocate: 'اضغط لتحديد موقعك',
    // Tracking
    shareEtaMsg: 'فني جاي في الطريق إليّ — الوصول خلال ٨ دقائق تقريبًا. المساعدة قادمة!',
    // Notifications
    markAllRead: 'تعليم الكل كمقروء',
    // Saved locations
    savedLocationsEmpty: 'لا توجد أماكن محفوظة بعد',
    savedLocationsHint: 'اختصارات المنزل والعمل قادمة قريبًا — حاليًا نستخدم موقعك المباشر عبر GPS.',
    // Invoices
    invoicesEmpty: 'لا توجد فواتير بعد',
    invoicesHint: 'ستظهر الإيصالات هنا بعد اكتمال كل خدمة.',
    // Rewards
    pointsBalance: 'رصيد النقاط',
    pointsWorth: 'كل ١٠٠ نقطة = خصم ١٠ ريال على خدمتك القادمة',
    howToEarn: 'كيف تكسب النقاط',
    earn1: 'أكمل طلب خدمة — ٥٠ نقطة',
    earn2: 'قيّم الفني — ١٠ نقاط',
    earn3: 'أحِل صديقًا — ٢٠٠ نقطة',
    // Referral
    yourReferralCode: 'رمز الإحالة الخاص بك',
    referralHint: 'شارك رمزك — تحصلان معًا على رصيد ٥٠ ريال بعد أول خدمة لصديقك.',
    shareCode: 'مشاركة الرمز',
    referralShareMsg: 'انضم إليّ في جاي للمساعدة على الطريق! استخدم رمز الإحالة الخاص بي',
    // FAQ
    faqQ1: 'كم يستغرق وصول الفني؟',
    faqA1: 'متوسط وقت الوصول ٨–١٥ دقيقة داخل المدن، حسب حركة المرور وتوفر الفنيين.',
    faqQ2: 'ما المدن التي تغطيها جاي؟',
    faqA2: 'نخدم حاليًا الرياض وجدة والدمام، ومدن أخرى قريبًا.',
    faqQ3: 'كيف أدفع مقابل الخدمة؟',
    faqA3: 'يمكنك الدفع عبر أبل باي أو مدى أو البطاقة الائتمانية أو نقدًا بعد اكتمال الخدمة.',
    faqQ4: 'ماذا تشمل العضوية؟',
    faqA4: 'تشمل العضويات طلبات خدمة مجانية وأولوية في الإرسال وخصومات حصرية. راجع تبويب العضوية للتفاصيل الكاملة.',
    // Safety tips
    safety1Title: 'توقف في مكان آمن',
    safety1Body: 'حرّك سيارتك إلى كتف الطريق أو مكان آمن بعيدًا عن حركة المرور قبل طلب المساعدة.',
    safety2Title: 'شغّل أضواء التحذير',
    safety2Body: 'أبقِ أضواء التحذير مضاءة ليتمكن السائقون والفني من رؤيتك بسهولة.',
    safety3Title: 'ابقَ داخل السيارة على الطرق السريعة',
    safety3Body: 'على الطرق السريعة، ابقَ داخل سيارتك مع ربط حزام الأمان حتى وصول الفني.',
    safety4Title: 'تحقق من هوية الفني',
    safety4Body: 'تأكد من اسم الفني وتقييمه في التطبيق قبل فتح النافذة أو الباب.',
    safety5Title: 'أبقِ الضروريات في سيارتك',
    safety5Body: 'يُنصح دائمًا بوجود ماء وشاحن جوال ومثلث عاكس في السيارة.',
    // Driver / technician app
    driverTabRequests: 'الطلبات',
    driverTabActive: 'النشط',
    driverTabEarnings: 'الأرباح',
    driverTabProfile: 'الملف الشخصي',
    driverOnline: 'متصل',
    driverOffline: 'غير متصل',
    driverToday: 'اليوم',
    driverThisWeek: 'هذا الأسبوع',
    driverThisMonth: 'هذا الشهر',
    driverTotalJobs: 'إجمالي المهام',
    driverEarnings: 'الأرباح',
    driverNoRequests: 'لا توجد طلبات قريبة',
    driverIncomingRequests: 'الطلبات الواردة',
    driverAccept: 'قبول',
    driverDecline: 'رفض',
    driverNavigate: 'التنقل',
    driverArrived: 'وصلت',
    driverStartWork: 'ابدأ العمل',
    driverComplete: 'إتمام',
    driverCancelJob: 'إلغاء المهمة',
    driverJobDetails: 'تفاصيل المهمة',
    driverVehicle: 'المركبة',
    driverDistance: 'المسافة',
    driverEta: 'وقت الوصول',
    driverPayout: 'المبلغ',
    driverAddress: 'العنوان',
    driverStatus: 'الحالة',
    driverStatusPending: 'معلق',
    driverStatusAccepted: 'مقبول',
    driverStatusEnRoute: 'في الطريق',
    driverStatusArrived: 'وصلت',
    driverStatusWorking: 'جارٍ العمل',
    driverStatusCompleted: 'مكتمل',
    driverStatusCancelled: 'ملغي',
    driverLogout: 'تسجيل الخروج',
    driverLanguage: 'اللغة',
    driverJobsDone: 'مهام منجزة',
    driverAvailability: 'حالة التوفر',
    driverActiveJob: 'المهمة النشطة',
    driverNoActiveJob: 'لا توجد مهمة نشطة',
    driverCall: 'اتصال',
    driverKm: 'كم',
    driverMin: 'دقيقة',
    driverSar: 'ريال',
    driverConfirmCancel: 'إلغاء هذه المهمة؟',
    driverUrgent: 'عاجل',
    driverStandard: 'عادي',
  },
} as const;

type TranslationKeys = keyof typeof translations.en;

interface FontMap {
  regular: string;
  medium: string;
  semibold: string;
  bold: string;
}

interface LanguageContextType {
  lang: Lang;
  isRTL: boolean;
  /** Translate a key. Accepts any string — returns the key itself if not found. */
  t: (key: string) => string;
  font: FontMap;
  toggleLanguage: () => Promise<void>;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const isRTL = lang === 'ar';

  const t = (key: string): string => {
    return (translations[lang] as Record<string, string>)[key] ?? key;
  };

  const font: FontMap = {
    regular: isRTL ? 'Cairo_400Regular' : 'Inter_400Regular',
    medium: isRTL ? 'Cairo_500Medium' : 'Inter_500Medium',
    semibold: isRTL ? 'Cairo_600SemiBold' : 'Inter_600SemiBold',
    bold: isRTL ? 'Cairo_700Bold' : 'Inter_700Bold',
  };

  const toggleLanguage = async () => {
    const newLang: Lang = lang === 'en' ? 'ar' : 'en';
    await AsyncStorage.setItem('jai_lang', newLang);
    I18nManager.forceRTL(newLang === 'ar');
    setLang(newLang);
    // Brief delay then reload for layout direction to take effect
    setTimeout(() => reloadAppAsync(), 300);
  };

  return (
    <LanguageContext.Provider value={{ lang, isRTL, t, font, toggleLanguage, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}

export type { TranslationKeys };
