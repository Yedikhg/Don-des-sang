# 🩸 Urgence-Sang — Réseau Communautaire de Donneurs

> Projet Hackathon **GNEC 2026** · ODD 3 — Santé et Bien-être  
> L'IA au service de la vie — Connecter les hôpitaux aux donneurs en moins de 15 minutes.

---

## 🚀 Démarrage rapide

```bash
# Installer les dépendances
npm install --legacy-peer-deps

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build
```

---

## 📁 Structure du projet

```
src/
├── components/
│   └── Navbar.tsx              # Navigation responsive (desktop + mobile)
├── context/
│   └── AppContext.tsx          # État global (donneur/hôpital, alertes)
├── pages/
│   ├── LandingPage.tsx         # Page d'accueil marketing
│   ├── HospitalRegistration.tsx # Inscription hôpital (4 étapes)
│   ├── DonorRegistration.tsx   # Inscription donneur (3 étapes)
│   ├── CriticalAlertPage.tsx   # Page d'alerte critique (cœur de l'app)
│   ├── HospitalDashboard.tsx   # Dashboard hôpital (gestion des alertes)
│   └── DonorDashboard.tsx      # Dashboard donneur (profil + gamification)
├── types/
│   └── index.ts                # Interfaces TypeScript (compatibles structs Go)
├── App.tsx                     # Router principal
├── main.tsx                    # Point d'entrée
└── index.css                   # Tailwind CSS v4 + animations custom
```

---

## 🗺️ Routes

| Route | Page | Description |
|-------|------|-----------|
| `/` | Landing Page | Page marketing avec stats animées |
| `/donor/register` | Inscription Donneur | Sélection groupe + GPS + chatbot IA |
| `/hospital/register` | Inscription Hôpital | Formulaire + upload docs + carte Leaflet |
| `/donor/dashboard` | Dashboard Donneur | Toggle dispo + trophées + heatmap |
| `/hospital/dashboard` | Dashboard Hôpital | Lancer alerte + suivi temps réel + QR scanner |
| `/alert/:id` | Alerte Critique | Fond pulsant + vidéo + boutons d'action |

---

## 🎨 Design System

| Couleur | Hex | Usage |
|---------|-----|-------|
| **Primaire** (Urgence) | `#E11D48` | Boutons CTA, alertes, éléments critiques |
| **Secondaire** (Positif) | `#10B981` | Confirmation, succès, disponibilité |
| **Background** | `#F8FAFC` | Fond de l'application |
| **Texte** | `#0F172A` | Texte principal |

**Typographie :** Inter (Google Fonts)

---

## 🛠️ Stack Technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| React | 19.x | Framework UI |
| TypeScript | 6.x | Typage statique |
| Vite | 8.x | Build tool |
| Tailwind CSS | 4.x | Styling (CSS-first config) |
| Framer Motion | 11.x | Animations (pulse, transitions) |
| React Router | 7.x | Navigation SPA |
| Leaflet + React-Leaflet | 1.9 / 4.x | Cartes interactives et heatmap |
| Recharts | 2.x | Graphiques dashboard |
| Sonner | 1.x | Notifications toast |
| Lucide React | 0.4x | Icônes |

---

## 🔌 Intégration Backend (Go)

Les interfaces TypeScript dans `src/types/index.ts` matchent les structs JSON du backend Go :

```typescript
type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'

interface Alert {
  id: string
  hospitalId: string
  bloodType: BloodType
  urgencyLevel: 'critical' | 'high' | 'medium'
  location: { lat: number; lng: number }
  matchedDonors: DonorMatch[]
  videoUrl?: string
}
```

---

## 📱 Notes Mobile-First

- Tous les boutons d'action font **min. 48px** de hauteur
- Layouts testés à **375px → 414px** (iPhone SE → Pro Max)
- La Page d'Alerte Critique est optimisée pour **une main** (boutons en bas)
- Responsive desktop jusqu'à **1440px**

---

## 🏆 Fonctionnalités Clés

- **Page d'Alerte Critique** — Fond pulsant rouge, vidéo autoplay muette, compte à rebours temps réel, itinéraire Leaflet
- **Inscription Hôpital** — Wizard 4 étapes : infos + upload docs (progression simulée) + carte interactive + confirmation
- **Inscription Donneur** — Grille groupes sanguins + géolocalisation GPS + chatbot IA santé
- **Dashboard Hôpital** — Graphique Recharts, liste donneurs en route, QR scanner, modal alerte avec upload vidéo
- **Dashboard Donneur** — Toggle disponibilité animé, heatmap Leaflet, 8 trophées, historique avec notes de remerciement
