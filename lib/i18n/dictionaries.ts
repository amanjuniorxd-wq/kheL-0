import type { Locale } from "./config";

export type Dictionary = {
  nav: {
    dashboard: string;
    requestSupport: string;
    account: string;
    admin: string;
    signIn: string;
    signUp: string;
  };
  home: {
    subtitle: string;
    viewRequests: string;
    requestSupport: string;
  };
};

export const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      dashboard: "Dashboard",
      requestSupport: "Request support",
      account: "Account",
      admin: "Admin",
      signIn: "Sign in",
      signUp: "Sign up",
    },
    home: {
      subtitle:
        "A community redistribution pool. Request support when you need it, contribute when you can — every request and allocation is logged to a public, tamper-evident ledger.",
      viewRequests: "View active requests",
      requestSupport: "Request support",
    },
  },
  hi: {
    nav: {
      dashboard: "डैशबोर्ड",
      requestSupport: "सहायता माँगें",
      account: "खाता",
      admin: "एडमिन",
      signIn: "साइन इन करें",
      signUp: "साइन अप करें",
    },
    home: {
      subtitle:
        "एक सामुदायिक पुनर्वितरण कोष। जब आपको ज़रूरत हो सहायता माँगें, जब सक्षम हों योगदान दें — हर अनुरोध और आवंटन एक सार्वजनिक, छेड़छाड़-रोधी लेजर में दर्ज होता है।",
      viewRequests: "सक्रिय अनुरोध देखें",
      requestSupport: "सहायता माँगें",
    },
  },
  bn: {
    nav: {
      dashboard: "ড্যাশবোর্ড",
      requestSupport: "সহায়তা অনুরোধ করুন",
      account: "অ্যাকাউন্ট",
      admin: "অ্যাডমিন",
      signIn: "সাইন ইন করুন",
      signUp: "সাইন আপ করুন",
    },
    home: {
      subtitle:
        "একটি সম্প্রদায় পুনর্বণ্টন তহবিল। প্রয়োজনে সহায়তার জন্য অনুরোধ করুন, সক্ষম হলে অবদান রাখুন — প্রতিটি অনুরোধ ও বরাদ্দ একটি সর্বজনীন, পরিবর্তন-প্রতিরোধী লেজারে লিপিবদ্ধ হয়।",
      viewRequests: "সক্রিয় অনুরোধগুলি দেখুন",
      requestSupport: "সহায়তা অনুরোধ করুন",
    },
  },
  ta: {
    nav: {
      dashboard: "டாஷ்போர்டு",
      requestSupport: "உதவி கோருங்கள்",
      account: "கணக்கு",
      admin: "நிர்வாகி",
      signIn: "உள்நுழையவும்",
      signUp: "பதிவு செய்யவும்",
    },
    home: {
      subtitle:
        "ஒரு சமூக மறுபகிர்வு நிதி. தேவைப்படும்போது உதவி கோருங்கள், முடிந்தபோது பங்களியுங்கள் — ஒவ்வொரு கோரிக்கையும் ஒதுக்கீடும் பொது, மாற்ற முடியாத லெட்ஜரில் பதிவு செய்யப்படுகிறது.",
      viewRequests: "செயலில் உள்ள கோரிக்கைகளைக் காண்க",
      requestSupport: "உதவி கோருங்கள்",
    },
  },
  te: {
    nav: {
      dashboard: "డాష్‌బోర్డ్",
      requestSupport: "సహాయం అభ్యర్థించండి",
      account: "ఖాతా",
      admin: "అడ్మిన్",
      signIn: "సైన్ ఇన్ చేయండి",
      signUp: "సైన్ అప్ చేయండి",
    },
    home: {
      subtitle:
        "ఒక సామాజిక పునఃపంపిణీ నిధి. అవసరమైనప్పుడు సహాయం అభ్యర్థించండి, వీలైనప్పుడు సహకరించండి — ప్రతి అభ్యర్థన మరియు కేటాయింపు బహిరంగ, మార్పు చేయలేని లెడ్జర్‌లో నమోదవుతుంది.",
      viewRequests: "క్రియాశీల అభ్యర్థనలను చూడండి",
      requestSupport: "సహాయం అభ్యర్థించండి",
    },
  },
  mr: {
    nav: {
      dashboard: "डॅशबोर्ड",
      requestSupport: "मदत मागा",
      account: "खाते",
      admin: "प्रशासक",
      signIn: "साइन इन करा",
      signUp: "साइन अप करा",
    },
    home: {
      subtitle:
        "एक सामुदायिक पुनर्वितरण निधी. गरज असेल तेव्हा मदत मागा, शक्य असेल तेव्हा योगदान द्या — प्रत्येक विनंती आणि वाटप सार्वजनिक, छेडछाड-प्रतिरोधक लेजरमध्ये नोंदवले जाते.",
      viewRequests: "सक्रिय विनंत्या पहा",
      requestSupport: "मदत मागा",
    },
  },
  gu: {
    nav: {
      dashboard: "ડેશબોર્ડ",
      requestSupport: "સહાય માટે વિનંતી કરો",
      account: "ખાતું",
      admin: "એડમિન",
      signIn: "સાઇન ઇન કરો",
      signUp: "સાઇન અપ કરો",
    },
    home: {
      subtitle:
        "એક સામુદાયિક પુનર્વિતરણ ભંડોળ. જ્યારે જરૂર હોય ત્યારે સહાય માટે વિનંતી કરો, જ્યારે શક્ય હોય ત્યારે યોગદાન આપો — દરેક વિનંતી અને ફાળવણી જાહેર, છેડછાડ-પ્રતિરોધક ચોપડામાં નોંધાય છે.",
      viewRequests: "સક્રિય વિનંતીઓ જુઓ",
      requestSupport: "સહાય માટે વિનંતી કરો",
    },
  },
  kn: {
    nav: {
      dashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
      requestSupport: "ಸಹಾಯ ಕೋರಿ",
      account: "ಖಾತೆ",
      admin: "ನಿರ್ವಾಹಕ",
      signIn: "ಸೈನ್ ಇನ್ ಮಾಡಿ",
      signUp: "ಸೈನ್ ಅಪ್ ಮಾಡಿ",
    },
    home: {
      subtitle:
        "ಒಂದು ಸಮುದಾಯ ಮರುಹಂಚಿಕೆ ನಿಧಿ. ಅಗತ್ಯವಿದ್ದಾಗ ಸಹಾಯ ಕೋರಿ, ಸಾಧ್ಯವಾದಾಗ ಕೊಡುಗೆ ನೀಡಿ — ಪ್ರತಿ ವಿನಂತಿ ಮತ್ತು ಹಂಚಿಕೆ ಸಾರ್ವಜನಿಕ, ಬದಲಾವಣೆ-ನಿರೋಧಕ ಲೆಡ್ಜರ್‌ನಲ್ಲಿ ದಾಖಲಾಗುತ್ತದೆ.",
      viewRequests: "ಸಕ್ರಿಯ ವಿನಂತಿಗಳನ್ನು ವೀಕ್ಷಿಸಿ",
      requestSupport: "ಸಹಾಯ ಕೋರಿ",
    },
  },
  ml: {
    nav: {
      dashboard: "ഡാഷ്ബോർഡ്",
      requestSupport: "സഹായം അഭ്യർത്ഥിക്കുക",
      account: "അക്കൗണ്ട്",
      admin: "അഡ്മിൻ",
      signIn: "സൈൻ ഇൻ ചെയ്യുക",
      signUp: "സൈൻ അപ്പ് ചെയ്യുക",
    },
    home: {
      subtitle:
        "ഒരു കമ്മ്യൂണിറ്റി പുനർവിതരണ ഫണ്ട്. ആവശ്യമുള്ളപ്പോൾ സഹായം അഭ്യർത്ഥിക്കുക, കഴിയുമ്പോൾ സംഭാവന ചെയ്യുക — ഓരോ അഭ്യർത്ഥനയും വിഹിതവും പൊതു, മാറ്റം കണ്ടെത്താവുന്ന ലെഡ്ജറിൽ രേഖപ്പെടുത്തുന്നു.",
      viewRequests: "സജീവ അഭ്യർത്ഥനകൾ കാണുക",
      requestSupport: "സഹായം അഭ്യർത്ഥിക്കുക",
    },
  },
  pa: {
    nav: {
      dashboard: "ਡੈਸ਼ਬੋਰਡ",
      requestSupport: "ਮਦਦ ਲਈ ਬੇਨਤੀ ਕਰੋ",
      account: "ਖਾਤਾ",
      admin: "ਐਡਮਿਨ",
      signIn: "ਸਾਈਨ ਇਨ ਕਰੋ",
      signUp: "ਸਾਈਨ ਅੱਪ ਕਰੋ",
    },
    home: {
      subtitle:
        "ਇੱਕ ਕਮਿਊਨਿਟੀ ਪੁਨਰ-ਵੰਡ ਫੰਡ। ਲੋੜ ਪੈਣ 'ਤੇ ਮਦਦ ਲਈ ਬੇਨਤੀ ਕਰੋ, ਸਮਰੱਥ ਹੋਣ 'ਤੇ ਯੋਗਦਾਨ ਪਾਓ — ਹਰ ਬੇਨਤੀ ਅਤੇ ਵੰਡ ਇੱਕ ਜਨਤਕ, ਛੇੜਛਾੜ-ਰੋਧਕ ਲੈਜਰ ਵਿੱਚ ਦਰਜ ਹੁੰਦੀ ਹੈ।",
      viewRequests: "ਸਰਗਰਮ ਬੇਨਤੀਆਂ ਵੇਖੋ",
      requestSupport: "ਮਦਦ ਲਈ ਬੇਨਤੀ ਕਰੋ",
    },
  },
  ur: {
    nav: {
      dashboard: "ڈیش بورڈ",
      requestSupport: "مدد کی درخواست کریں",
      account: "اکاؤنٹ",
      admin: "ایڈمن",
      signIn: "سائن ان کریں",
      signUp: "سائن اپ کریں",
    },
    home: {
      subtitle:
        "ایک کمیونٹی از سرِ نو تقسیم فنڈ۔ ضرورت پڑنے پر مدد کی درخواست کریں، جب استطاعت ہو تعاون کریں — ہر درخواست اور تقسیم ایک عوامی، چھیڑ چھاڑ سے محفوظ لیجر میں درج ہوتی ہے۔",
      viewRequests: "فعال درخواستیں دیکھیں",
      requestSupport: "مدد کی درخواست کریں",
    },
  },
  es: {
    nav: {
      dashboard: "Panel",
      requestSupport: "Solicitar ayuda",
      account: "Cuenta",
      admin: "Administrador",
      signIn: "Iniciar sesión",
      signUp: "Registrarse",
    },
    home: {
      subtitle:
        "Un fondo comunitario de redistribución. Solicita ayuda cuando la necesites, contribuye cuando puedas — cada solicitud y asignación queda registrada en un libro mayor público a prueba de manipulaciones.",
      viewRequests: "Ver solicitudes activas",
      requestSupport: "Solicitar ayuda",
    },
  },
  fr: {
    nav: {
      dashboard: "Tableau de bord",
      requestSupport: "Demander de l'aide",
      account: "Compte",
      admin: "Administrateur",
      signIn: "Se connecter",
      signUp: "S'inscrire",
    },
    home: {
      subtitle:
        "Un fonds communautaire de redistribution. Demandez de l'aide quand vous en avez besoin, contribuez quand vous le pouvez — chaque demande et allocation est enregistrée dans un registre public infalsifiable.",
      viewRequests: "Voir les demandes actives",
      requestSupport: "Demander de l'aide",
    },
  },
  ar: {
    nav: {
      dashboard: "لوحة التحكم",
      requestSupport: "طلب الدعم",
      account: "الحساب",
      admin: "المسؤول",
      signIn: "تسجيل الدخول",
      signUp: "إنشاء حساب",
    },
    home: {
      subtitle:
        "صندوق مجتمعي لإعادة التوزيع. اطلب الدعم عند الحاجة، وساهم عندما تستطيع — يتم تسجيل كل طلب وتخصيص في سجل عام مقاوم للتلاعب.",
      viewRequests: "عرض الطلبات النشطة",
      requestSupport: "طلب الدعم",
    },
  },
  zh: {
    nav: {
      dashboard: "仪表盘",
      requestSupport: "申请支持",
      account: "账户",
      admin: "管理员",
      signIn: "登录",
      signUp: "注册",
    },
    home: {
      subtitle:
        "一个社区再分配基金。有需要时申请支持，力所能及时进行捐助——每一笔申请与分配都会记录在公开、防篡改的账本中。",
      viewRequests: "查看当前申请",
      requestSupport: "申请支持",
    },
  },
  pt: {
    nav: {
      dashboard: "Painel",
      requestSupport: "Solicitar apoio",
      account: "Conta",
      admin: "Administrador",
      signIn: "Entrar",
      signUp: "Cadastrar-se",
    },
    home: {
      subtitle:
        "Um fundo comunitário de redistribuição. Solicite apoio quando precisar, contribua quando puder — cada solicitação e alocação é registrada em um livro-razão público à prova de adulteração.",
      viewRequests: "Ver solicitações ativas",
      requestSupport: "Solicitar apoio",
    },
  },
  ru: {
    nav: {
      dashboard: "Панель управления",
      requestSupport: "Запросить помощь",
      account: "Аккаунт",
      admin: "Администратор",
      signIn: "Войти",
      signUp: "Зарегистрироваться",
    },
    home: {
      subtitle:
        "Фонд перераспределения сообщества. Запрашивайте помощь, когда она нужна, вносите вклад, когда можете — каждый запрос и распределение фиксируются в публичном, защищённом от подделки реестре.",
      viewRequests: "Посмотреть активные запросы",
      requestSupport: "Запросить помощь",
    },
  },
  ja: {
    nav: {
      dashboard: "ダッシュボード",
      requestSupport: "支援を申請",
      account: "アカウント",
      admin: "管理者",
      signIn: "サインイン",
      signUp: "サインアップ",
    },
    home: {
      subtitle:
        "コミュニティ再分配プール。必要なときに支援を申請し、できるときに貢献してください——すべての申請と割り当ては、公開された改ざん防止台帳に記録されます。",
      viewRequests: "アクティブな申請を見る",
      requestSupport: "支援を申請",
    },
  },
  de: {
    nav: {
      dashboard: "Dashboard",
      requestSupport: "Unterstützung anfordern",
      account: "Konto",
      admin: "Admin",
      signIn: "Anmelden",
      signUp: "Registrieren",
    },
    home: {
      subtitle:
        "Ein gemeinschaftlicher Umverteilungsfonds. Fordere Unterstützung an, wenn du sie brauchst, trage bei, wenn du kannst — jede Anfrage und Zuteilung wird in einem öffentlichen, manipulationssicheren Hauptbuch erfasst.",
      viewRequests: "Aktive Anfragen ansehen",
      requestSupport: "Unterstützung anfordern",
    },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
