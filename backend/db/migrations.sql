-- Urgence-Sang PostgreSQL + PostGIS Schema
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  NOT NULL CHECK (role IN ('donor','hospital','admin')),
    first_name    VARCHAR(100) NOT NULL DEFAULT '',
    last_name     VARCHAR(100) NOT NULL DEFAULT '',
    phone         VARCHAR(30)  NOT NULL DEFAULT '',
    blood_type    VARCHAR(5)   CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    latitude      DECIMAL(10,8) NOT NULL DEFAULT 0,
    longitude     DECIMAL(11,8) NOT NULL DEFAULT 0,
    status        VARCHAR(20)  NOT NULL DEFAULT 'available' CHECK (status IN ('available','unavailable','busy')),
    fcm_token     TEXT         NOT NULL DEFAULT '',
    donation_count INT         NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_blood  ON users(blood_type);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_loc ON users USING GIST(geography(ST_SetSRID(ST_MakePoint(CAST(longitude AS float8), CAST(latitude AS float8)), 4326)));

CREATE TABLE IF NOT EXISTS hospital_verifications (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hospital_name    VARCHAR(255) NOT NULL,
    license_url      TEXT         NOT NULL DEFAULT '',
    is_verified      BOOLEAN      NOT NULL DEFAULT false,
    verified_at      TIMESTAMPTZ,
    verified_by_admin UUID        REFERENCES users(id),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_hv_user   ON hospital_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_hv_status ON hospital_verifications(is_verified);

CREATE TABLE IF NOT EXISTS alerts (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blood_type     VARCHAR(5)  NOT NULL CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
    quantity_units INT         NOT NULL DEFAULT 1 CHECK (quantity_units > 0),
    video_url      TEXT        NOT NULL DEFAULT '',
    status         VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
    latitude       DECIMAL(10,8) NOT NULL DEFAULT 0,
    longitude      DECIMAL(11,8) NOT NULL DEFAULT 0,
    completed_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_hospital ON alerts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status   ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_blood    ON alerts(blood_type);
CREATE INDEX IF NOT EXISTS idx_alerts_created  ON alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_loc ON alerts USING GIST(geography(ST_SetSRID(ST_MakePoint(CAST(longitude AS float8), CAST(latitude AS float8)), 4326)));

CREATE TABLE IF NOT EXISTS alert_responses (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id   UUID        NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    donor_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted','declined','en_route','completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id, donor_id)
);
CREATE INDEX IF NOT EXISTS idx_resp_alert  ON alert_responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_resp_donor  ON alert_responses(donor_id);
CREATE INDEX IF NOT EXISTS idx_resp_status ON alert_responses(status);

CREATE TABLE IF NOT EXISTS blood_compatibility (
    donor_type     VARCHAR(5) NOT NULL,
    recipient_type VARCHAR(5) NOT NULL,
    PRIMARY KEY (donor_type, recipient_type)
);
INSERT INTO blood_compatibility VALUES
('O-','O-'),('O-','O+'),('O-','A-'),('O-','A+'),('O-','B-'),('O-','B+'),('O-','AB-'),('O-','AB+'),
('O+','O+'),('O+','A+'),('O+','B+'),('O+','AB+'),
('A-','A-'),('A-','A+'),('A-','AB-'),('A-','AB+'),
('A+','A+'),('A+','AB+'),
('B-','B-'),('B-','B+'),('B-','AB-'),('B-','AB+'),
('B+','B+'),('B+','AB+'),
('AB-','AB-'),('AB-','AB+'),
('AB+','AB+')
ON CONFLICT DO NOTHING;

-- ── blood_types (table de référence médicale) ────────────────────────────────
-- Sert de source de vérité pour les 8 groupes sanguins valides.
-- Les colonnes blood_type dans users et alerts gardent un CHECK constraint
-- pour la compatibilité, cette table ajoute les labels lisibles.
CREATE TABLE IF NOT EXISTS blood_types (
    code        VARCHAR(5)   PRIMARY KEY,
    label       VARCHAR(20)  NOT NULL,
    is_universal_donor    BOOLEAN NOT NULL DEFAULT false,
    is_universal_recipient BOOLEAN NOT NULL DEFAULT false
);

-- ── impact_logs (journal d'audit pour le jury) ───────────────────────────────
-- Prouve l'efficacité du système : combien de donneurs alertés → combien arrivés.
CREATE TABLE IF NOT EXISTS impact_logs (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id          UUID        NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    donors_in_radius  INT         NOT NULL DEFAULT 0,
    donors_notified   INT         NOT NULL DEFAULT 0,
    donors_responded  INT         NOT NULL DEFAULT 0,
    donors_arrived    INT         NOT NULL DEFAULT 0,
    ai_ranking_used   BOOLEAN     NOT NULL DEFAULT false,
    response_time_min INT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(alert_id)
);
CREATE INDEX IF NOT EXISTS idx_impact_alert ON impact_logs(alert_id);
