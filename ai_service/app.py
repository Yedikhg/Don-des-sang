import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from matcher import rank_donors
from chat_engine import chat_with_donor, generate_motivation

load_dotenv(override=True)

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
    "https://urgence-sang.netlify.app"
])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "urgence-sang-ai",
        "version": "1.0.0",
        "gemini": "configured" if os.getenv("GEMINI_API_KEY") else "not configured"
    })


# ── POST /rank ────────────────────────────────────────────────────────────────
@app.post("/rank")
def rank():
    """
    Classe les donneurs par probabilite de reponse.

    Body:
    {
        "hospital_loc": {"lat": float, "lng": float},
        "blood_type": "O+",
        "donors": [
            {"id": "uuid", "lat": float, "lng": float, "history": int, "blood_type": "O-"}
        ]
    }

    Response:
    {
        "ranked_ids": ["uuid1", "uuid2", ...],
        "scores": {"uuid1": 0.85, ...},
        "details": [{"id": ..., "score": ..., "distance_m": ..., ...}]
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON invalide"}), 400

    hospital_loc = data.get("hospital_loc", {})
    donors = data.get("donors", [])

    if not hospital_loc:
        return jsonify({"error": "hospital_loc est requis"}), 400
    if not donors:
        return jsonify({"ranked_ids": [], "scores": {}, "details": []}), 200

    lat = hospital_loc.get("lat")
    lng = hospital_loc.get("lng")
    if lat is None or lng is None:
        return jsonify({"error": "hospital_loc doit contenir lat et lng"}), 400

    ranked = rank_donors(lat, lng, donors)

    return jsonify({
        "ranked_ids": [d["id"] for d in ranked],
        "scores": {d["id"]: d["score"] for d in ranked},
        "details": ranked
    })


# ── POST /chat ────────────────────────────────────────────────────────────────
@app.post("/chat")
def chat():
    """
    Chatbot de pre-screening medical (Gemini).

    Body:
    {
        "message": "Je veux donner du sang",
        "history": [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}],
        "donor_name": "Youssef",
        "blood_type": "O+"
    }

    Response:
    {
        "reply": "Bonjour Youssef ! Pouvez-vous vous deplacer maintenant ?",
        "eligible": null | true | false
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON invalide"}), 400

    message = data.get("message", "").strip()
    if not message:
        return jsonify({"error": "Le champ message est requis"}), 400

    result = chat_with_donor(
        message=message,
        history=data.get("history", []),
        donor_name=data.get("donor_name", ""),
        blood_type=data.get("blood_type", "")
    )
    return jsonify(result)


# ── POST /motivate ────────────────────────────────────────────────────────────
@app.post("/motivate")
def motivate():
    """
    Genere un message push personnalise via Gemini.

    Body:
    {
        "donor_name": "Youssef",
        "blood_type": "O-",
        "hospital_name": "CHU Ibn Rochd",
        "distance_km": 2.3,
        "urgency": "critical" | "high" | "medium"
    }

    Response:
    {
        "title": "Youssef, une vie attend votre O- rare",
        "body": "CHU Ibn Rochd est a 2.3 km. Vous etes le seul compatible disponible maintenant."
    }
    """
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Corps JSON invalide"}), 400

    result = generate_motivation(
        donor_name=data.get("donor_name", "Donneur"),
        blood_type=data.get("blood_type", ""),
        hospital_name=data.get("hospital_name", "l hopital"),
        distance_km=float(data.get("distance_km", 0)),
        urgency=data.get("urgency", "high")
    )
    return jsonify(result)


# ── Entree principale ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    debug = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    print(f"[AI] Urgence-Sang AI Service sur le port {port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
