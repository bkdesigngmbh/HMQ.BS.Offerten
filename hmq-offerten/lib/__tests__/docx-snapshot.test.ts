import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { generateOfferteFromTemplate } from '@/lib/docx-template-generator';
import { createEmptyEmg, createEmptyOfferte, type EmgKonfiguration, type Offerte } from '@/lib/types';
import { erstelleEmgGespeicherteWerte } from '@/lib/emg-kosten-rechner';
import { DEFAULT_EMG_BASISWERTE } from '@/lib/constants';

// End-to-End-Snapshot von word/document.xml. Sperrt das DOCX-Rendering ein:
// Refactor #11 (Monolith aufteilen) MUSS identisches XML liefern; #1/#2 (Escaping)
// dürfen bei normalen Namen (ohne Sonderzeichen) nichts verändern.

function sampleOfferte(overrides: Partial<Offerte> = {}): Offerte {
  const o = createEmptyOfferte();
  o.offertnummer = '51.25.405';
  o.datum = '2026-06-11'; // fix, sonst bricht der Snapshot täglich
  o.empfaenger = {
    firma: 'Muster Architekten AG',
    abteilung: '',
    anrede: 'Herr',
    vorname: 'Max',
    nachname: 'Muster',
    funktion: '',
    strasse: 'Baslerstrasse 15',
    plz: '4310',
    ort: 'Rheinfelden',
  };
  o.projekt = { ort: 'Rheinfelden', bezeichnung: 'Neubau MFH', anfrageDatum: '2026-06-03' };
  o.kosten = { leistungspreis: 5000, rabattProzent: 10 };
  o.einsatzpauschalen = 2;
  return { ...o, ...overrides };
}

// EMG-Konfiguration wie die Muster-Offerte 51.26.392 "mit EMG":
// 3 Geräte, 16 Wochen, Grundpauschale 700 → Vorhalten 3'840, Total 4'907.75
function sampleEmg(overrides: Partial<EmgKonfiguration> = {}): EmgKonfiguration {
  const emg = createEmptyEmg();
  emg.anzahlGeraete = 3;
  emg.anzahlWochen = 16;
  emg.overrides.grundpauschaleEnd = 700;
  const merged = { ...emg, ...overrides };
  merged.gespeicherteWerte = erstelleEmgGespeicherteWerte(merged, DEFAULT_EMG_BASISWERTE);
  return merged;
}

async function renderDocumentXml(offerte: Offerte): Promise<string> {
  const buffer = await generateOfferteFromTemplate(offerte);
  const zip = new PizZip(buffer);
  return zip.file('word/document.xml')!.asText();
}

function plainText(xml: string): string {
  return xml.replace(/<[^>]+>/g, '');
}

describe('generateOfferteFromTemplate', () => {
  it('rendert word/document.xml deterministisch (Snapshot)', async () => {
    const xml = await renderDocumentXml(sampleOfferte());
    expect(xml).toMatchSnapshot();
  });

  it('alle Platzhalter werden ersetzt (kein {{...}} verbleibt)', async () => {
    const xml = await renderDocumentXml(sampleOfferte());
    const plain = xml.replace(/<[^>]+>/g, '');
    expect(plain).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('ohne Vergleichsaufnahme: kein VA-Abschnitt, keine VA-Kostenzeile, Nummerierung 2.3', async () => {
    const xml = await renderDocumentXml(sampleOfferte());
    expect(xml).not.toContain('Beweissicherung Vergleichsaufnahme');
    expect(xml).not.toContain('Optional: ');
    expect(xml).toContain('Leistungen gemäss Offerte');
    expect(xml).toContain('Beweissicherung Erstaufnahme');
    // Dokumentations-Überschrift bleibt 2.3
    expect(xml).toContain('<w:t>2.3</w:t>');
    // Fester Seitenumbruch vor dem Schlussteil bleibt bestehen
    expect(xml).toContain('<w:pageBreakBefore/>');
  });

  it('mit Vergleichsaufnahme: VA-Abschnitt + Kostenzeile in Klammern, Dokumentation wird 2.4', async () => {
    const xml = await renderDocumentXml(sampleOfferte({ vergleichsaufnahme: true }));
    expect(xml).toContain('Beweissicherung Vergleichsaufnahme');
    expect(xml).toContain('Terminierung');
    expect(xml).toContain('Vergleichsaufnahme (Umfang gemäss Erstaufnahme)');
    expect(xml).toContain('Berichterstellung');
    expect(xml).toContain('Abgabe an Auftraggeber/Eigentümer');
    // Preis identisch zur Erstaufnahme (5000), in Klammern, Total unverändert
    expect(xml).toContain("<w:t>5'000.00</w:t>");
    expect(xml).toContain('Leistungen Erstaufnahme');
    // Nummerierung: VA = 2.3, Dokumentation = 2.4
    expect(xml).toContain('<w:t>2.4</w:t>');
    // Dokumentation beginnt auf neuer Seite (pageBreakBefore in der Überschrift)
    expect(xml).toMatch(/<w:pageBreakBefore\/>(?:(?!<\/w:p>).)*?<w:t>2\.4<\/w:t>/s);
    // Kein fester Umbruch mehr vor dem Schlussteil (KOMPETENZ bleibt bei den Unterschriften)
    expect((xml.match(/<w:pageBreakBefore\/>/g) || []).length).toBe(1);
    // Marker-Absätze sind entfernt
    expect(xml).not.toContain('VA_START');
    expect(xml).not.toContain('VA_END');
    expect(xml).not.toContain('SCHLUSS_UMBRUCH');
    // Keine unersetzten Platzhalter
    const plain = xml.replace(/<[^>]+>/g, '');
    expect(plain).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('mit Vergleichsaufnahme: alle 4 VA-Checkboxen angekreuzt, Dokumentation-Checkboxen unverändert', async () => {
    const xml = await renderDocumentXml(sampleOfferte({ vergleichsaufnahme: true }));
    // createEmptyOfferte hat alle Erstaufnahme-/Dokumentations-Checkboxen aktiv → mit VA total +4
    const ohneVa = await renderDocumentXml(sampleOfferte());
    const anzahlMit = (xml.match(/<w:t>☒<\/w:t>/g) || []).length;
    const anzahlOhne = (ohneVa.match(/<w:t>☒<\/w:t>/g) || []).length;
    expect(anzahlMit).toBe(anzahlOhne + 4);
    // Kein ☐ zuviel: Gesamtzahl Checkbox-Glyphen = 41 (mit VA) bzw. 37 (ohne)
    const glyphen = (x: string) => (x.match(/<w:t>[☐☒]<\/w:t>/g) || []).length;
    expect(glyphen(xml)).toBe(41);
    expect(glyphen(ohneVa)).toBe(37);
  });

  it('Anrede mit Sonderzeichen (& < >) erzeugt gültiges, escaptes XML', async () => {
    const o = sampleOfferte();
    o.empfaenger = { ...o.empfaenger, nachname: 'Test & Co <X>' };
    const xml = await renderDocumentXml(o);
    // Roh-Sonderzeichen dürfen NICHT im Text stehen (würden XML zerstören)
    expect(xml).toContain('Test &amp; Co &lt;X&gt;');
    expect(xml).not.toContain('Test & Co <X>');
  });

  // === EMG (Erschütterungsmessung) ===

  it('ohne EMG (bs): keine EMG-Inhalte, keine Marker-Reste', async () => {
    const xml = await renderDocumentXml(sampleOfferte());
    expect(xml).not.toContain('Erschütterungsmessung');
    expect(xml).not.toContain('Wochentarife');
    expect(xml).not.toContain('Grundpauschale');
    for (const marker of ['EMG_START', 'EMG_END', 'EMGK_START', 'EMGK_END', 'BS_START', 'BS_END', 'BSK_START', 'BSK_END']) {
      expect(xml).not.toContain(marker);
    }
    // Betreff und Ausgangslage wie bisher
    expect(plainText(xml)).toContain('Offerte für Beweissicherung');
    expect(plainText(xml)).toContain('sollen vorgängig zwecks Beweissicherung Zustandsaufnahmen der umliegenden Bauten erstellt werden.');
  });

  it('bs_emg: EMG-Kapitel + zweite Kostentabelle mit Muster-Beträgen, Nummern 4.1/4.2', async () => {
    const xml = await renderDocumentXml(
      sampleOfferte({ offertart: 'bs_emg', emg: sampleEmg() })
    );
    const text = plainText(xml);
    // Leistungsblock
    expect(text).toContain('Leistungen Erschütterungsmessung');
    expect(text).toContain('Konfiguration/Bereitstellung von ');
    expect(text).toContain('3 Geophonen');
    expect(text).toContain('Vorhalten für 16 Wochen');
    expect(text).toContain('Strom wird kostenlos zur Verfügung gestellt');
    expect(text).toContain('Installation erfolgt zeitgleich mit der Aufnahme der Rissprotokolle.');
    // Wochentarife aus den Basiswerten
    expect(text).toContain('Ab 1 Woche Laufzeit');
    expect(text).toContain('CHF 100.00 pro Gerät/Woche');
    expect(text).toContain('Ab 10 Wochen Laufzeit');
    expect(text).toContain('CHF 80.00 pro Gerät/Woche');
    expect(text).toContain('Ab 50 Wochen Laufzeit');
    // Nummern: EMG-Leistungen 3.1, Kostenteil BS 4.1 und EMG 4.2
    expect(xml).toContain('<w:t>3.1</w:t>');
    expect(xml).toContain('<w:t>4.1</w:t>');
    expect(xml).toContain('<w:t>4.2</w:t>');
    expect(text).toContain('(Annahme: 3 Geräte, 16 Wochen)');
    expect(text).toContain('3 Geräte à 16 Wochen (total 48 Wochen)');
    expect(text).toContain('700.00');
    expect(text).toContain("3'840.00");
    expect(text).toContain('Abschlussbericht optional (nicht eingerechnet)');
    expect(text).toContain('(250.00)');
    expect(text).toContain("4'540.00");
    expect(text).toContain('367.75');
    expect(text).toContain("4'907.75");
    expect(text).toContain('Für jede weitere Woche fallen pro Gerät CHF 80.- an.');
    // Betreff bleibt Beweissicherung, BS-Kapitel vorhanden
    expect(text).toContain('Offerte für Beweissicherung');
    expect(text).toContain('Koordination mit den Eigentümern');
    // SMS-Alarmierung auf eigener Zeile (nicht im Konfigurations-Absatz)
    const smsPara = xml.match(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?SMS-Alarmierung(?:(?!<\/w:p>).)*?<\/w:p>/s)![0];
    expect(smsPara).not.toContain('Geophonen');
    // Offertgültigkeit hängt am Vorlaufzeit-Absatz (kein eigener Absatz mehr)
    expect(xml).toContain('vorausgesetzt.</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>Offertgültigkeit: 90 Tage</w:t></w:r></w:p>');
    // Kein unersetzter Platzhalter
    expect(text).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('ohne EMG (bs): Offertgültigkeit bleibt eigener Absatz wie bisher', async () => {
    const xml = await renderDocumentXml(sampleOfferte());
    expect(xml).toContain('<w:t>Offertgültigkeit: 90 Tage</w:t>');
    expect(xml).not.toContain('vorausgesetzt.</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>Offertgültigkeit');
  });

  it('bs_emg: 8 zusätzliche Checkboxen, 6 davon angekreuzt (Abschlussbericht aus)', async () => {
    const ohne = await renderDocumentXml(sampleOfferte());
    const mit = await renderDocumentXml(
      sampleOfferte({ offertart: 'bs_emg', emg: sampleEmg() })
    );
    const glyphen = (x: string) => (x.match(/<w:t>[☐☒]<\/w:t>/g) || []).length;
    const gesetzt = (x: string) => (x.match(/<w:t>☒<\/w:t>/g) || []).length;
    expect(glyphen(mit)).toBe(glyphen(ohne) + 8);
    expect(gesetzt(mit)).toBe(gesetzt(ohne) + 6);
    // Abschlussbericht angekreuzt → +7
    const mitBericht = await renderDocumentXml(
      sampleOfferte({ offertart: 'bs_emg', emg: sampleEmg({ abschlussbericht: true }) })
    );
    expect(gesetzt(mitBericht)).toBe(gesetzt(ohne) + 7);
  });

  it('bs_emg + Vergleichsaufnahme: VA-Abschnitt (2.4) und EMG (4.1/4.2) kombiniert', async () => {
    const xml = await renderDocumentXml(
      sampleOfferte({ offertart: 'bs_emg', vergleichsaufnahme: true, emg: sampleEmg() })
    );
    const text = plainText(xml);
    expect(text).toContain('Beweissicherung Vergleichsaufnahme');
    expect(xml).toContain('<w:t>2.4</w:t>');
    expect(xml).toContain('<w:t>4.1</w:t>');
    expect(xml).toContain('<w:t>4.2</w:t>');
    // 41 + 8 EMG-Checkboxen
    const glyphen = (xml.match(/<w:t>[☐☒]<\/w:t>/g) || []).length;
    expect(glyphen).toBe(49);
    // Seitenumbrüche: Dokumentation (VA) + KOSTEN (EMG); Schluss-Umbruch entfernt
    expect((xml.match(/<w:pageBreakBefore\/>/g) || []).length).toBe(2);
    expect(xml).not.toContain('SCHLUSS_UMBRUCH');
    expect(text).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('nur EMG: BS-Kapitel entfernt, Betreff/Ausgangslage/Termine angepasst, Nummern 2.1/3.1', async () => {
    const xml = await renderDocumentXml(
      sampleOfferte({ offertart: 'emg', emg: sampleEmg() })
    );
    const text = plainText(xml);
    // Betreff und Ausgangslage
    expect(text).toContain('Offerte für Erschütterungsmessung');
    expect(text).not.toContain('Offerte für Beweissicherung');
    expect(text).toContain('sollen während den Bautätigkeiten Erschütterungsmessungen durchgeführt werden.');
    // BS-Kapitel weg, Kapitel 1 bleibt
    expect(text).toContain('Art des Bauvorhabens');
    expect(text).not.toContain('Koordination mit den Eigentümern');
    expect(text).not.toContain('Beweissicherung Erstaufnahme');
    expect(text).not.toContain('Rissprotokoll der gemäss');
    expect(text).not.toContain('Leistungen gemäss Offerte');
    // Voraussetzung mit Rissprotokoll-Bezug entfällt
    expect(text).not.toContain('Installation erfolgt zeitgleich');
    // Nummern: EMG-Leistungen 2.1, EMG-Kosten 3.1
    expect(xml).toContain('<w:t>2.1</w:t>');
    expect(xml).toContain('<w:t>3.1</w:t>');
    expect(xml).not.toContain('<w:t>4.1</w:t>');
    // Termine-Texte
    expect(text).toContain('Die Installation der Messgeräte wird in Absprache mit dem Auftraggeber durchgeführt.');
    expect(text).toContain('um die gewünschte Installation zu terminieren');
    // Offertgültigkeit hängt auch hier am Vorlaufzeit-Absatz
    expect(xml).toContain('vorausgesetzt.</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>Offertgültigkeit: 90 Tage</w:t></w:r></w:p>');
    // Checkboxen: 20 (Kapitel 1) + 8 (EMG)
    const glyphen = (xml.match(/<w:t>[☐☒]<\/w:t>/g) || []).length;
    expect(glyphen).toBe(28);
    expect(text).not.toMatch(/\{\{[A-Z0-9_]+\}\}/);
  });

  it('EMG-Rabatt: eigene Rabattzeile nur in der EMG-Tabelle', async () => {
    const xml = await renderDocumentXml(
      sampleOfferte({
        offertart: 'bs_emg',
        kosten: { leistungspreis: 5000, rabattProzent: 0 },
        emg: sampleEmg({ rabattProzent: 10 }),
      })
    );
    const text = plainText(xml);
    expect(text).toContain('Rabatt 10.0%');
    expect(text).toContain('-454.00');
    expect(text).toContain('Total pauschal (inkl. 10.0% Rabatt und inkl. 8.1% MwSt.)*');
  });

  it('Legende: EMG-Symbol wird bei aktivem EMG eingebettet', async () => {
    const mitEmg = await generateOfferteFromTemplate(
      sampleOfferte({ offertart: 'bs_emg', emg: sampleEmg() })
    );
    const zipMit = new PizZip(mitEmg);
    expect(zipMit.file('word/media/legende_emg.png')).toBeTruthy();
    expect(plainText(zipMit.file('word/document.xml')!.asText())).toContain('Erschütterungsmessung');

    const ohneEmg = await generateOfferteFromTemplate(sampleOfferte());
    const zipOhne = new PizZip(ohneEmg);
    expect(zipOhne.file('word/media/legende_emg.png')).toBeFalsy();

    // Nur EMG: einziger Legendeneintrag ist die Erschütterungsmessung
    const nurEmg = await generateOfferteFromTemplate(
      sampleOfferte({ offertart: 'emg', emg: sampleEmg() })
    );
    const zipNur = new PizZip(nurEmg);
    expect(zipNur.file('word/media/legende_emg.png')).toBeTruthy();
    expect(zipNur.file('word/media/legende_fassade.png')).toBeFalsy();
    expect(zipNur.file('word/media/legende_innenraum.png')).toBeFalsy();
    expect(zipNur.file('word/media/legende_strasse.png')).toBeFalsy();
  });

  it('EMG aktiv ohne gespeicherteWerte: expliziter Fehler statt stillem Fallback', async () => {
    const emg = sampleEmg();
    delete emg.gespeicherteWerte;
    await expect(
      generateOfferteFromTemplate(sampleOfferte({ offertart: 'bs_emg', emg }))
    ).rejects.toThrow(/gespeicherteWerte/);
  });
});
