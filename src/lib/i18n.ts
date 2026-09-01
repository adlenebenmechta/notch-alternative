"use client";

import { useState, useEffect, useCallback } from "react";

export type AppLocale = "en" | "ar" | "fr";

export const APP_LOCALES: { code: AppLocale; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "ar", label: "العربية", short: "ع" },
  { code: "fr", label: "Français", short: "FR" },
];

const STORAGE_KEY = "avatar-machine-locale";

/** Dictionary for the main menu, auth card, pricing and shared UI chrome. */
const DICT: Record<AppLocale, Record<string, string>> = {
  en: {
    "auth.welcomeBack": "Welcome Back",
    "auth.createAccount": "Create Account",
    "auth.name": "Full name",
    "auth.namePlaceholder": "John Doe",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.passwordPlaceholder": "Min. 6 characters",
    "auth.signIn": "Sign In",
    "auth.signUp": "Create Account",
    "auth.signingIn": "Signing in…",
    "auth.signOut": "Sign Out",
    "auth.google": "Continue with Google",

    "header.welcomeBackName": "Welcome back, {name}",
    "header.createVideos": "Create stunning AI videos",
    "header.subAuth": "Choose a tool below to start bringing your ideas to life",
    "header.subGuest": "Sign up to start creating AI-powered content with our suite of tools",
    "header.getStarted": "Get Started",
    "header.signUpToStart": "Sign Up to Start",

    "plan.free": "Free",
    "plan.pro": "Pro",
    "plan.enterprise": "Enterprise",
    "plan.getStarted": "Get Started",
    "plan.upgradeTo": "Upgrade to {name}",

    "menu.ai-avatar-machine.title": "AI Avatar Machine",
    "menu.ai-avatar-machine.subtitle": "Create AI-Powered Talking Videos",
    "menu.ai-avatar-machine.description": "Transform your scripts into stunning talking avatar videos with consistent characters across multiple scenes.",
    "menu.ai-viral-carousel.title": "AI Viral Carousel Machine",
    "menu.ai-viral-carousel.subtitle": "Create Viral Content",
    "menu.ai-viral-carousel.description": "Generate stunning viral carousels for Instagram, LinkedIn & more with AI-powered design and copy.",
    "menu.ai-podcast-machine.title": "AI Podcast Machine",
    "menu.ai-podcast-machine.subtitle": "Create Podcast Videos",
    "menu.ai-podcast-machine.description": "Generate AI-powered podcast videos with two characters, dialogue automation, and seamless video merging.",
    "menu.bof-videos-machine.title": "BOF Videos Machine",
    "menu.bof-videos-machine.subtitle": "Bulk Product Video Generator",
    "menu.bof-videos-machine.description": "Generate AI-powered TikTok Shop & product videos in bulk with overlays, voices, and batch processing.",
    "menu.claymotion-videos-machine.title": "Claymotion Videos Machine",
    "menu.claymotion-videos-machine.subtitle": "Linked Scene Video Creator",
    "menu.claymotion-videos-machine.description": "Create smooth claymation-style videos with linked scenes. Each scene flows into the next with AI-powered transitions.",
    "menu.allinone-machine.title": "All in One Machine",
    "menu.allinone-machine.subtitle": "Complete AI Video Suite",
    "menu.allinone-machine.description": "All AI tools in one place — generate videos, images, scripts, voiceovers, and more with a powerful suite of AI-powered tools.",
    "menu.autopublish-machine.title": "Auto-Publish Machine",
    "menu.autopublish-machine.subtitle": "Schedule & Publish to TikTok",
    "menu.autopublish-machine.description": "Auto-publish your AI videos to TikTok at the best times. Connect multiple accounts, schedule posts, and track analytics.",
    "menu.schedule-machine.title": "Schedule Machine",
    "menu.schedule-machine.subtitle": "AI Calendar & Smart Scheduling",
    "menu.schedule-machine.description": "Plan your whole TikTok calendar with drag-and-drop, best-time recommendations, and an AI bot that fills your schedule automatically.",

    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.allRights": "All rights reserved.",
    "lang.switch": "Language",
    "menu.notch-alternative.title": "Notch Alternative",
    "menu.notch-alternative.subtitle": "AI Ad Cloning Machine",
    "menu.notch-alternative.description": "Clone any winning video ad for your product: Reference X-Ray analysis, Brand Brain, script rewriting and AI scene generation — the complete Notch experience in Arabic, English & French.",
    "notchWindow.title": "Notch Alternative — AI Ad Cloning Machine",
    "notchWindow.openTab": "Open in new tab",
    "notchWindow.back": "Back to machines",
    "notchWindow.loading": "Loading the Notch Alternative platform…",
  },

  ar: {
    "auth.welcomeBack": "مرحباً بعودتك",
    "auth.createAccount": "إنشاء حساب",
    "auth.name": "الاسم الكامل",
    "auth.namePlaceholder": "محمد أحمد",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.passwordPlaceholder": "6 أحرف على الأقل",
    "auth.signIn": "تسجيل الدخول",
    "auth.signUp": "إنشاء حساب",
    "auth.signingIn": "جارٍ الدخول…",
    "auth.signOut": "تسجيل الخروج",
    "auth.google": "المتابعة عبر Google",

    "header.welcomeBackName": "مرحباً بعودتك، {name}",
    "header.createVideos": "اصنع فيديوهات ذكاء اصطناعي مذهلة",
    "header.subAuth": "اختر أداة من الأسفل لتبدأ تحويل أفكارك إلى واقع",
    "header.subGuest": "سجّل الآن لتبدأ إنشاء محتوى بالذكاء الاصطناعي مع منظومة أدواتنا الكاملة",
    "header.getStarted": "ابدأ الآن",
    "header.signUpToStart": "سجّل للبدء",

    "plan.free": "المجاني",
    "plan.pro": "الاحترافي",
    "plan.enterprise": "الشركات",
    "plan.getStarted": "ابدأ مجاناً",
    "plan.upgradeTo": "الترقية إلى {name}",

    "menu.ai-avatar-machine.title": "آلة الأفاتار الذكي",
    "menu.ai-avatar-machine.subtitle": "أنشئ فيديوهات متحدثة بالذكاء الاصطناعي",
    "menu.ai-avatar-machine.description": "حوّل نصوصك إلى فيديوهات أفاتار متحدثة مذهلة بشخصيات ثابتة عبر مشاهد متعددة.",
    "menu.ai-viral-carousel.title": "آلة الكاروسيل الفيروسي",
    "menu.ai-viral-carousel.subtitle": "اصنع محتوى فيروسي",
    "menu.ai-viral-carousel.description": "ولّد كاروسيلات فيروسية مذهلة لإنستغرام ولينكدإن وأكثر، بتصميم ونصوص مدعومة بالذكاء الاصطناعي.",
    "menu.ai-podcast-machine.title": "آلة البودكاست الذكية",
    "menu.ai-podcast-machine.subtitle": "أنشئ فيديوهات بودكاست",
    "menu.ai-podcast-machine.description": "ولّد فيديوهات بودكاست بالذكاء الاصطناعي بشخصيتين، وأتمتة حوارية، ودمج فيديو سلس.",
    "menu.bof-videos-machine.title": "آلة فيديوهات BOF",
    "menu.bof-videos-machine.subtitle": "توليد فيديوهات المنتجات بالجملة",
    "menu.bof-videos-machine.description": "ولّد فيديوهات منتجات وTikTok Shop بالجملة مع نصوص مدمجة وأصوات ومعالجة دفعات.",
    "menu.claymotion-videos-machine.title": "آلة فيديوهات كلاي موشن",
    "menu.claymotion-videos-machine.subtitle": "منشئ المشاهد المترابطة",
    "menu.claymotion-videos-machine.description": "أنشئ فيديوهات بأسلوب الصلصال السلس مع مشاهد مترابطة، كل مشهد ينساب للتالي بانتقالات ذكية.",
    "menu.allinone-machine.title": "آلة كل شيء في واحد",
    "menu.allinone-machine.subtitle": "منظومة الفيديو الذكية الكاملة",
    "menu.allinone-machine.description": "كل أدوات الذكاء الاصطناعي في مكان واحد — فيديوهات وصور ونصوص وتعليق صوتي والمزيد.",
    "menu.autopublish-machine.title": "آلة النشر التلقائي",
    "menu.autopublish-machine.subtitle": "جدولة ونشر على TikTok",
    "menu.autopublish-machine.description": "انشر فيديوهاتك تلقائياً على TikTok في أفضل الأوقات، اربط حسابات متعددة وتتبع التحليلات.",
    "menu.schedule-machine.title": "آلة الجدولة الذكية",
    "menu.schedule-machine.subtitle": "تقويم ذكي وجدولة بمساعدة AI",
    "menu.schedule-machine.description": "خطّط تقويم TikTok كاملاً بالسحب والإفلات، مع توصيات أفضل الأوقات وروبوت ذكي يملأ جدولك تلقائياً.",

    "footer.privacy": "سياسة الخصوصية",
    "footer.terms": "شروط الخدمة",
    "footer.allRights": "جميع الحقوق محفوظة.",
    "lang.switch": "اللغة",
    "menu.notch-alternative.title": "بديل Notch",
    "menu.notch-alternative.subtitle": "آلة استنساخ الإعلانات",
    "menu.notch-alternative.description": "استنسخ أي فيديو إعلاني ناجح لمنتجك: تحليل أشعة الفيديو، العقل العلامي، إعادة كتابة السكريبت وتوليد المشاهد بالذكاء الاصطناعي — تجربة Notch كاملة بالعربية والإنجليزية والفرنسية.",
    "notchWindow.title": "بديل Notch — آلة استنساخ الإعلانات",
    "notchWindow.openTab": "فتح في تبويب جديد",
    "notchWindow.back": "العودة للآلات",
    "notchWindow.loading": "جارٍ تحميل منصة بديل Notch…",
  },

  fr: {
    "auth.welcomeBack": "Bon retour",
    "auth.createAccount": "Créer un compte",
    "auth.name": "Nom complet",
    "auth.namePlaceholder": "Jean Dupont",
    "auth.email": "Adresse e-mail",
    "auth.password": "Mot de passe",
    "auth.passwordPlaceholder": "Min. 6 caractères",
    "auth.signIn": "Se connecter",
    "auth.signUp": "Créer un compte",
    "auth.signingIn": "Connexion…",
    "auth.signOut": "Se déconnecter",
    "auth.google": "Continuer avec Google",

    "header.welcomeBackName": "Bon retour, {name}",
    "header.createVideos": "Créez des vidéos IA époustouflantes",
    "header.subAuth": "Choisissez un outil ci-dessous pour donner vie à vos idées",
    "header.subGuest": "Inscrivez-vous pour créer du contenu IA avec notre suite d'outils",
    "header.getStarted": "Commencer",
    "header.signUpToStart": "S'inscrire pour commencer",

    "plan.free": "Gratuit",
    "plan.pro": "Pro",
    "plan.enterprise": "Entreprise",
    "plan.getStarted": "Commencer",
    "plan.upgradeTo": "Passer à {name}",

    "menu.ai-avatar-machine.title": "Machine Avatar IA",
    "menu.ai-avatar-machine.subtitle": "Créez des vidéos parlantes IA",
    "menu.ai-avatar-machine.description": "Transformez vos scripts en vidéos avatars parlantes époustouflantes avec des personnages cohérents.",
    "menu.ai-viral-carousel.title": "Machine Carrousel Viral IA",
    "menu.ai-viral-carousel.subtitle": "Créez du contenu viral",
    "menu.ai-viral-carousel.description": "Générez des carrousels viraux pour Instagram, LinkedIn et plus, avec design et textes IA.",
    "menu.ai-podcast-machine.title": "Machine Podcast IA",
    "menu.ai-podcast-machine.subtitle": "Créez des vidéos podcast",
    "menu.ai-podcast-machine.description": "Générez des vidéos podcast IA avec deux personnages, dialogues automatisés et fusion vidéo fluide.",
    "menu.bof-videos-machine.title": "Machine Vidéos BOF",
    "menu.bof-videos-machine.subtitle": "Générateur de vidéos produits en masse",
    "menu.bof-videos-machine.description": "Générez des vidéos produits TikTok Shop en masse avec overlays, voix et traitement par lots.",
    "menu.claymotion-videos-machine.title": "Machine Claymotion",
    "menu.claymotion-videos-machine.subtitle": "Créateur de scènes liées",
    "menu.claymotion-videos-machine.description": "Créez des vidéos style pâte à modeler avec scènes liées et transitions IA fluides.",
    "menu.allinone-machine.title": "Machine Tout-en-Un",
    "menu.allinone-machine.subtitle": "Suite vidéo IA complète",
    "menu.allinone-machine.description": "Tous les outils IA au même endroit — vidéos, images, scripts, voix off et plus encore.",
    "menu.autopublish-machine.title": "Machine Auto-Publication",
    "menu.autopublish-machine.subtitle": "Planifier et publier sur TikTok",
    "menu.autopublish-machine.description": "Publiez automatiquement vos vidéos sur TikTok aux meilleurs moments, comptes multiples et analyses.",
    "menu.schedule-machine.title": "Machine Planification",
    "menu.schedule-machine.subtitle": "Calendrier IA et planification intelligente",
    "menu.schedule-machine.description": "Planifiez tout votre calendrier TikTok en glisser-déposer avec recommandations IA.",

    "footer.privacy": "Politique de confidentialité",
    "footer.terms": "Conditions d'utilisation",
    "footer.allRights": "Tous droits réservés.",
    "lang.switch": "Langue",
    "menu.notch-alternative.title": "Alternative Notch",
    "menu.notch-alternative.subtitle": "Machine de clonage publicitaire",
    "menu.notch-alternative.description": "Clonez n'importe quelle pub gagnante pour votre produit : analyse X-Ray, Cerveau de Marque, réécriture de script et génération de scènes IA — l'expérience Notch complète en arabe, anglais et français.",
    "notchWindow.title": "Alternative Notch — Machine de clonage publicitaire",
    "notchWindow.openTab": "Ouvrir dans un onglet",
    "notchWindow.back": "Retour aux machines",
    "notchWindow.loading": "Chargement de la plateforme Alternative Notch…",
  },
};

export function isRtl(locale: AppLocale): boolean {
  return locale === "ar";
}

/** Lightweight hook — no provider needed, keeps the app structure untouched. */
export function useAppLang() {
  const [locale, setLocaleState] = useState<AppLocale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as AppLocale | null;
      if (saved && ["en", "ar", "fr"].includes(saved)) setLocaleState(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>) => {
      let str = DICT[locale]?.[key] ?? DICT.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, v);
        }
      }
      return str;
    },
    [locale]
  );

  return { locale, setLocale, t, rtl: isRtl(locale) };
}

export type TFunc = ReturnType<typeof useAppLang>["t"];
