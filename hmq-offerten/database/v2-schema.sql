-- ============================================================
-- HMQ Offerten-App V2 - Datenbank-Schema
-- ============================================================
-- Dieses Skript erstellt das komplette Schema für die V2-Datenbank
-- basierend auf der bestehenden LIVE-Datenbank + V2-Erweiterungen.
--
-- ACHTUNG: Nur in der neuen V2-Datenbank ausführen!
-- ============================================================

-- ============================================================
-- TEIL 1: BESTEHENDES SCHEMA (exakte Kopie der LIVE-DB)
-- ============================================================

-- -----------------------------------------------------
-- Tabelle: app_einstellungen
-- Speichert globale App-Einstellungen
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS app_einstellungen (
    id SERIAL PRIMARY KEY,
    einsatzpauschalen_default INTEGER,
    standard_checkboxen JSONB,
    standort_default TEXT,
    vorlaufzeit_default TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Tabelle: kosten_basiswerte
-- Speichert die Basiswerte für Kostenberechnungen
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS kosten_basiswerte (
    id SERIAL PRIMARY KEY,
    basisstunden_aufnahme NUMERIC,
    bericht_chf NUMERIC,
    binden_einheitspreis NUMERIC,
    datenabgabe_chf NUMERIC,
    grundlagen_chf NUMERIC,
    km_satz NUMERIC,
    kontrolle_chf NUMERIC,
    reisezeit_satz NUMERIC,
    stundensatz_aufnahme NUMERIC,
    termin_chf NUMERIC,
    uebernachtung_satz NUMERIC,
    usb_pauschal NUMERIC,
    verpflegung_satz NUMERIC,
    zustellbestaetigung_chf NUMERIC,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Tabelle: kosten_kategorien
-- Speichert die Kostenkategorien (z.B. EFH, MFH)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS kosten_kategorien (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titel TEXT NOT NULL,
    beschreibung TEXT,
    sortierung INTEGER,
    faktor_abschluss NUMERIC,
    faktor_aufnahme NUMERIC,
    faktor_bericht NUMERIC,
    faktor_grundlagen NUMERIC,
    faktor_kontrolle NUMERIC,
    faktor_termin NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------
-- Tabelle: offerten_historie
-- Speichert alle Offerten als JSON mit Metadaten
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS offerten_historie (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    offertnummer TEXT NOT NULL,
    offerte_data JSONB NOT NULL,
    projekt_ort TEXT,
    projekt_bezeichnung TEXT,
    empfaenger_firma TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Suche nach Offertnummer
CREATE INDEX IF NOT EXISTS idx_offerten_historie_offertnummer
ON offerten_historie(offertnummer);

-- Index für schnelle Suche nach Firma
CREATE INDEX IF NOT EXISTS idx_offerten_historie_firma
ON offerten_historie(empfaenger_firma);

-- -----------------------------------------------------
-- Tabelle: standorte
-- Speichert die HMQ-Standorte (Zürich, Chur, Zofingen)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS standorte (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    firma TEXT NOT NULL DEFAULT 'HMQ AG',
    strasse TEXT,
    plz TEXT,
    ort TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TEIL 2: V2-ERWEITERUNGEN (Neue Module)
-- ============================================================

-- -----------------------------------------------------
-- Erweiterung: Modul-Flags für offerten_historie
-- Ermöglicht Filterung nach aktiven Modulen
-- -----------------------------------------------------
ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS has_module_beweissicherung BOOLEAN DEFAULT TRUE;

ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS has_module_vibration BOOLEAN DEFAULT FALSE;

ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS has_module_crack_monitoring BOOLEAN DEFAULT FALSE;

-- -----------------------------------------------------
-- Erweiterung: Erschütterungsmessung (Vibration)
-- Speichert Geräteanzahl und Messdauer
-- -----------------------------------------------------
ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS vibration_device_count INTEGER DEFAULT 0;

ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS vibration_duration_weeks INTEGER DEFAULT 0;

-- -----------------------------------------------------
-- Erweiterung: Rissmonitoring (Crack Monitoring)
-- Speichert Sensoranzahl und Überwachungsdauer
-- -----------------------------------------------------
ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS crack_sensor_count INTEGER DEFAULT 0;

ALTER TABLE offerten_historie
ADD COLUMN IF NOT EXISTS crack_duration_weeks INTEGER DEFAULT 0;

-- Index für Modul-Filterung
CREATE INDEX IF NOT EXISTS idx_offerten_historie_modules
ON offerten_historie(has_module_beweissicherung, has_module_vibration, has_module_crack_monitoring);

-- ============================================================
-- TEIL 3: ROW LEVEL SECURITY (RLS)
-- ============================================================
-- Für öffentlichen Zugriff (wie in der LIVE-DB)
-- ACHTUNG: In Produktion sollte dies eingeschränkt werden!

ALTER TABLE app_einstellungen ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_basiswerte ENABLE ROW LEVEL SECURITY;
ALTER TABLE kosten_kategorien ENABLE ROW LEVEL SECURITY;
ALTER TABLE offerten_historie ENABLE ROW LEVEL SECURITY;
ALTER TABLE standorte ENABLE ROW LEVEL SECURITY;

-- Policies für öffentlichen Zugriff (anon)
CREATE POLICY "Allow public read" ON app_einstellungen FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON app_einstellungen FOR ALL USING (true);

CREATE POLICY "Allow public read" ON kosten_basiswerte FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON kosten_basiswerte FOR ALL USING (true);

CREATE POLICY "Allow public read" ON kosten_kategorien FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON kosten_kategorien FOR ALL USING (true);

CREATE POLICY "Allow public read" ON offerten_historie FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON offerten_historie FOR ALL USING (true);

CREATE POLICY "Allow public read" ON standorte FOR SELECT USING (true);
CREATE POLICY "Allow public write" ON standorte FOR ALL USING (true);

-- ============================================================
-- TEIL 4: INITIALE DATEN (Optional - Standard-Standorte)
-- ============================================================

-- HMQ Standorte einfügen (falls nicht vorhanden)
INSERT INTO standorte (id, name, firma, strasse, plz, ort) VALUES
    ('zh', 'Zürich-Opfikon', 'HMQ AG', 'Balz-Zimmermann-Strasse 7', '8152', 'Zürich-Opfikon'),
    ('gr', 'Chur', 'HMQ AG', 'Sommeraustrasse 30', '7000', 'Chur'),
    ('ag', 'Zofingen', 'HMQ AG', 'Vordere Hauptgasse 104', '4800', 'Zofingen')
ON CONFLICT (id) DO NOTHING;

-- Standard-Basiswerte einfügen (falls nicht vorhanden)
INSERT INTO kosten_basiswerte (id, grundlagen_chf, termin_chf, stundensatz_aufnahme, basisstunden_aufnahme, bericht_chf, kontrolle_chf, datenabgabe_chf, zustellbestaetigung_chf, usb_pauschal, binden_einheitspreis, km_satz, reisezeit_satz, verpflegung_satz, uebernachtung_satz)
VALUES (1, 180, 90, 180, 0.5, 360, 180, 90, 45, 85, 15, 0.90, 90, 35, 180)
ON CONFLICT (id) DO NOTHING;

-- Standard App-Einstellungen (falls nicht vorhanden)
INSERT INTO app_einstellungen (id, standort_default, vorlaufzeit_default, einsatzpauschalen_default)
VALUES (1, 'zh', '3 Wochen', 2)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- FERTIG!
-- ============================================================
-- Das Schema ist jetzt bereit für die V2-Entwicklung.
--
-- Neue Tabellen-Struktur offerten_historie:
-- - id (UUID)
-- - offertnummer (TEXT)
-- - offerte_data (JSONB)
-- - projekt_ort (TEXT)
-- - projekt_bezeichnung (TEXT)
-- - empfaenger_firma (TEXT)
-- - created_at (TIMESTAMPTZ)
-- - updated_at (TIMESTAMPTZ)
-- - has_module_beweissicherung (BOOLEAN, default: true)  [NEU]
-- - has_module_vibration (BOOLEAN, default: false)       [NEU]
-- - has_module_crack_monitoring (BOOLEAN, default: false)[NEU]
-- - vibration_device_count (INTEGER, default: 0)         [NEU]
-- - vibration_duration_weeks (INTEGER, default: 0)       [NEU]
-- - crack_sensor_count (INTEGER, default: 0)             [NEU]
-- - crack_duration_weeks (INTEGER, default: 0)           [NEU]
-- ============================================================
