import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// French translations
const fr = {
  translation: {
    navbar: {
      how_it_works: 'Comment ça marche',
      impact: 'Impact',
      login: 'Connexion',
      logout: 'Déconnexion',
      dashboard: 'Dashboard',
      language: 'FR'
    },
    landing: {
      hero_title: 'Chaque goutte compte. Sauvez une vie aujourd\'hui.',
      hero_subtitle: 'Urgence-Sang connecte instantanément les donneurs de sang avec les hôpitaux en situation d\'urgence grâce à une IA intelligente.',
      become_donor: 'Devenir Donneur',
      hospital_access: 'Accès Hôpital'
    }
  }
};

// English translations
const en = {
  translation: {
    navbar: {
      how_it_works: 'How it works',
      impact: 'Impact',
      login: 'Login',
      logout: 'Logout',
      dashboard: 'Dashboard',
      language: 'EN'
    },
    landing: {
      hero_title: 'Every drop counts. Save a life today.',
      hero_subtitle: 'Urgence-Sang instantly connects blood donors with hospitals in emergency situations using smart AI.',
      become_donor: 'Become a Donor',
      hospital_access: 'Hospital Access'
    }
  }
};

// Arabic translations (for Morocco focus)
const ar = {
  translation: {
    navbar: {
      how_it_works: 'كيف تعمل',
      impact: 'تأثير',
      login: 'تسجيل الدخول',
      logout: 'تسجيل خروج',
      dashboard: 'لوحة القيادة',
      language: 'عربي'
    },
    landing: {
      hero_title: 'كل قطرة تهم. أنقذ حياة اليوم.',
      hero_subtitle: 'يقوم Urgence-Sang بربط متبرعي الدم فورًا بالمستشفيات في حالات الطوارئ باستخدام الذكاء الاصطناعي.',
      become_donor: 'كن متبرعاً',
      hospital_access: 'دخول المستشفى'
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr,
      en,
      ar
    },
    lng: 'fr', // default language
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

export default i18n;