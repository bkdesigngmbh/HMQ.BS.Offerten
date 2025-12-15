import PizZip from 'pizzip';
import { Offerte } from './types';
import fs from 'fs';
import path from 'path';

const MWST_SATZ = 8.1;

// HMQ Standorte
const STANDORTE: Record<string, { name: string; adresse: string }> = {
  zh: {
    name: 'Zürich-Opfikon',
    adresse: 'Balz-Zimmermann-Strasse 7 · 8152 Zürich-Opfikon'
  },
  gr: {
    name: 'Chur',
    adresse: 'Sommeraustrasse 30 · 7000 Chur'
  },
  ag: {
    name: 'Zofingen',
    adresse: 'Vordere Hauptgasse 104 · 4800 Zofingen'
  },
};

// === HELPER ===

function formatDatumKurz(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
}

function formatCHF(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// 5-Rappen-Rundung (Schweizer Standard)
function rundeAuf5Rappen(betrag: number): number {
  return Math.round(betrag * 20) / 20;
}

function berechneKosten(leistungspreis: number, rabattProzent: number) {
  const rabattBetrag = rundeAuf5Rappen(leistungspreis * (rabattProzent / 100));
  const zwischentotal = rundeAuf5Rappen(leistungspreis - rabattBetrag);
  const mwstBetrag = rundeAuf5Rappen(zwischentotal * (MWST_SATZ / 100));
  const total = rundeAuf5Rappen(zwischentotal + mwstBetrag);
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

function formatAnfrageDatum(isoDate: string): { tag: string; monat: string; jahr: string } {
  if (!isoDate) return { tag: '', monat: '', jahr: '' };
  const d = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return {
    tag: `${d.getDate()}. `,
    monat: monate[d.getMonth()],
    jahr: ` ${d.getFullYear()}`,
  };
}

function parseOffertnummer(nr: string): { a: string; b: string; c: string; d: string } {
  const parts = nr.split('.');
  if (parts.length >= 3) {
    const mitte = parts[1] || '';
    return {
      a: parts[0] + '.',
      b: mitte[0] || '',
      c: mitte[1] || '',
      d: '.' + parts[2],
    };
  }
  return { a: nr, b: '', c: '', d: '' };
}

function generiereEinsatzTexte(anzahl: number): { z1: string; z2: string; wort: string; tage1: string; tage2: string } {
  const daten: Record<number, { z1: string; z2: string; wort: string; tage1: string; tage2: string }> = {
    1: { z1: 'ei', z2: 'ne', wort: 'Einsatzpauschale', tage1: 'Einsätze an maximal ', tage2: 'einem Tag' },
    2: { z1: 'zw', z2: 'ei', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'zwei verschiedenen Tagen' },
    3: { z1: 'dr', z2: 'ei', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'drei verschiedenen Tagen' },
    4: { z1: 'vi', z2: 'er', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'vier verschiedenen Tagen' },
  };
  return daten[anzahl] || daten[2];
}

// === CHECKBOXEN ===

function setCheckboxen(xml: string, offerte: Offerte): string {
  const cb = offerte.checkboxen;

  // Strassen-Logik: Wenn Strassen aktiv, automatisch auch Belag und Rand
  const strassenBelag = cb.erstaufnahme.strassen ? true : cb.erstaufnahme.strassenBelag;
  const strassenRand = cb.erstaufnahme.strassen ? true : cb.erstaufnahme.strassenRand;

  const states: boolean[] = [
    cb.artBauvorhaben.neubau,
    cb.artBauvorhaben.umbau,
    cb.artBauvorhaben.rueckbau,
    !!cb.artBauvorhaben.sonstiges,
    cb.artGebaeude.efhFreistehend,
    cb.artGebaeude.reihenhaus,
    cb.artGebaeude.terrassenhaus,
    cb.artGebaeude.mfh,
    cb.artGebaeude.strassen,
    cb.artGebaeude.kunstbauten,
    !!cb.artGebaeude.sonstiges1,
    !!cb.artGebaeude.sonstiges2,
    cb.taetigkeiten.aushub,
    cb.taetigkeiten.rammarbeiten,
    cb.taetigkeiten.mikropfaehle,
    cb.taetigkeiten.baustellenverkehr,
    cb.taetigkeiten.schwereMaschinen,
    cb.taetigkeiten.sprengungen,
    cb.taetigkeiten.diverses,
    !!cb.taetigkeiten.sonstiges,
    cb.koordination.schriftlicheInfo,
    cb.koordination.terminvereinbarung,
    cb.koordination.durchAuftraggeber,
    !!cb.koordination.sonstiges,
    cb.erstaufnahme.fassaden,
    cb.erstaufnahme.strassen,
    strassenBelag,
    strassenRand,
    cb.erstaufnahme.innenraeume,
    cb.erstaufnahme.aussenanlagen,
    !!cb.erstaufnahme.sonstiges,
    cb.dokumentation.rissprotokoll,
    cb.dokumentation.fotoAussen,
    cb.dokumentation.fotoInnen,
    cb.dokumentation.fotoStrasse,
    cb.dokumentation.zustellbestaetigung,
    cb.dokumentation.datenabgabe,
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

// === LEERE ZEILEN ENTFERNEN ===

function entferneLeereFunktion(xml: string, funktion: string): string {
  if (funktion && funktion.trim()) return xml;

  // Entferne den kompletten Paragraphen mit {{FUNKTION_1}}
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{FUNKTION_1\}\}(?:(?!<\/w:p>).)*?<\/w:p>/gs,
    ''
  );

  return xml;
}

function entferneLeerenKontakt(xml: string, hatKontakt: boolean): string {
  if (hatKontakt) return xml;

  // Entferne den kompletten Paragraphen mit {{KONTAKT_ZEILE}}
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{KONTAKT_ZEILE\}\}(?:(?!<\/w:p>).)*?<\/w:p>/gs,
    ''
  );

  return xml;
}

// === RABATT ENTFERNEN ===

function entferneRabatt(xml: string, rabattProzent: number): string {
  if (rabattProzent > 0) return xml;

  xml = xml.replace(
    /<w:tr[^>]*>(?:(?!<\/w:tr>).)*\{\{RABATT_LABEL\}\}(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
    ''
  );
  xml = xml.replace(
    /<w:tr[^>]*>(?:(?!<\/w:tr>).)*\{\{PREIS_RABATT\}\}(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
    ''
  );

  return xml;
}

// === PLANBEILAGE ===

// EMU Konvertierung: 1 cm = 360000 EMUs
const EMU_PER_CM = 360000;

// A4 = 210mm Breite, typische Ränder = 25mm links + 25mm rechts
// Verfügbare Breite = 210 - 50 = 160mm = 16cm
const FULL_WIDTH_CM = 16;

function calculateProportionalSize(
  originalWidth: number,
  originalHeight: number
): { widthEmu: number; heightEmu: number } {
  // Breite ist IMMER die volle verfügbare Breite
  const finalWidthEmu = FULL_WIDTH_CM * EMU_PER_CM;

  // Wenn keine Dimensionen vorhanden, Standardverhältnis 16:9 annehmen
  if (!originalWidth || !originalHeight) {
    const defaultAspectRatio = 16 / 9;
    return {
      widthEmu: finalWidthEmu,
      heightEmu: Math.round(finalWidthEmu / defaultAspectRatio),
    };
  }

  // Höhe proportional berechnen (Seitenverhältnis beibehalten)
  const aspectRatio = originalWidth / originalHeight;
  const finalHeightEmu = finalWidthEmu / aspectRatio;

  return {
    widthEmu: Math.round(finalWidthEmu),
    heightEmu: Math.round(finalHeightEmu),
  };
}

function insertPlanbeilage(zip: PizZip, offerte: Offerte): string {
  let xml = zip.file('word/document.xml')?.asText() || '';

  if (!offerte.planbeilage) {
    xml = xml.replace(/\{\{PLAN_RID\}\}/g, 'rId12');
    return xml;
  }

  const ext = offerte.planbeilage.mimeType === 'image/png' ? 'png' : 'jpeg';
  const imageData = Buffer.from(offerte.planbeilage.base64, 'base64');

  zip.file(`word/media/planbeilage_custom.${ext}`, imageData);

  // Relationship hinzufügen
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = zip.file(relsPath)?.asText() || '';

  const rIdMatches = rels.match(/Id="rId(\d+)"/g) || [];
  const maxId = Math.max(0, ...rIdMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')));
  const newRId = `rId${maxId + 1}`;

  const newRel = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/planbeilage_custom.${ext}"/>`;
  rels = rels.replace('</Relationships>', `${newRel}</Relationships>`);
  zip.file(relsPath, rels);

  // RID ersetzen
  xml = xml.replace(/\{\{PLAN_RID\}\}/g, newRId);

  // Proportionale Bildgrösse berechnen
  const { widthEmu, heightEmu } = calculateProportionalSize(
    offerte.planbeilage.width || 0,
    offerte.planbeilage.height || 0
  );

  // Bildgrösse im XML anpassen
  // wp:extent und a:ext haben beide cx (Breite) und cy (Höhe) Attribute
  xml = xml.replace(
    /(<wp:extent\s+cx=")(\d+)("\s+cy=")(\d+)(")/g,
    `$1${widthEmu}$3${heightEmu}$5`
  );
  xml = xml.replace(
    /(<a:ext\s+cx=")(\d+)("\s+cy=")(\d+)(")/g,
    `$1${widthEmu}$3${heightEmu}$5`
  );

  return xml;
}

// === HAUPTFUNKTION ===

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template_V6.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template nicht gefunden: ${templatePath}`);
  }

  const zip = new PizZip(fs.readFileSync(templatePath));
  let xml = zip.file('word/document.xml')?.asText() || '';

  // Daten vorbereiten
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
  const anfrage = formatAnfrageDatum(offerte.projekt.anfrageDatum);
  const offNr = parseOffertnummer(offerte.offertnummer);
  const einsatz = generiereEinsatzTexte(offerte.einsatzpauschalen);

  // Kontakt prüfen
  const hatKontakt = !!(offerte.empfaenger.anrede && offerte.empfaenger.nachname);
  let kontaktZeile = '';
  if (hatKontakt) {
    kontaktZeile = `${offerte.empfaenger.anrede} ${offerte.empfaenger.vorname} ${offerte.empfaenger.nachname}`.trim();
  }

  // Funktion aufteilen
  const funktionTeile = offerte.empfaenger.funktion?.split(' ') || [];
  const funktion1 = funktionTeile[0] || '';
  const funktion2 = funktionTeile.slice(1).join(' ') || '';

  // PLZ/Ort mit CH-
  const plzOrt = `CH-${offerte.empfaenger.plz} ${offerte.empfaenger.ort}`;

  // Total-Text (mit/ohne Rabatt)
  const total2 = offerte.kosten.rabattProzent > 0
    ? `l (inkl. ${offerte.kosten.rabattProzent.toFixed(1)}% Rabatt und inkl. `
    : 'l (inkl. ';

  // =====================================================
  // WICHTIG: ZUERST leere Zeilen entfernen (vor Ersetzung!)
  // =====================================================
  xml = entferneLeereFunktion(xml, offerte.empfaenger.funktion);
  xml = entferneLeerenKontakt(xml, hatKontakt);
  xml = entferneRabatt(xml, offerte.kosten.rabattProzent);

  // =====================================================
  // DANN Platzhalter ersetzen
  // =====================================================
  const replacements: Record<string, string> = {
    '{{ABSENDER_ADRESSE}}': standort.adresse,
    '{{FIRMA}}': offerte.empfaenger.firma,
    '{{KONTAKT_ZEILE}}': kontaktZeile,
    '{{FUNKTION_1}}': funktion1,
    '{{FUNKTION_2}}': funktion2 ? ` ${funktion2}` : '',
    '{{STRASSE}}': offerte.empfaenger.strasse,
    '{{PLZ_ORT}}': plzOrt,
    '{{ANREDE}}': generiereAnrede(offerte.empfaenger),
    '{{STANDORT}}': standort.name,
    '{{DATUM}}': formatDatumKurz(offerte.datum),
    '{{OFFNR_A}}': offNr.a,
    '{{OFFNR_B}}': offNr.b,
    '{{OFFNR_C}}': offNr.c,
    '{{OFFNR_D}}': offNr.d,
    '{{PROJEKT_ORT}}': offerte.projekt.ort,
    '{{PROJEKT_BEZ1}}': offerte.projekt.bezeichnung.split(' ')[0] || offerte.projekt.bezeichnung,
    '{{PROJEKT_BEZ2}}': offerte.projekt.bezeichnung.includes(' ')
      ? ' ' + offerte.projekt.bezeichnung.split(' ').slice(1).join(' ')
      : '',
    '{{ANF_TAG}}': anfrage.tag,
    '{{ANF_MONAT}}': anfrage.monat,
    '{{ANF_JAHR}}': anfrage.jahr,
    '{{PREIS_LEISTUNG}}': formatCHF(offerte.kosten.leistungspreis),
    '{{PREIS_RABATT}}': `-${formatCHF(kosten.rabattBetrag)}`,
    '{{PREIS_ZWISCHEN}}': formatCHF(kosten.zwischentotal),
    '{{PREIS_MWST}}': formatCHF(kosten.mwstBetrag),
    '{{PREIS_TOTAL}}': formatCHF(kosten.total),
    '{{RABATT_LABEL}}': `Rabatt ${offerte.kosten.rabattProzent.toFixed(1)}%`,
    '{{TOTAL_1}}': 'Total pauscha',
    '{{TOTAL_2}}': total2,
    '{{VORLAUFZEIT}}': offerte.vorlaufzeit,
    '{{EIN_Z1}}': einsatz.z1,
    '{{EIN_Z2}}': einsatz.z2,
    '{{EIN_WORT}}': einsatz.wort,
    '{{EIN_TAGE_1}}': einsatz.tage1,
    '{{EIN_TAGE_2}}': einsatz.tage2,
  };

  for (const [ph, val] of Object.entries(replacements)) {
    xml = xml.split(ph).join(val);
  }

  // Checkboxen setzen
  xml = setCheckboxen(xml, offerte);

  // Speichern
  zip.file('word/document.xml', xml);

  // Planbeilage
  xml = insertPlanbeilage(zip, offerte);
  zip.file('word/document.xml', xml);

  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
