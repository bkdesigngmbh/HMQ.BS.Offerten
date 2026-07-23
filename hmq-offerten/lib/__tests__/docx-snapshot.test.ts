import { describe, it, expect } from 'vitest';
import PizZip from 'pizzip';
import { generateOfferteFromTemplate } from '@/lib/docx-template-generator';
import { createEmptyOfferte, type Offerte } from '@/lib/types';

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

async function renderDocumentXml(offerte: Offerte): Promise<string> {
  const buffer = await generateOfferteFromTemplate(offerte);
  const zip = new PizZip(buffer);
  return zip.file('word/document.xml')!.asText();
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
});
