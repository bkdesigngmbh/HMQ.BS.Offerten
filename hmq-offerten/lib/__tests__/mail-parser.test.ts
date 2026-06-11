import { describe, it, expect } from 'vitest';
import { parseEmailContent, parseFolderName, parseStandort } from '@/lib/mail-parser';

// Synthetische Fixtures (keine echten Personendaten), die die realen
// callExpert-Mailstrukturen nachbilden. Lockt das Empfänger-/Datums-Parsing.

function makeEml(opts: { date: string; bodyLines: string[] }): string {
  const headers = [
    'From: "callExpert Backoffice" <backoffice@callexpert.ch>',
    'To: <bpa@hmq.ch>',
    'Subject: HMQ AG: Offerte',
    `Date: ${opts.date}`,
    'Content-Type: text/html; charset="utf-8"',
    'MIME-Version: 1.0',
  ].join('\r\n');
  const body = '<html><body>' + opts.bodyLines.map(l => `<p>${l}</p>`).join('') + '</body></html>';
  return headers + '\r\n\r\n' + body;
}

const EMPF_FOOTER = ['Bei Fragen stehen wir dir gerne zur Verfügung.', 'Beste Grüsse', 'callExpert'];

describe('parseEmailContent — Empfänger', () => {
  it('Anrede/Name auf getrennten Zeilen', () => {
    const eml = makeEml({
      date: 'Wed, 3 Jun 2026 12:40:45 +0000',
      bodyLines: [
        'Standort: Unterdorfstrasse 27, 4323 Wallbach',
        'Bezeichnung: Neubau MFH',
        '<strong>Empfänger:</strong>',
        'Muster Architekten AG',
        'Herr',
        'Max Muster',
        'Baslerstrasse 15',
        '4310 Rheinfelden',
        'max.muster@example.ch',
        ...EMPF_FOOTER,
      ],
    });
    const r = parseEmailContent(eml);
    expect(r.firma).toBe('Muster Architekten AG');
    expect(r.anrede).toBe('Herr');
    expect(r.vorname).toBe('Max');
    expect(r.nachname).toBe('Muster');
    expect(r.strasse).toBe('Baslerstrasse 15');
    expect(r.plz).toBe('4310');
    expect(r.ort).toBe('Rheinfelden');
    expect(r.email).toBe('max.muster@example.ch');
    expect(r.datum).toBe('2026-06-03');
  });

  it('Anrede/Name auf EINER Zeile ("Herr Max Muster")', () => {
    const eml = makeEml({
      date: 'Wed, 3 Jun 2026 09:59:00 +0000',
      bodyLines: [
        '<strong>Empfänger:</strong>',
        'Muster Architekten AG',
        'Herr Max Muster',
        'Bahnhofstrasse 35',
        '8752 Näfels',
        'm.muster@example.ch',
        ...EMPF_FOOTER,
      ],
    });
    const r = parseEmailContent(eml);
    expect(r.firma).toBe('Muster Architekten AG');
    expect(r.anrede).toBe('Herr');
    expect(r.vorname).toBe('Max');
    expect(r.nachname).toBe('Muster');
    expect(r.plz).toBe('8752');
    expect(r.ort).toBe('Näfels');
  });

  it('Frau mit zwei Vornamen, kombinierte Zeile', () => {
    const eml = makeEml({
      date: 'Tue, 2 Jun 2026 08:00:00 +0000',
      bodyLines: [
        '<strong>Empfänger:</strong>',
        'Beispiel GmbH',
        'Frau Anna Maria Beispiel',
        'Weg 1',
        '8000 Zürich',
        'a@example.ch',
        ...EMPF_FOOTER,
      ],
    });
    const r = parseEmailContent(eml);
    expect(r.anrede).toBe('Frau');
    expect(r.vorname).toBe('Anna');
    expect(r.nachname).toBe('Maria Beispiel');
  });
});

describe('parseFolderName', () => {
  it('voller Ordnername', () => {
    expect(parseFolderName('51.25.405 Zürich, Seestrasse 44, Neubau MFH')).toEqual({
      offertnummer: '51.25.405',
      projektOrt: 'Zürich',
      projektBezeichnung: 'Seestrasse 44, Neubau MFH',
    });
  });
  it('nur Offertnummer', () => {
    const r = parseFolderName('51.25.405 Irgendwas');
    expect(r.offertnummer).toBe('51.25.405');
  });
});

describe('parseStandort', () => {
  it('PLZ-zuerst-Format', () => {
    expect(parseStandort('6003 Luzern Gst. 3576')).toEqual({ plz: '6003', ort: 'Luzern', zusatz: 'Gst. 3576' });
  });
});
