-- ============================================================
-- HMQ Offerten-App - Migration: EMG-Basiswerte (Erschütterungsmessung)
-- ============================================================
-- Rein additiv: legt NUR die neue Tabelle emg_basiswerte an und
-- befüllt sie mit den Startwerten. Bestehende Tabellen und Daten
-- (offerten_historie, kosten_basiswerte etc.) werden NICHT berührt.
--
-- Ausführen: Supabase Dashboard -> SQL Editor -> dieses Skript einfügen -> Run
-- ============================================================

CREATE TABLE IF NOT EXISTS emg_basiswerte (
    id INTEGER PRIMARY KEY,
    stundensatz NUMERIC NOT NULL,
    konfiguration_stk_chf NUMERIC NOT NULL,
    km_satz NUMERIC NOT NULL,
    tarif1_ab NUMERIC NOT NULL,
    tarif1_chf NUMERIC NOT NULL,
    tarif2_ab NUMERIC NOT NULL,
    tarif2_chf NUMERIC NOT NULL,
    tarif3_ab NUMERIC NOT NULL,
    tarif3_chf NUMERIC NOT NULL,
    tarif4_ab NUMERIC NOT NULL,
    tarif4_chf NUMERIC NOT NULL,
    abschlussbericht_chf NUMERIC NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Startwerte gemäss Muster-Offerte 51.26.392 / Excel "Berechnung Grundpauschale"
INSERT INTO emg_basiswerte (
    id, stundensatz, konfiguration_stk_chf, km_satz,
    tarif1_ab, tarif1_chf, tarif2_ab, tarif2_chf,
    tarif3_ab, tarif3_chf, tarif4_ab, tarif4_chf,
    abschlussbericht_chf
) VALUES (
    1, 120, 45, 0.60,
    1, 100, 10, 80,
    25, 75, 50, 65,
    250
)
ON CONFLICT (id) DO NOTHING;

-- RLS analog zu den bestehenden Tabellen (Policy-Namen wie in der LIVE-DB)
ALTER TABLE emg_basiswerte ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON emg_basiswerte;
CREATE POLICY "Allow public read" ON emg_basiswerte FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public write" ON emg_basiswerte;
CREATE POLICY "Allow public write" ON emg_basiswerte FOR ALL USING (true);
