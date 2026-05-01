import math
from datetime import datetime


def haversine_distance(lat1, lng1, lat2, lng2):
    """Calcule la distance en metres entre deux points GPS."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def get_traffic_score():
    """Score de circulation selon l heure (0=mauvais, 1=fluide)."""
    hour = datetime.now().hour
    if 22 <= hour or hour < 6:
        return 0.9   # Nuit : pas de circulation
    elif 7 <= hour < 9 or 17 <= hour < 19:
        return 0.4   # Heure de pointe
    elif 9 <= hour < 17:
        return 0.7   # Journee normale
    else:
        return 0.6   # Soiree


def normalize_history(donation_count, max_count=10):
    """Normalise l historique de dons vers [0,1]. Plus de dons = score plus eleve."""
    return min(donation_count / max(max_count, 1), 1.0)


def normalize_distance(distance_meters, max_radius=5000):
    """Normalise la distance vers [0,1]. Plus proche = score plus eleve."""
    if distance_meters >= max_radius:
        return 0.0
    return 1.0 - (distance_meters / max_radius)


def rank_donors(hospital_lat, hospital_lng, donors, weights=None):
    """
    Classe les donneurs par probabilite de reponse a une urgence.

    Formule : Score = (Distance x 0.4) + (Historique x 0.3) + (Trafic x 0.3)

    Args:
        hospital_lat, hospital_lng : Coordonnees GPS de l hopital
        donors : Liste de dicts {id, lat, lng, history, blood_type}
        weights : Poids optionnels {distance, history, traffic}

    Returns:
        Liste de dicts tries par score decroissant
    """
    if weights is None:
        weights = {"distance": 0.4, "history": 0.3, "traffic": 0.3}

    traffic_score = get_traffic_score()
    scored = []

    for donor in donors:
        dist_m = haversine_distance(
            hospital_lat, hospital_lng,
            donor.get("lat", 0), donor.get("lng", 0)
        )
        dist_score = normalize_distance(dist_m)
        hist_score = normalize_history(donor.get("history", 0))

        total_score = (
            dist_score * weights["distance"] +
            hist_score * weights["history"] +
            traffic_score * weights["traffic"]
        )

        scored.append({
            "id": donor["id"],
            "score": round(total_score, 4),
            "distance_m": round(dist_m, 1),
            "dist_score": round(dist_score, 4),
            "hist_score": round(hist_score, 4),
            "traffic_score": round(traffic_score, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored
