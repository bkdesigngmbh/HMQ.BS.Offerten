import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { Offerte } from './types';
import fs from 'fs';
import path from 'path';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';

// Stammdaten
const STANDORTE: Record<string, { ort: string }> = {
  zh: { ort: 'Zürich-Opfikon' },
  gr: { ort: 'Chur' },
  ag: { ort: 'Zofingen' },
};

const MWST_SATZ = 8.1;

// Datum formatieren: "15. Januar 2025"
function formatDatumLang(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${date.getDate()}. ${monate[date.getMonth()]} ${date.getFullYear()}`;
}

// Datum formatieren: "15.01.2025"
function formatDatumKurz(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getFullYear()}`;
}

// Schweizer Währungsformat: 6'690.00
function formatCHF(amount: number): string {
  return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

// Kosten berechnen
function berechneKosten(leistungspreis: number, rabattProzent: number) {
  const rabattBetrag = leistungspreis * (rabattProzent / 100);
  const zwischentotal = leistungspreis - rabattBetrag;
  const mwstBetrag = zwischentotal * (MWST_SATZ / 100);
  const total = zwischentotal + mwstBetrag;
  return { rabattBetrag, zwischentotal, mwstBetrag, total };
}

// Offertnummer parsen: "51.25.405" → { nr1: "51", nr2: "2", nr3: "5", nr4: "405" }
function parseOffertnummer(nr: string): { nr1: string; nr2: string; nr3: string; nr4: string } {
  const parts = nr.split('.');
  if (parts.length === 3) {
    // Format: 51.25.405
    const teil2 = parts[1]; // "25"
    return {
      nr1: parts[0] + '.', // "51."
      nr2: teil2[0],       // "2"
      nr3: teil2[1],       // "5"
      nr4: parts[2],       // "405"
    };
  }
  return { nr1: nr, nr2: '', nr3: '', nr4: '' };
}

// Anfragedatum parsen
function parseAnfrageDatum(isoDate: string): { tag: string; monat: string; jahr: string } {
  if (!isoDate) return { tag: '', monat: '', jahr: '' };
  const date = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return {
    tag: date.getDate() + '.',
    monat: monate[date.getMonth()],
    jahr: date.getFullYear().toString(),
  };
}

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  // Template laden
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template.docx');
  const templateContent = fs.readFileSync(templatePath, 'binary');

  const zip = new PizZip(templateContent);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: '{{', end: '}}' },
  });

  // Kosten berechnen
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);

  // Offertnummer parsen
  const offertNr = parseOffertnummer(offerte.offertnummer);

  // Anfragedatum parsen
  const anfrage = parseAnfrageDatum(offerte.projekt.anfrageDatum);

  // Standort
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;

  // Empfänger aufbereiten
  const empfaengerZeile1 = offerte.empfaenger.anrede
    ? `${offerte.empfaenger.anrede} ${offerte.empfaenger.name}`
    : offerte.empfaenger.name;

  // Zusatz aufteilen (falls "dipl. Ingenieur ETH/SIA" Format)
  let zusatz1 = '';
  let zusatz2 = '';
  if (offerte.empfaenger.zusatz) {
    const zusatzParts = offerte.empfaenger.zusatz.split(' ');
    if (zusatzParts.length > 1) {
      zusatz1 = zusatzParts[0]; // "dipl."
      zusatz2 = ' ' + zusatzParts.slice(1).join(' '); // " Ingenieur ETH/SIA"
    } else {
      zusatz1 = offerte.empfaenger.zusatz;
    }
  }

  // Daten für Template
  const data = {
    // Empfänger
    EMPFAENGER_ANREDE_NAME: empfaengerZeile1,
    EMPFAENGER_ZUSATZ_1: zusatz1,
    EMPFAENGER_ZUSATZ_2: zusatz2,
    EMPFAENGER_STRASSE: offerte.empfaenger.strasse,
    EMPFAENGER_PLZORT: offerte.empfaenger.plzOrt,

    // Standort & Datum
    STANDORT_ORT: standort.ort,
    DATUM: formatDatumKurz(offerte.datum),

    // Offertnummer (aufgeteilt)
    OFFERT_NR_1: offertNr.nr1,
    OFFERT_NR_2: offertNr.nr2,
    OFFERT_NR_3: offertNr.nr3,
    OFFERT_NR_4: offertNr.nr4,

    // Projekt
    PROJEKT_ORT: offerte.projekt.ort,
    PROJEKT_STRASSE: '', // Wird aus bezeichnung extrahiert falls nötig
    PROJEKT_BEZEICHNUNG: offerte.projekt.bezeichnung,

    // Anfragedatum (aufgeteilt)
    ANFRAGE_TAG: anfrage.tag,
    ANFRAGE_MONAT: anfrage.monat,
    ANFRAGE_JAHR: anfrage.jahr,

    // Kosten
    PREIS_LEISTUNG: formatCHF(offerte.kosten.leistungspreis),
    PREIS_RABATT_BETRAG: '-' + formatCHF(kosten.rabattBetrag),
    PREIS_ZWISCHEN: formatCHF(kosten.zwischentotal),
    PREIS_MWST: formatCHF(kosten.mwstBetrag),
    PREIS_TOTAL: formatCHF(kosten.total),
    RABATT_PROZENT: offerte.kosten.rabattProzent.toFixed(1) + '%',

    // Termine
    VORLAUFZEIT: offerte.vorlaufzeit,
  };

  // Template rendern
  doc.render(data);

  // Buffer generieren
  const buf = doc.getZip().generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return buf;
}

// Checkbox im XML setzen
function setCheckboxInXml(xmlContent: string, checkboxIndex: number, checked: boolean): string {
  // Checkbox-Symbol: ☐ (unchecked) oder ☒ (checked)
  const uncheckedSymbol = '☐';
  const checkedSymbol = '☒';

  // Finde alle w14:checkbox Elemente
  const checkboxPattern = /<w14:checkbox>[\s\S]*?<\/w14:checkbox>/g;
  const matches = xmlContent.match(checkboxPattern);

  if (matches && matches[checkboxIndex]) {
    const originalCheckbox = matches[checkboxIndex];
    let newCheckbox = originalCheckbox;

    if (checked) {
      // Setze w14:checked auf 1
      newCheckbox = newCheckbox.replace(
        /<w14:checked w14:val="0"\/>/,
        '<w14:checked w14:val="1"/>'
      );
      // Falls kein checked Element existiert, füge es hinzu
      if (!newCheckbox.includes('w14:checked')) {
        newCheckbox = newCheckbox.replace(
          '<w14:checkbox>',
          '<w14:checkbox><w14:checked w14:val="1"/>'
        );
      }
    } else {
      newCheckbox = newCheckbox.replace(
        /<w14:checked w14:val="1"\/>/,
        '<w14:checked w14:val="0"/>'
      );
    }

    xmlContent = xmlContent.replace(originalCheckbox, newCheckbox);
  }

  // Auch das Symbol im Text ersetzen
  let symbolCount = 0;
  xmlContent = xmlContent.replace(new RegExp(uncheckedSymbol, 'g'), (match) => {
    if (symbolCount === checkboxIndex) {
      symbolCount++;
      return checked ? checkedSymbol : uncheckedSymbol;
    }
    symbolCount++;
    return match;
  });

  return xmlContent;
}

// Erweiterte Generierung mit Checkbox-Support
export async function generateOfferteFromTemplateWithCheckboxes(offerte: Offerte): Promise<Buffer> {
  // Erst normale Platzhalter ersetzen
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template.docx');
  const templateContent = fs.readFileSync(templatePath);

  const zip = new PizZip(templateContent);

  // document.xml lesen
  let documentXml = zip.file('word/document.xml')?.asText() || '';

  // Platzhalter ersetzen (wie oben)
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
  const offertNr = parseOffertnummer(offerte.offertnummer);
  const anfrage = parseAnfrageDatum(offerte.projekt.anfrageDatum);
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;

  const empfaengerZeile1 = offerte.empfaenger.anrede
    ? `${offerte.empfaenger.anrede} ${offerte.empfaenger.name}`
    : offerte.empfaenger.name;

  const replacements: [string, string][] = [
    ['{{EMPFAENGER_ANREDE_NAME}}', empfaengerZeile1],
    ['{{EMPFAENGER_ZUSATZ_1}}', offerte.empfaenger.zusatz?.split(' ')[0] || ''],
    ['{{EMPFAENGER_ZUSATZ_2}}', offerte.empfaenger.zusatz ? ' ' + offerte.empfaenger.zusatz.split(' ').slice(1).join(' ') : ''],
    ['{{EMPFAENGER_STRASSE}}', offerte.empfaenger.strasse],
    ['{{EMPFAENGER_PLZORT}}', offerte.empfaenger.plzOrt],
    ['{{STANDORT_ORT}}', standort.ort],
    ['{{DATUM}}', formatDatumKurz(offerte.datum)],
    ['{{OFFERT_NR_1}}', offertNr.nr1],
    ['{{OFFERT_NR_2}}', offertNr.nr2],
    ['{{OFFERT_NR_3}}', offertNr.nr3],
    ['{{OFFERT_NR_4}}', offertNr.nr4 || ''],
    ['{{PROJEKT_ORT}}', offerte.projekt.ort],
    ['{{PROJEKT_STRASSE}}', ''],
    ['{{PROJEKT_BEZEICHNUNG}}', offerte.projekt.bezeichnung],
    ['{{ANFRAGE_TAG}}', anfrage.tag],
    ['{{ANFRAGE_MONAT}}', anfrage.monat],
    ['{{ANFRAGE_JAHR}}', anfrage.jahr],
    ['{{PREIS_LEISTUNG}}', formatCHF(offerte.kosten.leistungspreis)],
    ['{{PREIS_RABATT_BETRAG}}', '-' + formatCHF(kosten.rabattBetrag)],
    ['{{PREIS_ZWISCHEN}}', formatCHF(kosten.zwischentotal)],
    ['{{PREIS_MWST}}', formatCHF(kosten.mwstBetrag)],
    ['{{PREIS_TOTAL}}', formatCHF(kosten.total)],
    ['{{RABATT_PROZENT}}', offerte.kosten.rabattProzent.toFixed(1) + '%'],
    ['{{VORLAUFZEIT}}', offerte.vorlaufzeit],
  ];

  for (const [placeholder, value] of replacements) {
    documentXml = documentXml.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  // Checkboxen setzen (Index-basiert)
  const checkboxMapping: [number, boolean][] = [
    // 1.1 Art des Bauvorhabens
    [0, offerte.checkboxen.artBauvorhaben.neubau],
    [1, offerte.checkboxen.artBauvorhaben.umbau],
    [2, offerte.checkboxen.artBauvorhaben.rueckbau],
    [3, !!offerte.checkboxen.artBauvorhaben.sonstiges],

    // Art des Gebäudes
    [4, offerte.checkboxen.artGebaeude.efhFreistehend],
    [5, offerte.checkboxen.artGebaeude.reihenhaus],
    [6, offerte.checkboxen.artGebaeude.terrassenhaus],
    [7, offerte.checkboxen.artGebaeude.mfh],
    [8, offerte.checkboxen.artGebaeude.strassen],
    [9, offerte.checkboxen.artGebaeude.kunstbauten],
    [10, !!offerte.checkboxen.artGebaeude.sonstiges1],
    [11, !!offerte.checkboxen.artGebaeude.sonstiges2],

    // 1.2 Tätigkeiten
    [12, offerte.checkboxen.taetigkeiten.aushub],
    [13, offerte.checkboxen.taetigkeiten.rammarbeiten],
    [14, offerte.checkboxen.taetigkeiten.mikropfaehle],
    [15, offerte.checkboxen.taetigkeiten.baustellenverkehr],
    [16, offerte.checkboxen.taetigkeiten.schwereMaschinen],
    [17, offerte.checkboxen.taetigkeiten.sprengungen],
    [18, offerte.checkboxen.taetigkeiten.diverses],
    [19, !!offerte.checkboxen.taetigkeiten.sonstiges],

    // 2.1 Koordination
    [20, offerte.checkboxen.koordination.schriftlicheInfo],
    [21, offerte.checkboxen.koordination.terminvereinbarung],
    [22, offerte.checkboxen.koordination.durchAuftraggeber],
    [23, !!offerte.checkboxen.koordination.sonstiges],

    // 2.2 Erstaufnahme
    [24, offerte.checkboxen.erstaufnahme.fassaden],
    [25, offerte.checkboxen.erstaufnahme.strassen],
    [26, offerte.checkboxen.erstaufnahme.strassenBelag],
    [27, offerte.checkboxen.erstaufnahme.strassenRand],
    [28, offerte.checkboxen.erstaufnahme.innenraeume],
    [29, offerte.checkboxen.erstaufnahme.aussenanlagen],
    [30, !!offerte.checkboxen.erstaufnahme.sonstiges],

    // 2.3 Dokumentation
    [31, offerte.checkboxen.dokumentation.rissprotokoll],
    [32, offerte.checkboxen.dokumentation.fotoAussen],
    [33, offerte.checkboxen.dokumentation.fotoInnen],
    [34, offerte.checkboxen.dokumentation.fotoStrasse],
    [35, offerte.checkboxen.dokumentation.zustellbestaetigung],
    [36, offerte.checkboxen.dokumentation.datenabgabe],
  ];

  // Checkboxen im XML setzen
  for (const [index, checked] of checkboxMapping) {
    documentXml = setCheckboxInXml(documentXml, index, checked);
  }

  // Aktualisierte document.xml speichern
  zip.file('word/document.xml', documentXml);

  // Buffer generieren
  const buf = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return Buffer.from(buf);
}
