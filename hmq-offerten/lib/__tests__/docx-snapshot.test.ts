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

  it('Anrede mit Sonderzeichen (& < >) erzeugt gültiges, escaptes XML', async () => {
    const o = sampleOfferte();
    o.empfaenger = { ...o.empfaenger, nachname: 'Test & Co <X>' };
    const xml = await renderDocumentXml(o);
    // Roh-Sonderzeichen dürfen NICHT im Text stehen (würden XML zerstören)
    expect(xml).toContain('Test &amp; Co &lt;X&gt;');
    expect(xml).not.toContain('Test & Co <X>');
  });
});
