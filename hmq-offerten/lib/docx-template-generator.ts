import PizZip from 'pizzip';
import { Offerte } from './types';
import fs from 'fs';
import path from 'path';

const MWST_SATZ = 8.1;

const STANDORTE: Record<string, string> = {
  zh: 'Zürich-Opfikon',
  gr: 'Chur',
  ag: 'Zofingen',
};

// === HELPER ===

function formatDatumKurz(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function formatDatumTeile(isoDate: string): { tag: string; monat: string; jahr: string } {
  if (!isoDate) return { tag: '', monat: '', jahr: '' };
  const d = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return {
    tag: `${d.getDate()}. `,
    monat: monate[d.getMonth()],
    jahr: d.getFullYear().toString(),
  };
}

function formatCHF(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function berechneKosten(leistungspreis: number, rabattProzent: number) {
  const rabattBetrag = leistungspreis * (rabattProzent / 100);
  const zwischentotal = leistungspreis - rabattBetrag;
  const mwstBetrag = zwischentotal * (MWST_SATZ / 100);
  const total = zwischentotal + mwstBetrag;
  return { rabattBetrag, zwischentotal, mwstBetrag, total };
}

function generiereAnrede(empfaenger: Offerte['empfaenger']): string {
  if (empfaenger.anrede && empfaenger.nachname) {
    return empfaenger.anrede === 'Herr'
      ? `Sehr geehrter Herr ${empfaenger.nachname}`
      : `Sehr geehrte Frau ${empfaenger.nachname}`;
  }
  return 'Sehr geehrte Damen und Herren';
}

function parseOffertnummer(nr: string): { o1: string; o2: string; o3: string; o4: string; o5: string } {
  // Format: 51.25.405 -> o1=51. o2=2 o3=5 o4=. o5=405
  const parts = nr.split('.');
  if (parts.length >= 3) {
    return {
      o1: parts[0] + '.',
      o2: parts[1]?.[0] || '',
      o3: parts[1]?.[1] || '',
      o4: '.',
      o5: parts[2] || '',
    };
  }
  return { o1: nr, o2: '', o3: '', o4: '', o5: '' };
}

function generiereEinsatzText(anzahl: number): { anzahlText: string; tageText: string } {
  const zahlworte: Record<number, string> = {
    1: 'eine Einsatzpauschale',
    2: 'zwei Einsatzpauschalen',
    3: 'drei Einsatzpauschalen',
    4: 'vier Einsatzpauschalen',
  };
  const tageworte: Record<number, string> = {
    1: 'Einsätze an maximal einem Tag',
    2: 'Einsätze an maximal zwei verschiedenen Tagen',
    3: 'Einsätze an maximal drei verschiedenen Tagen',
    4: 'Einsätze an maximal vier verschiedenen Tagen',
  };
  return {
    anzahlText: zahlworte[anzahl] || `${anzahl} Einsatzpauschalen`,
    tageText: tageworte[anzahl] || `Einsätze an maximal ${anzahl} verschiedenen Tagen`,
  };
}

function generiereTotalZeile(rabattProzent: number): string {
  if (rabattProzent > 0) {
    return `Total pauschal (inkl. ${rabattProzent.toFixed(1)}% Rabatt und inkl. 8.1% MwSt.)`;
  }
  return 'Total pauschal (inkl. 8.1% MwSt.)';
}

// === CHECKBOXEN ===

function setCheckboxen(xml: string, offerte: Offerte): string {
  const states: boolean[] = [
    offerte.checkboxen.artBauvorhaben.neubau,
    offerte.checkboxen.artBauvorhaben.umbau,
    offerte.checkboxen.artBauvorhaben.rueckbau,
    !!offerte.checkboxen.artBauvorhaben.sonstiges,
    offerte.checkboxen.artGebaeude.efhFreistehend,
    offerte.checkboxen.artGebaeude.reihenhaus,
    offerte.checkboxen.artGebaeude.terrassenhaus,
    offerte.checkboxen.artGebaeude.mfh,
    offerte.checkboxen.artGebaeude.strassen,
    offerte.checkboxen.artGebaeude.kunstbauten,
    !!offerte.checkboxen.artGebaeude.sonstiges1,
    !!offerte.checkboxen.artGebaeude.sonstiges2,
    offerte.checkboxen.taetigkeiten.aushub,
    offerte.checkboxen.taetigkeiten.rammarbeiten,
    offerte.checkboxen.taetigkeiten.mikropfaehle,
    offerte.checkboxen.taetigkeiten.baustellenverkehr,
    offerte.checkboxen.taetigkeiten.schwereMaschinen,
    offerte.checkboxen.taetigkeiten.sprengungen,
    offerte.checkboxen.taetigkeiten.diverses,
    !!offerte.checkboxen.taetigkeiten.sonstiges,
    offerte.checkboxen.koordination.schriftlicheInfo,
    offerte.checkboxen.koordination.terminvereinbarung,
    offerte.checkboxen.koordination.durchAuftraggeber,
    !!offerte.checkboxen.koordination.sonstiges,
    offerte.checkboxen.erstaufnahme.fassaden,
    offerte.checkboxen.erstaufnahme.strassen,
    offerte.checkboxen.erstaufnahme.strassenBelag,
    offerte.checkboxen.erstaufnahme.strassenRand,
    offerte.checkboxen.erstaufnahme.innenraeume,
    offerte.checkboxen.erstaufnahme.aussenanlagen,
    !!offerte.checkboxen.erstaufnahme.sonstiges,
    offerte.checkboxen.dokumentation.rissprotokoll,
    offerte.checkboxen.dokumentation.fotoAussen,
    offerte.checkboxen.dokumentation.fotoInnen,
    offerte.checkboxen.dokumentation.fotoStrasse,
    offerte.checkboxen.dokumentation.zustellbestaetigung,
    offerte.checkboxen.dokumentation.datenabgabe,
  ];

  let idx = 0;
  xml = xml.replace(/<w14:checkbox>([\s\S]*?)<\/w14:checkbox>/g, (match) => {
    const checked = states[idx++] || false;
    if (checked) {
      return match.replace(/<w14:checked w14:val="0"\/>/g, '<w14:checked w14:val="1"/>');
    }
    return match;
  });

  idx = 0;
  xml = xml.replace(/<w:t>☐<\/w:t>/g, () => {
    const checked = states[idx++] || false;
    return checked ? '<w:t>☒</w:t>' : '<w:t>☐</w:t>';
  });

  return xml;
}

// === RABATT-ZEILE ENTFERNEN ===

function entferneRabattZeile(xml: string, rabattProzent: number): string {
  if (rabattProzent > 0) return xml;

  // Entferne die Tabellenzeile mit {{RABATT_ZEILE}}
  xml = xml.replace(
    /<w:tr[^>]*>(?:(?!<\/w:tr>).)*\{\{RABATT_ZEILE\}\}(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
    ''
  );

  return xml;
}

// === LEERE FUNKTION ENTFERNEN ===

function entferneLeereFunktion(xml: string, funktion: string): string {
  if (funktion && funktion.trim()) return xml;

  // Entferne Paragraph mit {{FUNKTION_A}} und {{FUNKTION_B}}
  xml = xml.replace(
    /<w:p[^>]*>(?:(?!<\/w:p>).)*\{\{FUNKTION_A\}\}(?:(?!<\/w:p>).)*<\/w:p>/gs,
    ''
  );

  return xml;
}

// === PLANBEILAGE ===

function insertPlanbeilage(zip: PizZip, offerte: Offerte): string {
  let xml = zip.file('word/document.xml')?.asText() || '';

  if (!offerte.planbeilage) {
    // Kein Bild - behalte Original (rId12)
    xml = xml.replace(/\{\{PLAN_RID\}\}/g, 'rId12');
    return xml;
  }

  const ext = offerte.planbeilage.mimeType === 'image/png' ? 'png' : 'jpeg';
  const imageData = Buffer.from(offerte.planbeilage.base64, 'base64');

  // Neues Bild hinzufügen
  zip.file(`word/media/planbeilage_neu.${ext}`, imageData);

  // Neue Relationship hinzufügen
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = zip.file(relsPath)?.asText() || '';

  // Nächste freie rId
  const rIdMatches = rels.match(/Id="rId(\d+)"/g) || [];
  const maxId = Math.max(0, ...rIdMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')));
  const newRId = `rId${maxId + 1}`;

  // Neue Relationship einfügen
  const newRel = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/planbeilage_neu.${ext}"/>`;
  rels = rels.replace('</Relationships>', `${newRel}</Relationships>`);
  zip.file(relsPath, rels);

  // Platzhalter ersetzen
  xml = xml.replace(/\{\{PLAN_RID\}\}/g, newRId);

  return xml;
}

// === HAUPTFUNKTION ===

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template_V3.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template nicht gefunden: ${templatePath}`);
  }

  const zip = new PizZip(fs.readFileSync(templatePath));
  let xml = zip.file('word/document.xml')?.asText() || '';

  // Daten vorbereiten
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
  const anfrage = formatDatumTeile(offerte.projekt.anfrageDatum);
  const offertNr = parseOffertnummer(offerte.offertnummer);
  const einsatz = generiereEinsatzText(offerte.einsatzpauschalen);

  // Kontakt
  let kontaktZeile = '';
  if (offerte.empfaenger.anrede && offerte.empfaenger.nachname) {
    kontaktZeile = `${offerte.empfaenger.anrede} ${offerte.empfaenger.vorname} ${offerte.empfaenger.nachname}`.trim();
  }

  // Funktion aufteilen
  const funktionParts = offerte.empfaenger.funktion?.split(' ') || [];
  const funktionA = funktionParts[0] || '';
  const funktionB = funktionParts.length > 1 ? ' ' + funktionParts.slice(1).join(' ') : '';

  // === PLATZHALTER ERSETZEN ===
  const replacements: Record<string, string> = {
    // Empfänger
    '{{FIRMA}}': offerte.empfaenger.firma,
    '{{KONTAKT}}': kontaktZeile,
    '{{FUNKTION_A}}': funktionA,
    '{{FUNKTION_B}}': funktionB,
    '{{STRASSE}}': offerte.empfaenger.strasse,
    '{{PLZ_ORT}}': offerte.empfaenger.plzOrt,

    // Anrede
    '{{ANREDE}}': generiereAnrede(offerte.empfaenger),

    // Standort & Datum
    '{{STANDORT_ORT}}': standort,
    '{{DATUM}}': formatDatumKurz(offerte.datum),

    // Offertnummer
    '{{OFFERT_1}}': offertNr.o1,
    '{{OFFERT_2}}': offertNr.o2,
    '{{OFFERT_3}}': offertNr.o3,
    '{{OFFERT_4}}': offertNr.o4,
    '{{OFFERT_5}}': offertNr.o5,

    // Projekt
    '{{PROJEKT_ORT}}': offerte.projekt.ort,
    '{{PROJEKT_BEZ1}}': offerte.projekt.bezeichnung.split(' ')[0] || '',
    '{{PROJEKT_BEZ2}}': offerte.projekt.bezeichnung.includes(' ')
      ? ' ' + offerte.projekt.bezeichnung.split(' ').slice(1).join(' ')
      : '',

    // Anfragedatum
    '{{ANF_TAG}}': anfrage.tag,
    '{{ANF_MONAT}}': anfrage.monat,
    '{{ANF_JAHR}}': anfrage.jahr,

    // Kosten
    '{{PREIS_LEISTUNG}}': formatCHF(offerte.kosten.leistungspreis),
    '{{PREIS_RABATT}}': `-${formatCHF(kosten.rabattBetrag)}`,
    '{{PREIS_ZWISCHEN}}': formatCHF(kosten.zwischentotal),
    '{{PREIS_MWST}}': formatCHF(kosten.mwstBetrag),
    '{{PREIS_TOTAL}}': formatCHF(kosten.total),
    '{{RABATT_ZEILE}}': `Rabatt ${offerte.kosten.rabattProzent.toFixed(1)}%`,
    '{{TOTAL_ZEILE}}': generiereTotalZeile(offerte.kosten.rabattProzent),

    // Vorlaufzeit & Einsätze
    '{{VORLAUFZEIT}}': offerte.vorlaufzeit,
    '{{EINSATZ_ANZAHL}}': einsatz.anzahlText,
    '{{EINSATZ_TAGE}}': einsatz.tageText,
  };

  for (const [placeholder, value] of Object.entries(replacements)) {
    xml = xml.split(placeholder).join(value);
  }

  // Leere Funktion entfernen
  xml = entferneLeereFunktion(xml, offerte.empfaenger.funktion);

  // Checkboxen setzen
  xml = setCheckboxen(xml, offerte);

  // Rabatt-Zeile entfernen wenn 0%
  xml = entferneRabattZeile(xml, offerte.kosten.rabattProzent);

  // XML speichern (vor Bild)
  zip.file('word/document.xml', xml);

  // Planbeilage einfügen
  xml = insertPlanbeilage(zip, offerte);
  zip.file('word/document.xml', xml);

  // Buffer generieren
  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
