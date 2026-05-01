import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

SCREENING_SYSTEM_PROMPT = (
    "Tu es un assistant medical bienveillant de l application Urgence-Sang au Maroc. "
    "Ton role est d evaluer rapidement si un donneur est apte a donner du sang aujourd hui. "
    "Criteres : age 18-65 ans, poids min 50 kg, dernier don > 8 semaines (homme) ou 12 semaines (femme), "
    "aucune maladie grave recente, aucun anticoagulant, pas de tatouage/piercing depuis 6 mois. "
    "Pose UNE seule question a la fois en francais simple. Sois chaleureux. "
    "Si toutes les conditions sont remplies, dis explicitement : Vous etes eligible pour donner aujourd hui ! "
    "Sinon, explique gentiment pourquoi et conseille d attendre. "
    "Maximum 5 echanges. Commence par demander si la personne peut se deplacer maintenant."
)

MOTIVATION_SYSTEM_PROMPT = (
    "Tu es un expert en communication d urgence medicale pour l application Urgence-Sang au Maroc. "
    "Genere un message de notification push COURT. "
    "Titre : maximum 8 mots. Corps : maximum 2 phrases de 15 mots chacune. "
    "Utilise le prenom du donneur. Sois urgent mais pas anxiogene. "
    "Centre sur l impact humain concret. En francais naturel et chaleureux. "
    "Reponds UNIQUEMENT avec un JSON valide : {\"title\": \"...\", \"body\": \"...\"}"
)

# ── Questions de pre-screening (fallback sans Gemini) ─────────────────────────
_SCREENING_STEPS = [
    "Pouvez-vous vous deplacer maintenant vers l hopital ?",
    "Quel est votre poids approximatif ? (minimum 50 kg requis)",
    "Quand avez-vous fait votre dernier don de sang ? (minimum 8 semaines)",
    "Avez-vous eu une maladie, fievre ou pris des medicaments ces 2 dernieres semaines ?",
    "Avez-vous eu un tatouage ou piercing ces 6 derniers mois ?"
]

_RARE_TYPES = {"O-", "AB-", "B-", "A-"}

_MOTIVATION_TEMPLATES = {
    "critical": (
        "Urgence absolue — {blood_type} requis maintenant",
        "{name}, un patient a {hospital} a besoin de votre groupe {blood_type} de toute urgence. Vous etes a {dist} km, chaque minute compte."
    ),
    "high": (
        "{name}, votre {blood_type} peut sauver une vie ce soir",
        "L hopital {hospital} est a {dist} km de vous. Votre don peut etre decisive dans les prochaines heures."
    ),
    "medium": (
        "Don de sang {blood_type} — {hospital} en a besoin",
        "Bonjour {name}, les stocks de sang {blood_type} sont epuises a {hospital} ({dist} km). Votre aide serait precieuse."
    )
}


def _call_gemini(system_prompt, user_message, history=None):
    """Appel direct a l API REST Gemini. Retourne None si indisponible."""
    if not GEMINI_API_KEY:
        return None

    contents = []
    if history:
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg.get("content", "")}]})

    contents.append({"role": "user", "parts": [{"text": user_message}]})

    payload = {
        "system_instruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 512}
    }

    try:
        resp = requests.post(
            f"{GEMINI_URL}?key={GEMINI_API_KEY}",
            json=payload,
            timeout=15
        )
        if resp.status_code == 200:
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        return None
    except Exception:
        return None


def _rule_based_chat(message, history):
    """
    Chatbot de secours base sur des regles medicales.
    Utilise quand Gemini est indisponible.
    """
    step = len([m for m in (history or []) if m.get("role") in ("model", "assistant")])
    msg_lower = message.lower()

    # Detection des reponses negatives aux questions de screening
    negative_keywords = ["non", "no", "pas", "ne pas", "malade", "medicament",
                         "moins de", "tatouage", "piercing", "la semaine", "hier",
                         "je ne peux pas", "impossible", "30", "35", "40", "45"]

    if any(k in msg_lower for k in negative_keywords):
        return {
            "reply": (
                "Merci pour votre honnetet. Pour des raisons de securite medicale, "
                "il vaut mieux ne pas donner aujourd hui. "
                "Revenez quand vous vous sentirez mieux — votre sante passe en premier !"
            ),
            "eligible": False
        }

    if step < len(_SCREENING_STEPS):
        return {"reply": _SCREENING_STEPS[step], "eligible": None}

    return {
        "reply": (
            "Merci pour vos reponses ! D apres vos informations, "
            "vous etes eligible pour donner aujourd hui. "
            "Rendez-vous a l hopital muni de votre piece d identite. Merci d etre un heros !"
        ),
        "eligible": True
    }


def chat_with_donor(message, history=None, donor_name="", blood_type=""):
    """
    Traite un message du donneur pour le pre-screening medical.
    Essaie Gemini en premier, bascule sur les regles medicales si indisponible.
    Retourne : {reply: str, eligible: bool|None}
    """
    context = message
    if donor_name or blood_type:
        context = f"[Donneur: {donor_name}, Groupe sanguin: {blood_type}]\n{message}"

    reply = _call_gemini(SCREENING_SYSTEM_PROMPT, context, history)

    if reply is None:
        return _rule_based_chat(message, history)

    eligible = None
    reply_lower = reply.lower()
    if "etes eligible" in reply_lower or "vous etes apte" in reply_lower:
        eligible = True
    elif any(p in reply_lower for p in ["pas eligible", "ne pouvez pas", "deconseille", "attendez"]):
        eligible = False

    return {"reply": reply, "eligible": eligible}


def generate_motivation(donor_name, blood_type, hospital_name, distance_km, urgency="high"):
    """
    Genere un message push personnalise.
    Essaie Gemini en premier, bascule sur templates intelligents si indisponible.
    Retourne : {title: str, body: str}
    """
    # Fallback template intelligent
    template = _MOTIVATION_TEMPLATES.get(urgency, _MOTIVATION_TEMPLATES["high"])
    rare_note = " (groupe rare)" if blood_type in _RARE_TYPES else ""
    fallback = {
        "title": template[0].format(name=donor_name, blood_type=blood_type + rare_note,
                                    hospital=hospital_name, dist=f"{distance_km:.1f}"),
        "body": template[1].format(name=donor_name, blood_type=blood_type + rare_note,
                                   hospital=hospital_name, dist=f"{distance_km:.1f}")
    }

    urgency_labels = {
        "critical": "CRITIQUE — patient en salle d operation",
        "high": "urgente — patient en attente de transfusion",
        "medium": "importante — stock de sang epuise"
    }

    prompt = (
        f"Hopital : {hospital_name}\n"
        f"Groupe sanguin requis : {blood_type}\n"
        f"Donneur : {donor_name}, a {distance_km:.1f} km\n"
        f"Niveau d urgence : {urgency_labels.get(urgency, urgency)}\n\n"
        f"Genere le message de notification push personnalise. "
        f"Reponds UNIQUEMENT avec un JSON valide : {{\"title\": \"...\", \"body\": \"...\"}}"
    )

    raw = _call_gemini(MOTIVATION_SYSTEM_PROMPT, prompt)
    if not raw:
        return fallback

    try:
        text = raw.strip()
        if "```" in text:
            parts = text.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    text = part
                    break
        data = json.loads(text)
        return {
            "title": data.get("title", fallback["title"]),
            "body": data.get("body", fallback["body"])
        }
    except Exception:
        return fallback
