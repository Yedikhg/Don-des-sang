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
      hackathon: 'Hackathon GNEC 2026 — ODD 3',
      hero_title: 'Chaque goutte compte. Sauvez une vie aujourd\'hui.',
      hero_subtitle: 'Urgence-Sang connecte instantanément les donneurs de sang avec les hôpitaux en situation d\'urgence grâce à une IA intelligente.',
      become_donor: 'Devenir Donneur',
      hospital_access: 'Accès Hôpital',
      verified_hospitals: 'Hôpitaux vérifiés',
      realtime_matching: 'Matching en temps réel',
      measurable_impact: 'Impact mesurable',
      scroll: 'Scroll',
      stats: {
        lives_saved: 'Vies sauvées',
        partner_hospitals: 'Hôpitaux partenaires',
        active_donors: 'Donneurs actifs',
        avg_response_time: 'Temps de réponse moyen'
      },
      how_it_works: {
        process: 'Processus',
        how_it_works_title: 'COMMENT<br />ÇA MARCHE',
        description: 'De l\'alerte critique au don effectif, un processus optimisé par l\'IA en moins de 15 minutes.',
        steps: [
          {
            title: "L'hôpital lance l'alerte",
            desc: "L'établissement crée une alerte urgente avec groupe sanguin requis, quantité, et une vidéo de motivation."
          },
          {
            title: "L'IA trouve les donneurs",
            desc: "Notre algorithme identifie les donneurs compatibles dans un rayon de 5 km en temps réel."
          },
          {
            title: "Le donneur sauve une vie",
            desc: "Notification push urgente. Acceptation en un clic. Guidage GPS vers l'hôpital."
          }
        ]
      },
      odd3: {
        subtitle: 'Nations Unies · Agenda 2030',
        title: 'BONNE SANTÉ<br />ET BIEN-ÊTRE',
        description: "Urgence-Sang contribue directement à l'ODD 3 en réduisant la mortalité évitable, en renforçant les systèmes de santé locaux et en rendant l'accès aux soins plus équitable en Afrique.",
        points: [
          'Réduire la mortalité évitable',
          'Renforcer les capacités locales',
          'Accès équitable aux soins',
          'Innovation au service de la santé'
        ]
      },
      features: {
        subtitle: 'Fonctionnalités',
        title: 'LA TECHNOLOGIE<br />AU SERVICE<br />DE L\'URGENCE',
        items: [
          { title: 'Hôpitaux vérifiés', desc: "Chaque établissement est validé via licence médicale officielle. Zéro fraude possible." },
          { title: 'IA de matching', desc: "Compatibilité sanguine et géolocalisation en temps réel pour des connexions ultra-rapides." },
          { title: 'Vidéo de motivation', desc: "Les hôpitaux partagent une courte vidéo pour humaniser l'appel et booster les réponses." },
          { title: 'GPS intégré', desc: "Itinéraire en temps réel pour que le donneur arrive le plus vite possible." },
          { title: 'Gamification', desc: "Trophées, badges et classements pour récompenser les héros les plus engagés." },
          { title: 'Vérification santé', desc: "L'IA valide l'aptitude du donneur via 5 questions rapides avant chaque déplacement." }
        ]
      },
      testimonials: {
        subtitle: 'Témoignages',
        items: [
          {
            quote: "En 8 minutes, nous avions un donneur O− devant nos portes. Urgence-Sang a sauvé la vie de notre patient ce soir-là.",
            author: "Dr. Amira Khalil",
            role: "Directrice médicale, CHU Casablanca"
          },
          {
            quote: "J'ai reçu la notification, j'ai vu la vidéo de la famille qui appelait à l'aide. Je n'ai pas hésité une seconde.",
            author: "Youssef Mansouri",
            role: "Donneur certifié — 7 dons effectués"
          },
          {
            quote: "La vérification des documents est rassurante. On sait que chaque alerte est réelle et que la plateforme est sérieuse.",
            author: "Fatima Benali",
            role: "Infirmière coordinatrice, Clinique Atlas"
          }
        ]
      },
      cta: {
        subtitle: 'Rejoindre le réseau',
        title: 'PRÊT À SAUVER',
        title_2: 'DES VIES ?',
        become_donor: 'Je deviens donneur',
        register_hospital: 'Enregistrer mon hôpital'
      },
      footer: {
        copyright: '© 2026 Urgence-Sang — Projet GNEC 2026 · ODD 3 · Fait pour sauver des vies',
        privacy: 'Confidentialité',
        terms: 'CGU',
        contact: 'Contact'
      }
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
      hackathon: 'Hackathon GNEC 2026 — SDG 3',
      hero_title: 'Every drop counts. Save a life today.',
      hero_subtitle: 'Urgence-Sang instantly connects blood donors with hospitals in emergency situations using smart AI.',
      become_donor: 'Become a Donor',
      hospital_access: 'Hospital Access',
      verified_hospitals: 'Verified Hospitals',
      realtime_matching: 'Real-time Matching',
      measurable_impact: 'Measurable Impact',
      scroll: 'Scroll',
      stats: {
        lives_saved: 'Lives saved',
        partner_hospitals: 'Partner hospitals',
        active_donors: 'Active donors',
        avg_response_time: 'Avg response time'
      },
      how_it_works: {
        process: 'Process',
        how_it_works_title: 'HOW IT<br />WORKS',
        description: 'From critical alert to successful donation, an AI-optimized process in less than 15 minutes.',
        steps: [
          {
            title: 'Hospital sends alert',
            desc: 'The facility creates an urgent alert with required blood type, quantity, and a motivational video.'
          },
          {
            title: 'AI finds donors',
            desc: 'Our algorithm identifies compatible donors within a 5 km radius in real time.'
          },
          {
            title: 'Donor saves a life',
            desc: 'Urgent push notification. One-click acceptance. GPS guidance to the hospital.'
          }
        ]
      },
      odd3: {
        subtitle: 'United Nations · 2030 Agenda',
        title: 'GOOD HEALTH<br />AND WELL-BEING',
        description: 'Urgence-Sang directly contributes to SDG 3 by reducing preventable mortality, strengthening local health systems, and making healthcare access more equitable in Africa.',
        points: [
          'Reduce preventable mortality',
          'Strengthen local capacities',
          'Equitable access to care',
          'Innovation for health'
        ]
      },
      features: {
        subtitle: 'Features',
        title: 'TECHNOLOGY AT<br />THE SERVICE<br />OF EMERGENCY',
        items: [
          { title: 'Verified hospitals', desc: 'Each facility is validated via official medical license. Zero fraud possible.' },
          { title: 'Matching AI', desc: 'Blood compatibility and real-time geolocation for ultra-fast connections.' },
          { title: 'Motivational video', desc: 'Hospitals share a short video to humanize the call and boost responses.' },
          { title: 'Integrated GPS', desc: 'Real-time directions so the donor arrives as quickly as possible.' },
          { title: 'Gamification', desc: 'Trophies, badges, and leaderboards to reward the most engaged heroes.' },
          { title: 'Health verification', desc: 'AI validates donor eligibility via 5 quick questions before each trip.' }
        ]
      },
      testimonials: {
        subtitle: 'Testimonials',
        items: [
          {
            quote: 'In 8 minutes, we had an O− donor at our door. Urgence-Sang saved our patient\'s life that night.',
            author: 'Dr. Amira Khalil',
            role: 'Medical Director, CHU Casablanca'
          },
          {
            quote: 'I got the notification, saw the video of the family calling for help. I didn\'t hesitate for a second.',
            author: 'Youssef Mansouri',
            role: 'Certified donor — 7 donations made'
          },
          {
            quote: 'The document verification is reassuring. We know every alert is real and the platform is serious.',
            author: 'Fatima Benali',
            role: 'Coordinator Nurse, Atlas Clinic'
          }
        ]
      },
      cta: {
        subtitle: 'Join the network',
        title: 'READY TO SAVE',
        title_2: 'LIVES?',
        become_donor: 'I become a donor',
        register_hospital: 'Register my hospital'
      },
      footer: {
        copyright: '© 2026 Urgence-Sang — GNEC 2026 Project · SDG 3 · Made to save lives',
        privacy: 'Privacy',
        terms: 'Terms',
        contact: 'Contact'
      }
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
      hackathon: 'هاكاثون GNEC 2026 — ODD 3',
      hero_title: 'كل قطرة تهم. أنقذ حياة اليوم.',
      hero_subtitle: 'يقوم Urgence-Sang بربط متبرعي الدم فورًا بالمستشفيات في حالات الطوارئ باستخدام الذكاء الاصطناعي.',
      become_donor: 'كن متبرعاً',
      hospital_access: 'دخول المستشفى',
      verified_hospitals: 'مستشفيات موثقة',
      realtime_matching: 'تطابق في الوقت الحقيقي',
      measurable_impact: 'تأثير قابل للقياس',
      scroll: 'تمرير',
      stats: {
        lives_saved: 'أرواح أنقذت',
        partner_hospitals: 'مستشفيات شريكة',
        active_donors: 'متبرعون نشطون',
        avg_response_time: 'متوسط وقت الاستجابة'
      },
      how_it_works: {
        process: 'العملية',
        how_it_works_title: 'كيف<br />تعمل',
        description: 'من التنبيه الحرج إلى التبرع الناجح، عملية محسنة بالذكاء الاصطناعي في أقل من 15 دقيقة.',
        steps: [
          {
            title: 'المستشفى يرسل التنبيه',
            desc: 'يقوم المنشأة بإنشاء تنبيه عاجل مع فصيلة الدم المطلوبة والكمية وفيديو تحفيزي.'
          },
          {
            title: 'الذكاء الاصطناعي يجد المتبرعين',
            desc: 'تحدد خوارزميتنا المتبرعين المتوافقين في نصف قطر 5 كيلومترات في الوقت الحقيقي.'
          },
          {
            title: 'المتبرع ينقذ حياة',
            desc: 'إشعار دفع عاجل. قبول بنقرة واحدة. توجيه GPS إلى المستشفى.'
          }
        ]
      },
      odd3: {
        subtitle: 'الأمم المتحدة · أجندة 2030',
        title: 'صحة جيدة<br />وفرح',
        description: 'يساهم Urgence-Sang مباشرة في الهدف 3 من أهداف التنمية المستدامة من خلال تقليل الوفيات القابلة للوقاية، وتعزيز الأنظمة الصحية المحلية، وجعل الوصول إلى الرعاية الصحية أكثر إنصافًا في إفريقيا.',
        points: [
          'تقليل الوفيات القابلة للوقاية',
          'تعزيز القدرات المحلية',
          'وصول عادل إلى الرعاية',
          'ابتكار لخدمة الصحة'
        ]
      },
      features: {
        subtitle: 'الميزات',
        title: 'التكنولوجيا في<br />خدمة<br />الطوارئ',
        items: [
          { title: 'مستشفيات موثقة', desc: 'يتم التحقق من كل منشأة عبر ترخيص طبي رسمي. لا احتمال للاحتيال.' },
          { title: 'ذكاء اصطناعي للتطابق', desc: 'توافق فصيلة الدم وتحديد الموقع الجغرافي في الوقت الحقيقي لاتصالات فائقة السرعة.' },
          { title: 'فيديو تحفيزي', desc: 'تشارك المستشفيات فيديو قصير لإضفاء طابع إنساني على النداء وزيادة الاستجابات.' },
          { title: 'GPS متكامل', desc: 'اتجاهات في الوقت الحقيقي حتى يصل المتبرع في أسرع وقت ممكن.' },
          { title: 'اللعبة', desc: 'كؤوس وشارات وتصنيفات لتكريم الأبطال الأكثر تفاعلاً.' },
          { title: 'التحقق الصحي', desc: 'يُتحقق الذكاء الاصطناعي من أهلية المتبرع عبر 5 أسئلة سريعة قبل كل رحلة.' }
        ]
      },
      testimonials: {
        subtitle: 'الشهادات',
        items: [
          {
            quote: 'في 8 دقائق، كان لدينا متبرع O− عند بابنا. أنقذ Urgence-Sang حياة مريضنا تلك الليلة.',
            author: 'د. أميرة خليل',
            role: 'مديرة طبية، مستشفى جامعة الدار البيضاء'
          },
          {
            quote: 'تلقيت الإشعار، رأيت الفيديو للعائلة التي تطلب المساعدة. لم أتردد لحظة.',
            author: 'يوسف المنصوري',
            role: 'متبرع معتمد — 7 تبرعات'
          },
          {
            quote: 'التحقق من المستندات مطمئن. نعلم أن كل تنبيه حقيقي وأن المنصة جادة.',
            author: 'فاطمة بن علي',
            role: 'ممرضة منسقة، عيادة أطلس'
          }
        ]
      },
      cta: {
        subtitle: 'انضم إلى الشبكة',
        title: 'جاهز لإنقاذ',
        title_2: 'أرواح؟',
        become_donor: 'أنا أصبح متبرعاً',
        register_hospital: 'تسجيل مستشفى'
      },
      footer: {
        copyright: '© 2026 Urgence-Sang — مشروع GNEC 2026 · ODD 3 · صنع لإنقاذ الأرواح',
        privacy: 'الخصوصية',
        terms: 'الشروط',
        contact: 'اتصل بنا'
      }
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
