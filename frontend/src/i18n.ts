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
    },
    login: {
      title: 'Se connecter',
      subtitle: 'Accédez à votre espace personnel',
      email: 'Email',
      email_placeholder: 'votre@email.com',
      password: 'Mot de passe',
      password_placeholder: 'Votre mot de passe',
      login: 'Se connecter',
      logging_in: 'Connexion...',
      no_account: 'Pas encore de compte ?',
      donor: 'Donneur',
      hospital: 'Hôpital',
      fill_all_fields: 'Veuillez remplir tous les champs',
      welcome_back: 'Bienvenue,',
      invalid_credentials: 'Email ou mot de passe incorrect'
    },
    donor_registration: {
      title: 'Devenir Donneur',
      subtitle: 'Créez votre profil héros en 3 étapes',
      steps: {
        profile: 'Profil',
        blood_type: 'Groupe sanguin',
        location: 'Localisation'
      },
      step1: {
        title: 'Votre profil',
        subtitle: 'Informations personnelles de base',
        first_name: 'Prénom',
        first_name_placeholder: 'Ahmed',
        last_name: 'Nom',
        last_name_placeholder: 'Benali',
        email: 'Email',
        email_placeholder: 'ahmed@email.com',
        password: 'Mot de passe',
        password_placeholder: 'Minimum 8 caractères',
        phone: 'Téléphone',
        phone_placeholder: '+212 6XX XX XX XX',
        age: 'Âge',
        age_placeholder: '25',
        age_note: 'Le don de sang est autorisé entre 18 et 70 ans'
      },
      step2: {
        title: 'Votre groupe sanguin',
        subtitle: 'Sélectionnez votre groupe dans la grille ci-dessous',
        dont_know_blood_type: 'Je ne connais pas mon groupe sanguin — Obtenir de l\\'aide',
        compatibility: 'Compatible avec :'
      },
      step3: {
        title: 'Votre localisation',
        subtitle: 'Pour que l\\'IA puisse vous matcher avec les hôpitaux proches de chez vous',
        locate_me: 'Me localiser maintenant',
        locating: 'Localisation en cours...',
        location_saved: 'Position enregistrée ✓',
        privacy_note: '🔒 Votre position n\\'est partagée avec les hôpitaux qu\\'en cas d\\'alerte active. Elle est chiffrée et supprimée après chaque session.',
        or: 'ou',
        manual_location: 'Définir ma position manuellement',
        manual_location_set: 'Position définie sur Casablanca'
      },
      chat: {
        title: 'Assistant IA — Urgence-Sang',
        subtitle: 'Conseiller en santé',
        greeting: 'Bonjour ! Je suis l\\'assistant IA d\\'Urgence-Sang. Pour vérifier votre aptitude au don, pouvez-vous vous déplacer maintenant ?',
        unavailable: 'Je n\\'ai pas pu analyser votre réponse.',
        service_unavailable: 'Service IA indisponible. Veuillez réessayer.',
        placeholder: 'Écrivez votre réponse...'
      },
      back: '← Retour',
      continue: 'Continuer',
      finalize: 'Finaliser l\\'inscription',
      submitting: 'Inscription...',
      success_title: 'Bienvenue,',
      success_subtitle: 'Vous êtes maintenant un',
      success_hero: 'Héros Urgence-Sang',
      success_note: 'Activez votre disponibilité depuis votre dashboard pour commencer à recevoir des alertes.',
      go_to_dashboard: 'Accéder à mon dashboard',
      registration_success: 'Inscription réussie ! Bienvenue dans la famille Urgence-Sang 🎉',
      registration_error: 'Erreur lors de l\\'inscription',
      location_error: 'Impossible d\\'accéder à votre position. Vérifiez les permissions du navigateur.',
      not_eligible: 'Vous n\\'êtes pas éligible au don pour le moment.',
      eligible: 'Vous êtes éligible ! ✅'
    },
    hospital_registration: {
      title: 'Inscription hôpital',
      steps: {
        info: 'Informations',
        info_sub: 'Coordonnées de l’hôpital',
        documents: 'Documents',
        documents_sub: 'Licence et justificatifs',
        location: 'Localisation',
        location_sub: 'Position de l’établissement',
        confirmation: 'Confirmation',
        confirmation_sub: 'Compte créé avec succès'
      },
      accepted_docs: 'Documents acceptés',
      accepted_docs_note: 'PDF, PNG ou JPG. Le premier document terminé sera envoyé au backend comme licence officielle.',
      step1: {
        step_label: 'Étape 1',
        title: 'Informations générales',
        subtitle: 'Renseignez les coordonnées du responsable et les informations de l’établissement.',
        hospital_name: 'Nom de l’hôpital',
        hospital_name_placeholder: 'Centre hospitalier régional',
        first_name: 'Prénom du responsable',
        first_name_placeholder: 'Amine',
        last_name: 'Nom du responsable',
        last_name_placeholder: 'Ben Salah',
        email: 'Adresse e-mail',
        email_placeholder: 'contact@hopital.tn',
        phone: 'Téléphone',
        phone_placeholder: '+216 20 000 000',
        password: 'Mot de passe',
        password_placeholder: '••••••••',
        fill_all: 'Veuillez remplir toutes les informations requises.'
      },
      step2: {
        step_label: 'Étape 2',
        title: 'Téléversement des documents',
        subtitle: 'Ajoutez la licence de l’établissement. Une vraie pièce jointe sera envoyée au backend lors de l’inscription.',
        select_docs: 'Sélectionner des documents',
        formats: 'Formats autorisés : PDF, JPG, JPEG, PNG. Le premier fichier terminé sera utilisé comme licence (`license`).',
        no_docs: 'Aucun document sélectionné pour le moment.',
        license_sent: 'Licence envoyée',
        uploading: 'En cours',
        completed: 'Terminé',
        error: 'Erreur',
        add_at_least_one: 'Veuillez ajouter au moins une licence ou un document justificatif.',
        wait_upload: 'Veuillez attendre la fin du téléversement du document principal.'
      },
      step3: {
        step_label: 'Étape 3',
        title: 'Position sur la carte',
        subtitle: 'Cliquez sur la carte ou utilisez votre position actuelle. Si la carte ne se charge pas, la saisie manuelle reste disponible.',
        use_my_location: 'Utiliser ma position',
        latitude: 'Latitude',
        latitude_placeholder: '36.8065',
        longitude: 'Longitude',
        longitude_placeholder: '10.1815',
        map_error: 'La carte n’a pas pu être chargée. Vous pouvez tout de même saisir les coordonnées manuellement.',
        map_loading: 'Chargement de la carte…',
        map_temp_disabled: 'Carte temporairement désactivée',
        map_temp_disabled_note: 'Veuillez saisir les coordonnées manuellement dans les champs ci-dessus, ou utiliser le bouton "Utiliser ma position" pour la géolocalisation automatique.',
        coords_selected: 'Coordonnées sélectionnées :',
        invalid_coords: 'Veuillez renseigner des coordonnées valides.',
        geolocation_unavailable: 'La géolocalisation n’est pas disponible sur cet appareil.',
        geolocation_success: 'Position mise à jour.',
        geolocation_error: 'Impossible de récupérer votre position actuelle.'
      },
      step4: {
        title: 'Compte hôpital créé',
        subtitle: 'Votre établissement a bien été enregistré. Redirection vers le tableau de bord…',
        go_to_dashboard: 'Accéder au tableau de bord'
      },
      back: 'Retour',
      continue: 'Continuer',
      finalize: 'Finaliser l’inscription',
      creating_account: 'Création du compte…',
      registration_success: 'Inscription finalisée avec succès.',
      registration_error: 'L’inscription a échoué. Veuillez réessayer.'
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
    },
    login: {
      title: 'Sign in',
      subtitle: 'Access your personal space',
      email: 'Email',
      email_placeholder: 'your@email.com',
      password: 'Password',
      password_placeholder: 'Your password',
      login: 'Sign in',
      logging_in: 'Signing in...',
      no_account: 'Don\'t have an account yet?',
      donor: 'Donor',
      hospital: 'Hospital',
      fill_all_fields: 'Please fill in all fields',
      welcome_back: 'Welcome back,',
      invalid_credentials: 'Invalid email or password'
    },
    donor_registration: {
      title: 'Become a Donor',
      subtitle: 'Create your hero profile in 3 steps',
      steps: {
        profile: 'Profile',
        blood_type: 'Blood Type',
        location: 'Location'
      },
      step1: {
        title: 'Your profile',
        subtitle: 'Basic personal information',
        first_name: 'First name',
        first_name_placeholder: 'Ahmed',
        last_name: 'Last name',
        last_name_placeholder: 'Benali',
        email: 'Email',
        email_placeholder: 'ahmed@email.com',
        password: 'Password',
        password_placeholder: 'Minimum 8 characters',
        phone: 'Phone',
        phone_placeholder: '+212 6XX XX XX XX',
        age: 'Age',
        age_placeholder: '25',
        age_note: 'Blood donation is allowed between 18 and 70 years old'
      },
      step2: {
        title: 'Your blood type',
        subtitle: 'Select your type from the grid below',
        dont_know_blood_type: 'I don\'t know my blood type — Get help',
        compatibility: 'Compatible with:'
      },
      step3: {
        title: 'Your location',
        subtitle: 'So the AI can match you with nearby hospitals',
        locate_me: 'Locate me now',
        locating: 'Locating...',
        location_saved: 'Position saved ✓',
        privacy_note: '🔒 Your location is only shared with hospitals during an active alert. It is encrypted and deleted after each session.',
        or: 'or',
        manual_location: 'Set my location manually',
        manual_location_set: 'Location set to Casablanca'
      },
      chat: {
        title: 'AI Assistant — Urgence-Sang',
        subtitle: 'Health Advisor',
        greeting: 'Hello! I am the Urgence-Sang AI assistant. To verify your eligibility to donate, can you move now?',
        unavailable: 'I couldn\'t analyze your response.',
        service_unavailable: 'AI service unavailable. Please try again.',
        placeholder: 'Write your response...'
      },
      back: '← Back',
      continue: 'Continue',
      finalize: 'Finalize registration',
      submitting: 'Registering...',
      success_title: 'Welcome,',
      success_subtitle: 'You are now a',
      success_hero: 'Urgence-Sang Hero',
      success_note: 'Activate your availability from your dashboard to start receiving alerts.',
      go_to_dashboard: 'Go to my dashboard',
      registration_success: 'Registration successful! Welcome to the Urgence-Sang family 🎉',
      registration_error: 'Error during registration',
      location_error: 'Unable to access your location. Check browser permissions.',
      not_eligible: 'You are not eligible to donate at this time.',
      eligible: 'You are eligible! ✅'
    },
    hospital_registration: {
      title: 'Hospital Registration',
      steps: {
        info: 'Information',
        info_sub: 'Hospital details',
        documents: 'Documents',
        documents_sub: 'License and supporting documents',
        location: 'Location',
        location_sub: 'Facility position',
        confirmation: 'Confirmation',
        confirmation_sub: 'Account created successfully'
      },
      accepted_docs: 'Accepted documents',
      accepted_docs_note: 'PDF, PNG, or JPG. The first completed document will be sent to the backend as the official license.',
      step1: {
        step_label: 'Step 1',
        title: 'General information',
        subtitle: 'Enter the manager\'s contact information and facility details.',
        hospital_name: 'Hospital name',
        hospital_name_placeholder: 'Regional Hospital Center',
        first_name: 'Manager first name',
        first_name_placeholder: 'Amine',
        last_name: 'Manager last name',
        last_name_placeholder: 'Ben Salah',
        email: 'Email address',
        email_placeholder: 'contact@hospital.tn',
        phone: 'Phone',
        phone_placeholder: '+216 20 000 000',
        password: 'Password',
        password_placeholder: '••••••••',
        fill_all: 'Please fill in all required information.'
      },
      step2: {
        step_label: 'Step 2',
        title: 'Document upload',
        subtitle: 'Add the facility license. A real attachment will be sent to the backend during registration.',
        select_docs: 'Select documents',
        formats: 'Allowed formats: PDF, JPG, JPEG, PNG. The first completed file will be used as the license (`license`).',
        no_docs: 'No documents selected yet.',
        license_sent: 'License sent',
        uploading: 'Uploading',
        completed: 'Completed',
        error: 'Error',
        add_at_least_one: 'Please add at least one license or supporting document.',
        wait_upload: 'Please wait for the main document to finish uploading.'
      },
      step3: {
        step_label: 'Step 3',
        title: 'Position on the map',
        subtitle: 'Click on the map or use your current location. If the map doesn\'t load, manual entry is still available.',
        use_my_location: 'Use my location',
        latitude: 'Latitude',
        latitude_placeholder: '36.8065',
        longitude: 'Longitude',
        longitude_placeholder: '10.1815',
        map_error: 'The map could not be loaded. You can still enter coordinates manually.',
        map_loading: 'Loading map…',
        map_temp_disabled: 'Map temporarily disabled',
        map_temp_disabled_note: 'Please enter coordinates manually in the fields above, or use the "Use my location" button for automatic geolocation.',
        coords_selected: 'Selected coordinates:',
        invalid_coords: 'Please enter valid coordinates.',
        geolocation_unavailable: 'Geolocation is not available on this device.',
        geolocation_success: 'Position updated.',
        geolocation_error: 'Unable to retrieve your current position.'
      },
      step4: {
        title: 'Hospital account created',
        subtitle: 'Your facility has been registered successfully. Redirecting to dashboard…',
        go_to_dashboard: 'Go to dashboard'
      },
      back: 'Back',
      continue: 'Continue',
      finalize: 'Finalize registration',
      creating_account: 'Creating account…',
      registration_success: 'Registration completed successfully.',
      registration_error: 'Registration failed. Please try again.'
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
    },
    login: {
      title: 'تسجيل الدخول',
      subtitle: 'الوصول إلى مساحتك الشخصية',
      email: 'البريد الإلكتروني',
      email_placeholder: 'your@email.com',
      password: 'كلمة المرور',
      password_placeholder: 'كلمة المرور الخاصة بك',
      login: 'تسجيل الدخول',
      logging_in: 'جارٍ تسجيل الدخول...',
      no_account: 'ليس لديك حساب بعد؟',
      donor: 'متبرع',
      hospital: 'مستشفى',
      fill_all_fields: 'يرجى ملء جميع الحقول',
      welcome_back: 'مرحبًا بك مرة أخرى،',
      invalid_credentials: 'البريد الإلكتروني أو كلمة المرور غير صالحة'
    },
    donor_registration: {
      title: 'كن متبرعاً',
      subtitle: 'أنشئ ملفك الشخصي البطلي في 3 خطوات',
      steps: {
        profile: 'الملف الشخصي',
        blood_type: 'فصيلة الدم',
        location: 'الموقع'
      },
      step1: {
        title: 'ملفك الشخصي',
        subtitle: 'معلومات شخصية أساسية',
        first_name: 'الاسم الأول',
        first_name_placeholder: 'أحمد',
        last_name: 'الاسم الأخير',
        last_name_placeholder: 'بن علي',
        email: 'البريد الإلكتروني',
        email_placeholder: 'ahmed@email.com',
        password: 'كلمة المرور',
        password_placeholder: '8 أحرف على الأقل',
        phone: 'الهاتف',
        phone_placeholder: '+212 6XX XX XX XX',
        age: 'العمر',
        age_placeholder: '25',
        age_note: ' التبرع بالدم مسموح به بين 18 و 70 سنة'
      },
      step2: {
        title: 'فصيلة دمك',
        subtitle: 'حدد فصيلتك من الشبكة أدناه',
        dont_know_blood_type: 'لا أعرف فصيلة دمي — احصل على مساعدة',
        compatibility: 'متوافق مع:'
      },
      step3: {
        title: 'موقعك',
        subtitle: 'لكي يتمكن الذكاء الاصطناعي من مطابقتك مع المستشفيات القريبة منك',
        locate_me: 'حدد موقعي الآن',
        locating: 'جارٍ تحديد الموقع...',
        location_saved: 'تم حفظ الموقع ✓',
        privacy_note: '🔒 لا تتم مشاركة موقعك مع المستشفيات إلا في حالة تنبيه نشط. يتم تشفيره وحذفه بعد كل جلسة.',
        or: 'أو',
        manual_location: 'حدد موقعي يدويًا',
        manual_location_set: 'تم ضبط الموقع على الدار البيضاء'
      },
      chat: {
        title: 'مساعد الذكاء الاصطناعي — Urgence-Sang',
        subtitle: 'مستشار صحي',
        greeting: 'مرحبًا! أنا مساعد الذكاء الاصطناعي لـ Urgence-Sang. للتحقق من أهليتك للتبرع، هل يمكنك التحرك الآن؟',
        unavailable: 'لم أتمكن من تحليل ردك.',
        service_unavailable: 'خدمة الذكاء الاصطناعي غير متاحة. يرجى المحاولة مرة أخرى.',
        placeholder: 'اكتب ردك...'
      },
      back: '← العودة',
      continue: 'متابعة',
      finalize: 'إنهاء التسجيل',
      submitting: 'جارٍ التسجيل...',
      success_title: 'مرحبًا،',
      success_subtitle: 'أنت الآن',
      success_hero: 'بطل Urgence-Sang',
      success_note: 'قم بتفعيل توفرك من لوحة التحكم لبدء تلقي التنبيهات.',
      go_to_dashboard: 'الانتقال إلى لوحة التحكم',
      registration_success: 'تم التسجيل بنجاح! مرحبًا بك في عائلة Urgence-Sang 🎉',
      registration_error: 'خطأ أثناء التسجيل',
      location_error: 'تعذر الوصول إلى موقعك. تحقق من أذونات المتصفح.',
      not_eligible: 'لست مؤهلًا للتبرع في الوقت الحالي.',
      eligible: 'أنت مؤهل! ✅'
    },
    hospital_registration: {
      title: 'تسجيل المستشفى',
      steps: {
        info: 'المعلومات',
        info_sub: 'تفاصيل المستشفى',
        documents: 'المستندات',
        documents_sub: 'الترخيص والمستندات الداعمة',
        location: 'الموقع',
        location_sub: 'موقع المنشأة',
        confirmation: 'التأكيد',
        confirmation_sub: 'تم إنشاء الحساب بنجاح'
      },
      accepted_docs: 'المستندات المقبولة',
      accepted_docs_note: 'PDF أو PNG أو JPG. سيتم إرسال أول مستند مكتمل إلى الواجهة الخلفية كترخيص رسمي.',
      step1: {
        step_label: 'الخطوة 1',
        title: 'المعلومات العامة',
        subtitle: 'أدخل معلومات الاتصال بالمدير وتفاصيل المنشأة.',
        hospital_name: 'اسم المستشفى',
        hospital_name_placeholder: 'مركز المستشفى الإقليمي',
        first_name: 'اسم المدير الأول',
        first_name_placeholder: 'أمين',
        last_name: 'اسم المدير الأخير',
        last_name_placeholder: 'بن صالح',
        email: 'البريد الإلكتروني',
        email_placeholder: 'contact@hospital.tn',
        phone: 'الهاتف',
        phone_placeholder: '+216 20 000 000',
        password: 'كلمة المرور',
        password_placeholder: '••••••••',
        fill_all: 'يرجى ملء جميع المعلومات المطلوبة.'
      },
      step2: {
        step_label: 'الخطوة 2',
        title: 'تحميل المستندات',
        subtitle: 'أضف ترخيص المنشأة. سيتم إرسال مرفق حقيقي إلى الواجهة الخلفية أثناء التسجيل.',
        select_docs: 'حدد المستندات',
        formats: 'التنسيقات المسموح بها: PDF و JPG و JPEG و PNG. سيتم استخدام أول ملف مكتمل كترخيص (`license`).',
        no_docs: 'لم يتم تحديد أي مستندات بعد.',
        license_sent: 'تم إرسال الترخيص',
        uploading: 'جارٍ التحميل',
        completed: 'مكتمل',
        error: 'خطأ',
        add_at_least_one: 'يرجى إضافة ترخيص واحد على الأقل أو مستند داعم.',
        wait_upload: 'يرجى انتظار انتهاء تحميل المستند الرئيسي.'
      },
      step3: {
        step_label: 'الخطوة 3',
        title: 'الموقع على الخريطة',
        subtitle: 'انقر على الخريطة أو استخدم موقعك الحالي. إذا لم يتم تحميل الخريطة، لا يزال الإدخال اليدوي متاحًا.',
        use_my_location: 'استخدم موقعي',
        latitude: 'خط العرض',
        latitude_placeholder: '36.8065',
        longitude: 'خط الطول',
        longitude_placeholder: '10.1815',
        map_error: 'تعذر تحميل الخريطة. لا يزال بإمكانك إدخال الإحداثيات يدويًا.',
        map_loading: 'جارٍ تحميل الخريطة…',
        map_temp_disabled: 'الخريطة معطلة مؤقتًا',
        map_temp_disabled_note: 'يرجى إدخال الإحداثيات يدويًا في الحقول أعلاه، أو استخدام زر "استخدم موقعي" لتحديد الموقع التلقائي.',
        coords_selected: 'الإحداثيات المحددة:',
        invalid_coords: 'يرجى إدخال إحداثيات صالحة.',
        geolocation_unavailable: 'تحديد الموقع الجغرافي غير متاح على هذا الجهاز.',
        geolocation_success: 'تم تحديث الموقع.',
        geolocation_error: 'تعذر استرداد موقعك الحالي.'
      },
      step4: {
        title: 'تم إنشاء حساب المستشفى',
        subtitle: 'تم تسجيل منشأتك بنجاح. إعادة التوجيه إلى لوحة التحكم…',
        go_to_dashboard: 'الانتقال إلى لوحة التحكم'
      },
      back: 'العودة',
      continue: 'متابعة',
      finalize: 'إنهاء التسجيل',
      creating_account: 'جارٍ إنشاء الحساب…',
      registration_success: 'تم التسجيل بنجاح.',
      registration_error: 'فشل التسجيل. يرجى المحاولة مرة أخرى.'
    }
  }
};

// Get saved language from localStorage or use default
const savedLanguage = localStorage.getItem('i18nextLng') || 'fr';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr,
      en,
      ar
    },
    lng: savedLanguage,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

// Save language to localStorage when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('i18nextLng', lng);
});

export default i18n;
