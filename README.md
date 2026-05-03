# Urgence-Sang

Urgence-Sang est une plateforme communautaire de mise en relation entre hopitaux et donneurs de sang en situation d urgence. Le projet combine un frontend web moderne, une API backend en Go, un microservice IA en Python et une base de donnees PostgreSQL/PostGIS pour accelerer la recherche de donneurs compatibles et proches geographiquement.

## Vision du projet

L objectif du projet est simple : reduire le temps entre le signalement d un besoin critique en sang et la mobilisation de donneurs disponibles.

La plateforme permet :

- aux hopitaux de creer rapidement une alerte d urgence
- aux donneurs de s inscrire, declarer leur disponibilite et recevoir des alertes ciblees
- au systeme de filtrer les donneurs compatibles par groupe sanguin et proximite
- a l IA de prioriser les profils les plus susceptibles de repondre vite

## Probleme que nous resolvons

Dans de nombreuses situations, les banques de sang et les structures hospitalieres perdent un temps critique a contacter les bons profils au bon moment. Urgence-Sang apporte une reponse numerique avec :

- une gestion centralisee des alertes
- une recherche geographique des donneurs
- une compatibilite sanguine integree
- des notifications rapides
- un support IA pour le classement des donneurs et le pre-screening conversationnel

## Architecture generale

Le projet est organise en trois briques principales :

### 1. Frontend web

Le frontend se trouve dans `frontend/`.

Il s agit d une application React + TypeScript construite avec Vite. Elle fournit :

- la page d accueil du projet
- l inscription des donneurs
- l inscription des hopitaux
- le tableau de bord donneur
- le tableau de bord hopital
- les ecrans d alertes critiques

Principales technologies frontend :

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Leaflet / React-Leaflet
- Recharts
- Sonner

### 2. Backend API

Le backend se trouve dans `backend/`.

Il s agit d une API developpee en Go avec Fiber. Elle gere :

- l authentification JWT
- les roles utilisateur (donneur, hopital, admin)
- la creation et le suivi des alertes
- la recherche des alertes proches pour les donneurs
- la validation des dons
- les statistiques et vues d administration
- l integration avec la base PostgreSQL
- l integration avec le microservice IA

Principales technologies backend :

- Go
- Fiber
- JWT
- PostgreSQL
- PostGIS
- Supabase Storage
- Firebase Cloud Messaging

### 3. Microservice IA

Le microservice IA se trouve dans `ai_service/`.

Il s agit d un service Python base sur Flask. Il fournit plusieurs fonctions intelligentes :

- classement des donneurs par priorite via `POST /rank`
- chatbot de pre-screening medical via `POST /chat`
- generation de messages de motivation via `POST /motivate`

Le service peut exploiter Gemini quand la cle API est disponible, avec un mode fallback pour continuer a fonctionner meme sans le modele distant.

## Structure du depot

```text
OCR_Project/
|- frontend/     Application web React + TypeScript
|- backend/      API REST en Go + Fiber
|- ai_service/   Microservice IA en Python + Flask
`- README.md     Documentation generale du projet
```

## Fonctionnement metier

Le flux principal du projet suit cette logique :

1. Un hopital cree une alerte avec un groupe sanguin, un niveau d urgence et une position.
2. Le backend recherche dans la base les donneurs compatibles et proches.
3. Le microservice IA classe les donneurs par probabilite de reponse rapide.
4. Le systeme envoie des notifications aux profils les plus pertinents.
5. Les donneurs peuvent accepter, refuser ou se rendre au point de don.
6. L hopital suit l evolution de l alerte et cloture l intervention.

## Endpoints principaux du backend

Le backend expose notamment les routes suivantes :

### Sante

- `GET /health`

### Authentification

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Hopitaux

- `POST /api/v1/hospitals/alerts`
- `GET /api/v1/hospitals/alerts`
- `GET /api/v1/hospitals/alerts/:id/status`
- `PATCH /api/v1/hospitals/alerts/:id/complete`
- `POST /api/v1/hospitals/verify-donor`
- `GET /api/v1/hospitals/stats`

### Donneurs

- `GET /api/v1/donors/nearby-alerts`
- `GET /api/v1/donors/alerts/:id`
- `PATCH /api/v1/donors/status`
- `PATCH /api/v1/donors/location`
- `POST /api/v1/donors/respond`
- `GET /api/v1/donors/history`
- `GET /api/v1/donors/stats`

### Administration

- `GET /api/v1/admin/pending-hospitals`
- `PATCH /api/v1/admin/verify-hospital/:id`
- `GET /api/v1/admin/stats`
- `GET /api/v1/admin/alerts`
- `GET /api/v1/admin/impact`

## Base de donnees

Le projet s appuie sur PostgreSQL avec PostGIS afin de gerer :

- les utilisateurs
- les hopitaux
- les alertes
- les reponses des donneurs
- les donnees geographiques
- les rapports d impact

Le schema SQL est disponible dans `backend/db/migrations.sql`.

## Variables d environnement

### Backend

Les principales variables du backend sont :

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRATION_HOURS`
- `AI_SERVICE_URL`
- `FIREBASE_SERVER_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `MAX_UPLOAD_SIZE_MB`

Exemple : `backend/.env.example`

### AI service

Le microservice IA utilise notamment :

- `GEMINI_API_KEY`

Exemple : `ai_service/.env.example`

## Lancement en local

## 1. Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```

Le frontend sera disponible en local sur Vite.

## 2. Backend

```bash
cd backend
cp .env.example .env
go mod tidy
go run ./cmd/main.go
```

## 3. Microservice IA

```bash
cd ai_service
pip install -r requirements.txt
cp .env.example .env
python app.py
```

## Strategie de deploiement gratuite

Pour le backend principal, je recommande de deployer sur **Oracle Cloud Always Free**.

### Pourquoi ce choix

Je ne te propose ni Render ni Koyeb, et je ne recommande pas non plus Railway ou Fly.io pour un vrai gratuit durable :

- Railway fonctionne surtout avec un credit d essai, pas comme une offre gratuite permanente.
- Fly.io n offre plus un vrai hebergement gratuit durable pour les nouveaux comptes.
- Oracle Cloud propose une vraie offre "Always Free" avec des VM utilisables sur la duree, ce qui convient bien a une API Go.

### Pourquoi Oracle Cloud est le meilleur choix ici

Pour ce projet, Oracle Cloud est pertinent parce que :

- ton backend Go tourne tres bien sur une VM Linux
- tu gardes le controle total du processus, des variables d environnement et du reseau
- tu peux faire tourner ton API 24h/24
- tu peux ajouter Nginx ou Caddy devant l API
- tu peux aussi heberger d autres services plus tard si besoin

### Recommandation concrete

Je recommande cette organisation :

- `frontend` sur Netlify ou Vercel
- `backend` Go sur Oracle Cloud Always Free
- `database` sur Supabase
- `ai_service` sur Hugging Face Spaces Docker ou sur une seconde VM si tu veux tout centraliser

### Option de deploiement du microservice IA

Le microservice IA Python peut etre deploye gratuitement sur **Hugging Face Spaces** si tu veux une solution simple pour la partie IA, surtout parce qu il existe deja un `Dockerfile` dans `ai_service/`.

En revanche, le backend principal qui gere l authentification, les alertes et la logique metier doit idealement rester sur Oracle Cloud pour plus de stabilite et de controle.

## Deploiement recommande

### Backend Go sur Oracle Cloud

Etapes generales :

1. Creer une VM Always Free Ubuntu ou Oracle Linux.
2. Installer Go ou deploier via binaire/Docker.
3. Cloner le depot.
4. Configurer `backend/.env`.
5. Lancer l application avec un service systemd.
6. Mettre Nginx ou Caddy en reverse proxy.
7. Ouvrir le port public et connecter le frontend a l URL de l API.

### AI service sur Hugging Face Spaces

Etapes generales :

1. Creer un Space Docker.
2. Pousser le contenu de `ai_service/`.
3. Definir `GEMINI_API_KEY`.
4. Recuperer l URL publique du service.
5. Renseigner cette URL dans `AI_SERVICE_URL` si necessaire selon le flux retenu.

## Points forts du projet

- architecture modulaire
- separation claire entre interface, logique metier et intelligence applicative
- geolocalisation et filtrage spatial
- modele role-based pour la securite
- experience adaptee aux donneurs et aux hopitaux
- potentiel d impact social fort

## Statut actuel

Le depot contient deja :

- un frontend complet React/Vite
- un backend Go structure avec handlers, services et middleware
- un microservice IA Python fonctionnel
- des exemples de configuration `.env`
- un schema de base de donnees
- des scripts utilitaires et de test

## Resume

Urgence-Sang est une plateforme numerique d urgence transfusionnelle qui connecte les hopitaux et les donneurs de sang en temps reel. Le projet repose sur un frontend moderne, un backend robuste en Go et un microservice IA en Python pour accelerer la mobilisation des bons donneurs au bon moment.

Si on fixe une decision maintenant, ma recommandation est la suivante :

- backend principal : Oracle Cloud Always Free
- base de donnees : Supabase
- frontend : Netlify
- microservice IA : Hugging Face Spaces ou Oracle Cloud selon le niveau de controle souhaite
