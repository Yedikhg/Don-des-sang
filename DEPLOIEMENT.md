# Architecture et Déploiement du Projet "Don de Sang"

Ce fichier documente l'architecture de déploiement du projet pour faciliter le travail futur, notamment avec d'autres assistants IA.

## 1. Dépôt de Code Source Principal
- **Hébergeur** : GitHub
- **Dépôt** : `https://github.com/Yedikhg/Don-des-sang`
- **Branche principale** : `main`
- **Workflow** : Tout le code (Frontend, Backend, AI Service) est centralisé ici. Pousser (`git push`) sur la branche `main` déclenche les déploiements automatiques.

## 2. Frontend (React / Vite)
- **Hébergeur** : Vercel
- **URL publique** : `https://blood-emergency-azure.vercel.app/` *(ou l'URL spécifique générée par Vercel)*
- **Variables d'environnement sur Vercel** :
  - `VITE_API_URL=https://urgence-sang-api.onrender.com/api/v1`
  - `VITE_AI_URL=https://yedidya1234-urgence-sang-ai.hf.space`
- **Comment déployer une modification** :
  1. Modifier le code dans le dossier `/frontend`
  2. Faire un `git push` sur GitHub.
  3. Vercel détectera le changement et déploiera automatiquement (CI/CD natif).

## 3. Backend (Go)
- **Hébergeur** : Render
- **URL publique de l'API** : `https://urgence-sang-api.onrender.com`
- **Nom du service** : `urgence-sang-api`
- **Point d'entrée (Entrypoint)** : `backend/cmd/main.go`
- **Build Command** : `go build -o bin/api ./cmd/main.go`
- **Start Command** : `./bin/api`
- **Configuration** : Définie dans `render.yaml` à la racine du dépôt.
- **Comment déployer une modification** :
  1. Modifier le code dans le dossier `/backend`
  2. Faire un `git push` sur GitHub.
  3. Render détectera le changement et déploiera automatiquement (CI/CD natif via `render.yaml`).

## 4. Base de Données (PostgreSQL)
- **Hébergeur** : Supabase
- **URL de connexion** : `postgresql://postgres.mgahifazpiztrcfxusoe:yedidyaa230385@aws-0-eu-west-1.pooler.supabase.com:6543/postgres`
- **Accès** : Géré via les variables d'environnement du Backend (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`).
- **Comment modifier** : Les modifications de schéma se font directement via l'interface web de Supabase ou via des scripts SQL exécutés sur cette base.

## 5. Service IA (Hugging Face)
- **Hébergeur** : Hugging Face Spaces
- **Page du Space** : `https://huggingface.co/spaces/yedidya1234/urgence-sang-ai`
- **URL publique de l'API (Endpoint)** : `https://yedidya1234-urgence-sang-ai.hf.space`
- **Comment déployer une modification** :
  - L'intégration continue est déjà en place (GitHub Actions).
  - Modifier le code dans le dossier `/ai_service`.
  - Faire un `git push` sur GitHub.
  - La GitHub Action "Sync AI Service to Hugging Face Space" s'occupera d'envoyer le code vers Hugging Face automatiquement.

## Note pour les assistants IA futurs
Si vous devez modifier un service :
1. **Frontend** : Modifiez, commitez et pushez. Vercel s'occupe du reste.
2. **Backend** : Modifiez, commitez et pushez. Render s'occupe du reste (déploiement automatique via `render.yaml`).
3. **IA** : Modifiez, commitez et pushez. Les GitHub Actions s'occupent du reste.
