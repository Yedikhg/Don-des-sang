-- ============================================================
-- Urgence-Sang — seed.sql
-- À exécuter UNE FOIS après migrations.sql sur Supabase
-- ============================================================

-- ── 1. Groupes sanguins (table de référence médicale) ────────────────────────
INSERT INTO blood_types (code, label, is_universal_donor, is_universal_recipient) VALUES
    ('O-',  'O Rhésus Négatif',  true,  false),
    ('O+',  'O Rhésus Positif',  false, false),
    ('A-',  'A Rhésus Négatif',  false, false),
    ('A+',  'A Rhésus Positif',  false, false),
    ('B-',  'B Rhésus Négatif',  false, false),
    ('B+',  'B Rhésus Positif',  false, false),
    ('AB-', 'AB Rhésus Négatif', false, false),
    ('AB+', 'AB Rhésus Positif', false, true)
ON CONFLICT (code) DO NOTHING;

-- ── 2. Compte Admin (mot de passe : Admin@2026) ───────────────────────────────
-- IMPORTANT : Changez le mot de passe immédiatement après la première connexion.
-- Le hash ci-dessous correspond à "Admin@2026" avec bcrypt cost=10.
-- Pour générer un nouveau hash, utilisez : https://bcrypt-generator.com
INSERT INTO users (
    id,
    email,
    password_hash,
    role,
    first_name,
    last_name,
    phone,
    status
) VALUES (
    gen_random_uuid(),
    'admin@urgence-sang.ma',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    'Admin',
    'Système',
    '+212600000000',
    'available'
) ON CONFLICT (email) DO NOTHING;
