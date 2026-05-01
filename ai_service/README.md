---
title: Urgence Sang AI
emoji: 🩸
colorFrom: red
colorTo: gray
sdk: docker
app_port: 7860
---

# Urgence-Sang — Micro-service IA

Service Flask Python qui fournit l intelligence artificielle a l application Urgence-Sang.

## Stack

- **Python 3.11+** — Langage
- **Flask 3.0** — Serveur web leger
- **Gemini 2.0 Flash** (Google) — LLM pour le chatbot et la persuasion
- **Algorithme maison** — Smart Ranking (pur Python, sans dependance ML)

## Architecture

```
ai_service/
├── app.py           # Serveur Flask — 3 endpoints
├── matcher.py       # Algorithme de ranking intelligent
├── chat_engine.py   # Gemini (chatbot + motivation) + fallback regles medicales
├── requirements.txt
├── .env             # Cle API Gemini (ne pas commiter)
└── .env.example     # Template
```

## Endpoints

### GET /health
Verifie que le service est actif.
```json
{"status": "ok", "gemini": "configured", "version": "1.0.0"}
```

### POST /rank
Classe les donneurs par probabilite de reponse.

**Formule :** `Score = (Distance x 0.4) + (Historique x 0.3) + (Trafic x 0.3)`

**Body :**
```json
{
  "hospital_loc": {"lat": 33.5731, "lng": -7.5898},
  "blood_type": "O+",
  "donors": [
    {"id": "uuid", "lat": 33.58, "lng": -7.59, "history": 5, "blood_type": "O-"}
  ]
}
```
**Response :**
```json
{
  "ranked_ids": ["uuid-1", "uuid-2"],
  "scores": {"uuid-1": 0.797, "uuid-2": 0.646},
  "details": [{"id": "uuid-1", "score": 0.797, "distance_m": 286.9, ...}]
}
```

### POST /chat
Chatbot de pre-screening medical (eligibilite du donneur).
Utilise Gemini si disponible, bascule sur regles medicales sinon.

**Body :**
```json
{
  "message": "Bonjour je veux donner du sang",
  "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
  "donor_name": "Youssef",
  "blood_type": "O-"
}
```
**Response :**
```json
{"reply": "Pouvez-vous vous deplacer maintenant ?", "eligible": null}
```
`eligible` : `null` (en cours), `true` (eligible), `false` (non eligible)

### POST /motivate
Genere un message push personnalise.
Utilise Gemini si disponible, bascule sur templates intelligents sinon.

**Body :**
```json
{
  "donor_name": "Youssef",
  "blood_type": "O-",
  "hospital_name": "CHU Ibn Rochd",
  "distance_km": 2.3,
  "urgency": "critical"
}
```
**Response :**
```json
{
  "title": "Urgence absolue — O- (groupe rare) requis maintenant",
  "body": "Youssef, un patient a CHU Ibn Rochd a besoin de votre groupe O- de toute urgence. Vous etes a 2.3 km."
}
```

## Lancement en local

```bash
# 1. Installer les dependances
pip install -r requirements.txt

# 2. Configurer les variables
cp .env.example .env
# Editer .env : ajouter GEMINI_API_KEY

# 3. Lancer le service
python app.py
# Service disponible sur http://localhost:5001
```

## Deploiement (Render / Railway)

1. Creer un nouveau service Web sur Render.com
2. Connecter le repo GitHub
3. **Build command :** `pip install -r requirements.txt`
4. **Start command :** `gunicorn app:app --bind 0.0.0.0:$PORT`
5. Ajouter la variable `GEMINI_API_KEY` dans les variables d environnement

## Robustesse

Le service fonctionne en 2 modes :

| Gemini disponible | Gemini indisponible (quota / reseau) |
|---|---|
| Chatbot IA contextuel | Chatbot base sur regles medicales |
| Messages push generes par LLM | Templates intelligents personalises |
| Ranking = meme (pur Python) | Ranking = meme (pur Python) |

Le ranking ne depend jamais de Gemini — il fonctionne toujours.

## Lien avec le Backend Go

Le backend Go appelle ce service via `AI_SERVICE_URL` dans son `.env` :
```
AI_SERVICE_URL=http://localhost:5001
```
Le Go appelle uniquement `POST /rank`. Les endpoints `/chat` et `/motivate`
sont appeles directement depuis le frontend React.
