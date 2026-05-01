-- ============================================================
-- Urgence-Sang — queries.sql  (Requêtes de référence PostGIS)
-- Ce fichier ne s'exécute PAS sur Supabase — il sert de
-- documentation pour les développeurs et l'équipe IA.
-- ============================================================

-- ── Q1 : Trouver tous les donneurs compatibles dans un rayon de 5 km ─────────
-- Remplacer :hospital_lat, :hospital_lng, :blood_type par les vraies valeurs.
-- Utilisé dans : hospital_handler.go → CreateAlert()
SELECT
    u.id,
    u.first_name || ' ' || u.last_name AS full_name,
    u.blood_type,
    u.fcm_token,
    u.donation_count,
    u.latitude,
    u.longitude,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(u.longitude::float8, u.latitude::float8), 4326)::geography,
        ST_SetSRID(ST_MakePoint(:hospital_lng, :hospital_lat), 4326)::geography
    ) / 1000.0 AS distance_km
FROM users u
WHERE u.role   = 'donor'
  AND u.status = 'available'
  AND u.blood_type IN (
      SELECT donor_type FROM blood_compatibility WHERE recipient_type = :blood_type
  )
  AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(u.longitude::float8, u.latitude::float8), 4326)::geography,
        ST_SetSRID(ST_MakePoint(:hospital_lng, :hospital_lat), 4326)::geography,
        5000   -- 5 000 mètres = 5 km
      )
ORDER BY distance_km ASC
LIMIT 200;

-- ── Q2 : Alertes actives proches d'un donneur (rayon 10 km) ──────────────────
-- Utilisé dans : donor_handler.go → NearbyAlerts()
SELECT
    a.id,
    a.blood_type,
    a.quantity_units,
    a.video_url,
    a.status,
    hv.hospital_name,
    ST_Distance(
        ST_SetSRID(ST_MakePoint(a.longitude::float8, a.latitude::float8), 4326)::geography,
        ST_SetSRID(ST_MakePoint(:donor_lng, :donor_lat), 4326)::geography
    ) / 1000.0 AS distance_km
FROM alerts a
JOIN hospital_verifications hv ON hv.user_id = a.hospital_id
WHERE a.status = 'active'
  AND a.blood_type IN (
      SELECT recipient_type FROM blood_compatibility WHERE donor_type = :donor_blood_type
  )
  AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(a.longitude::float8, a.latitude::float8), 4326)::geography,
        ST_SetSRID(ST_MakePoint(:donor_lng, :donor_lat), 4326)::geography,
        10000  -- 10 km
      )
ORDER BY distance_km ASC
LIMIT 20;

-- ── Q3 : Rapport d'impact pour le jury ───────────────────────────────────────
-- Montre en temps réel : combien alertés → combien répondus → combien arrivés.
SELECT
    a.id            AS alert_id,
    hv.hospital_name,
    a.blood_type,
    a.created_at,
    il.donors_in_radius,
    il.donors_notified,
    il.donors_responded,
    il.donors_arrived,
    il.ai_ranking_used,
    il.response_time_min,
    ROUND(
        CASE WHEN il.donors_notified > 0
             THEN (il.donors_arrived::numeric / il.donors_notified) * 100
             ELSE 0
        END, 1
    ) AS conversion_rate_pct
FROM alerts a
JOIN hospital_verifications hv ON hv.user_id = a.hospital_id
LEFT JOIN impact_logs il ON il.alert_id = a.id
ORDER BY a.created_at DESC;

-- ── Q4 : Statistiques globales (dashboard admin) ─────────────────────────────
SELECT
    (SELECT COUNT(*) FROM users WHERE role = 'donor')                     AS total_donors,
    (SELECT COUNT(*) FROM users WHERE role = 'donor' AND status = 'available') AS available_donors,
    (SELECT COUNT(*) FROM hospital_verifications WHERE is_verified = true) AS verified_hospitals,
    (SELECT COUNT(*) FROM alerts)                                          AS total_alerts,
    (SELECT COUNT(*) FROM alerts WHERE status = 'completed')               AS completed_alerts,
    (SELECT COALESCE(SUM(donation_count), 0) FROM users WHERE role = 'donor') AS total_donations,
    (SELECT COALESCE(SUM(donors_notified), 0) FROM impact_logs)            AS total_notified,
    (SELECT COALESCE(SUM(donors_arrived), 0) FROM impact_logs)             AS total_arrived;
