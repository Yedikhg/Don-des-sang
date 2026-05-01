# Urgence-Sang — Backend API (Go + Fiber)

## Stack
- **Go 1.23** + **Fiber v2** (HTTP framework ultra-rapide)
- **PostgreSQL + PostGIS** via Supabase (recherche spatiale GPS)
- **JWT** (golang-jwt/jwt v5) pour l'authentification par rôle
- **Bcrypt** pour le hashage des mots de passe
- **Firebase FCM** pour les notifications push
- **Python AI Microservice** (appel HTTP vers Flask/FastAPI)
- **Supabase Storage** pour l'upload PDF + vidéo

## Structure

```
backend/
├── cmd/main.go                  # Point d'entrée — Fiber app + routes
├── internal/
│   ├── auth/
│   │   ├── jwt.go               # Génération + validation JWT
│   │   └── middleware.go        # RequireAuth + RequireRole
│   ├── config/config.go         # Chargement .env
│   ├── database/db.go           # Connexion PostgreSQL
│   ├── handlers/
│   │   ├── auth_handler.go      # POST /auth/register, /auth/login, GET /auth/me
│   │   ├── hospital_handler.go  # POST /hospitals/alerts, vérification donneur
│   │   ├── donor_handler.go     # GET /donors/nearby-alerts, PATCH /donors/status
│   │   └── admin_handler.go     # GET /admin/pending-hospitals, stats
│   ├── models/
│   │   ├── user.go              # User, RegisterRequest, LoginRequest, AuthResponse
│   │   ├── hospital.go          # HospitalVerification
│   │   ├── alert.go             # Alert, AlertResponse, NearbyAlert
│   │   └── blood.go             # BloodCompatibility map + GetCompatibleDonorTypes()
│   └── services/
│       ├── ai_service.go        # Appel Python microservice /rank
│       ├── firebase_service.go  # FCM push notifications
│       └── storage_service.go   # Upload vers Supabase Storage
├── pkg/utils/
│   ├── response.go              # APIResponse helpers (Success/Error/Created)
│   └── upload.go                # Extraction + validation fichiers multipart
├── db/migrations.sql            # Schema PostgreSQL + PostGIS complet
├── tests/test.ps1               # Script de test PowerShell (tous les endpoints)
├── .env.example                 # Variables d'environnement à copier
└── go.mod
```

## Installation

```bash
# 1. Copier les variables d'environnement
cp .env.example .env
# Remplir DATABASE_URL, JWT_SECRET, FIREBASE_SERVER_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY

# 2. Appliquer le schema SQL sur Supabase
# Copier le contenu de db/migrations.sql dans l'éditeur SQL de Supabase

# 3. Télécharger les dépendances
$env:GOPROXY="https://goproxy.io,direct"
go mod tidy

# 4. Lancer le serveur
go run ./cmd/main.go
```

## API Endpoints

| Méthode | Route | Rôle | Description |
|---------|-------|------|-------------|
| GET | `/health` | Public | Statut serveur + DB |
| POST | `/api/v1/auth/register` | Public | Inscription donneur ou hôpital |
| POST | `/api/v1/auth/login` | Public | Connexion — retourne JWT |
| GET | `/api/v1/auth/me` | Auth | Profil de l'utilisateur connecté |
| POST | `/api/v1/hospitals/alerts` | Hôpital | Créer alerte + notifier donneurs |
| GET | `/api/v1/hospitals/alerts` | Hôpital | Mes alertes |
| GET | `/api/v1/hospitals/alerts/:id/status` | Hôpital | Statut d'une alerte + donneurs |
| PATCH | `/api/v1/hospitals/alerts/:id/complete` | Hôpital | Marquer alerte terminée |
| POST | `/api/v1/hospitals/verify-donor` | Hôpital | Scanner QR — valider don |
| GET | `/api/v1/donors/nearby-alerts` | Donneur | Alertes actives dans un rayon 10km |
| PATCH | `/api/v1/donors/status` | Donneur | Passer disponible/indisponible |
| POST | `/api/v1/donors/respond` | Donneur | Accepter ou refuser une alerte |
| GET | `/api/v1/donors/history` | Donneur | Historique des dons |
| GET | `/api/v1/admin/pending-hospitals` | Admin | Hôpitaux en attente de validation |
| PATCH | `/api/v1/admin/verify-hospital/:id` | Admin | Valider un hôpital |
| GET | `/api/v1/admin/stats` | Admin | Statistiques globales |
| GET | `/api/v1/admin/alerts` | Admin | Toutes les alertes |

## Flux d'Urgence (4 étapes)

1. **Réception** — Hôpital `POST /hospitals/alerts` avec groupe sanguin + vidéo
2. **Filtrage spatial PostGIS** — `ST_DWithin(5000m)` → liste donneurs compatibles
3. **Ranking IA** — Envoi JSON au microservice Python → liste triée par score
4. **Notification FCM** — Push aux 50 meilleurs donneurs (goroutines parallèles)

## Compatibilité sanguine

| Donneur | Peut donner à |
|---------|--------------|
| O− | Tout le monde (donneur universel) |
| O+ | O+, A+, B+, AB+ |
| A− | A−, A+, AB−, AB+ |
| A+ | A+, AB+ |
| B− | B−, B+, AB−, AB+ |
| B+ | B+, AB+ |
| AB− | AB−, AB+ |
| AB+ | AB+ seulement |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | URL PostgreSQL Supabase |
| `JWT_SECRET` | Clé secrète JWT (min 32 chars) |
| `JWT_EXPIRATION_HOURS` | Durée du token (défaut: 24h) |
| `AI_SERVICE_URL` | URL du microservice Python |
| `FIREBASE_SERVER_KEY` | Clé serveur FCM |
| `SUPABASE_URL` | URL projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé service role Supabase |
| `MAX_UPLOAD_SIZE_MB` | Taille max upload (défaut: 10 MB) |
| `PORT` | Port serveur (défaut: 8080) |

## Tests internes

```powershell
# Avec le serveur démarré sur :8080
.\tests\test.ps1
```
