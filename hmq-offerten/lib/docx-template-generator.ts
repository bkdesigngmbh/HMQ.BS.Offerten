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

// === HELPER FUNKTIONEN ===

function formatDatumKurz(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function formatDatumTeile(isoDate: string): { tag: string; monat: string; jahr: string } {
  if (!isoDate) return { tag: '', monat: '', jahr: '' };
  const d = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return {
    tag: `${d.getDate()}.`,
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

function getEinsatzpauschaleText(anzahl: number): string {
  switch (anzahl) {
    case 1: return 'eine Einsatzpauschale';
    case 2: return 'zwei Einsatzpauschalen';
    case 3: return 'drei Einsatzpauschalen';
    case 4: return 'vier Einsatzpauschalen';
    default: return 'zwei Einsatzpauschalen';
  }
}

// === CHECKBOX FUNKTIONEN ===

function setCheckboxen(xml: string, offerte: Offerte): string {
  // Checkbox-Reihenfolge im Dokument (37 Stück)
  const states: boolean[] = [
    // 1.1 Art Bauvorhaben (0-3)
    offerte.checkboxen.artBauvorhaben.neubau,
    offerte.checkboxen.artBauvorhaben.umbau,
    offerte.checkboxen.artBauvorhaben.rueckbau,
    !!offerte.checkboxen.artBauvorhaben.sonstiges,
    // Art Gebäude (4-11)
    offerte.checkboxen.artGebaeude.efhFreistehend,
    offerte.checkboxen.artGebaeude.reihenhaus,
    offerte.checkboxen.artGebaeude.terrassenhaus,
    offerte.checkboxen.artGebaeude.mfh,
    offerte.checkboxen.artGebaeude.strassen,
    offerte.checkboxen.artGebaeude.kunstbauten,
    !!offerte.checkboxen.artGebaeude.sonstiges1,
    !!offerte.checkboxen.artGebaeude.sonstiges2,
    // 1.2 Tätigkeiten (12-19)
    offerte.checkboxen.taetigkeiten.aushub,
    offerte.checkboxen.taetigkeiten.rammarbeiten,
    offerte.checkboxen.taetigkeiten.mikropfaehle,
    offerte.checkboxen.taetigkeiten.baustellenverkehr,
    offerte.checkboxen.taetigkeiten.schwereMaschinen,
    offerte.checkboxen.taetigkeiten.sprengungen,
    offerte.checkboxen.taetigkeiten.diverses,
    !!offerte.checkboxen.taetigkeiten.sonstiges,
    // 2.1 Koordination (20-23)
    offerte.checkboxen.koordination.schriftlicheInfo,
    offerte.checkboxen.koordination.terminvereinbarung,
    offerte.checkboxen.koordination.durchAuftraggeber,
    !!offerte.checkboxen.koordination.sonstiges,
    // 2.2 Erstaufnahme (24-30)
    offerte.checkboxen.erstaufnahme.fassaden,
    offerte.checkboxen.erstaufnahme.strassen,
    offerte.checkboxen.erstaufnahme.strassenBelag,
    offerte.checkboxen.erstaufnahme.strassenRand,
    offerte.checkboxen.erstaufnahme.innenraeume,
    offerte.checkboxen.erstaufnahme.aussenanlagen,
    !!offerte.checkboxen.erstaufnahme.sonstiges,
    // 2.3 Dokumentation (31-36)
    offerte.checkboxen.dokumentation.rissprotokoll,
    offerte.checkboxen.dokumentation.fotoAussen,
    offerte.checkboxen.dokumentation.fotoInnen,
    offerte.checkboxen.dokumentation.fotoStrasse,
    offerte.checkboxen.dokumentation.zustellbestaetigung,
    offerte.checkboxen.dokumentation.datenabgabe,
  ];

  // Ersetze w14:checked val="0" durch val="1" für aktivierte Checkboxen
  let checkboxIndex = 0;
  xml = xml.replace(/<w14:checkbox>([\s\S]*?)<\/w14:checkbox>/g, (match) => {
    const shouldBeChecked = states[checkboxIndex] || false;
    checkboxIndex++;

    if (shouldBeChecked) {
      // Setze checked auf 1
      return match.replace(
        /<w14:checked w14:val="0"\/>/,
        '<w14:checked w14:val="1"/>'
      );
    }
    return match;
  });

  // Ersetze auch die Symbole ☐ durch ☒
  checkboxIndex = 0;
  xml = xml.replace(/<w:t>☐<\/w:t>/g, () => {
    const shouldBeChecked = states[checkboxIndex] || false;
    checkboxIndex++;
    return shouldBeChecked ? '<w:t>☒</w:t>' : '<w:t>☐</w:t>';
  });

  return xml;
}

// === RABATT-ZEILE ENTFERNEN ===

function entferneRabattZeile(xml: string, rabattProzent: number): string {
  if (rabattProzent > 0) return xml;

  // Finde und entferne die Tabellenzeile mit "Rabatt" oder {{RABATT_ZEILE}}
  // Pattern: <w:tr>...(Rabatt|{{RABATT_ZEILE}})...</w:tr>
  xml = xml.replace(
    /<w:tr[^>]*>(?:(?!<\/w:tr>).)*(?:Rabatt|\{\{RABATT_ZEILE\}\})(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
    ''
  );

  return xml;
}

// === GELBE HIGHLIGHTS ENTFERNEN ===

function entferneGelbeHighlights(xml: string): string {
  // Entferne alle <w:highlight w:val="yellow"/> Tags
  xml = xml.replace(/<w:highlight w:val="yellow"\/>/g, '');
  return xml;
}

// === LEERE FUNKTION-ZEILE ENTFERNEN ===

function entferneLeereFunktionZeile(xml: string, empfaenger: Offerte['empfaenger']): string {
  // Wenn keine Funktion angegeben ist, entferne die Zeile komplett
  if (!empfaenger.funktion || !empfaenger.funktion.trim()) {
    // Entferne den ganzen Absatz der die Funktion enthält
    xml = xml.replace(
      /<w:p[^>]*>(?:(?!<\/w:p>).)*\{\{FUNKTION\}\}(?:(?!<\/w:p>).)*<\/w:p>/gs,
      ''
    );
  }
  return xml;
}

// === LEERE KONTAKT-ZEILE ENTFERNEN ===

function entferneLeereKontaktZeile(xml: string, empfaenger: Offerte['empfaenger']): string {
  // Wenn keine Kontaktperson angegeben ist, entferne die Zeile komplett
  if (!empfaenger.anrede || !empfaenger.nachname) {
    xml = xml.replace(
      /<w:p[^>]*>(?:(?!<\/w:p>).)*\{\{KONTAKT_ZEILE\}\}(?:(?!<\/w:p>).)*<\/w:p>/gs,
      ''
    );
  }
  return xml;
}

// === BILD ERSETZEN ===

function ersetzePlanbeilage(zip: PizZip, offerte: Offerte): void {
  if (!offerte.planbeilage) {
    return; // Placeholder-Bild bleibt
  }

  const imageData = Buffer.from(offerte.planbeilage.base64, 'base64');

  // Finde das existierende Planbeilage-Bild im Template und ersetze es
  // Das Template hat ein Placeholder-Bild, wir müssen herausfinden welches
  const mediaFiles = Object.keys(zip.files).filter(f => f.startsWith('word/media/'));

  // Suche in document.xml.rels nach dem Bild mit "Planbeilage" oder dem letzten Bild
  const relsPath = 'word/_rels/document.xml.rels';
  const rels = zip.file(relsPath)?.asText() || '';

  // Finde alle Bild-Relationships
  const imageRels = rels.match(/Relationship[^>]*Target="media\/[^"]+"/g) || [];

  if (imageRels.length > 0) {
    // Nimm das letzte Bild (typischerweise das Planbeilage-Bild)
    const lastImageRel = imageRels[imageRels.length - 1];
    const targetMatch = lastImageRel.match(/Target="(media\/[^"]+)"/);

    if (targetMatch) {
      const targetPath = `word/${targetMatch[1]}`;
      const ext = offerte.planbeilage.mimeType === 'image/png' ? 'png' : 'jpeg';

      // Lösche das alte Bild
      if (zip.files[targetPath]) {
        delete zip.files[targetPath];
      }

      // Erstelle neuen Pfad mit korrekter Erweiterung
      const newTargetPath = targetPath.replace(/\.[^.]+$/, `.${ext}`);

      // Füge neues Bild hinzu
      zip.file(newTargetPath, imageData);

      // Update die Relationship wenn sich die Erweiterung geändert hat
      if (newTargetPath !== targetPath) {
        const newRels = rels.replace(targetMatch[1], targetMatch[1].replace(/\.[^.]+$/, `.${ext}`));
        zip.file(relsPath, newRels);

        // Update auch [Content_Types].xml
        let contentTypes = zip.file('[Content_Types].xml')?.asText() || '';
        if (!contentTypes.includes(`Extension="${ext}"`)) {
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          contentTypes = contentTypes.replace(
            '</Types>',
            `<Default Extension="${ext}" ContentType="${mimeType}"/></Types>`
          );
          zip.file('[Content_Types].xml', contentTypes);
        }
      }
    }
  }
}

// === HAUPTFUNKTION ===

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  // Template laden (Original-Template, nicht V2)
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template nicht gefunden: ${templatePath}`);
  }

  const templateContent = fs.readFileSync(templatePath);
  const zip = new PizZip(templateContent);

  // document.xml lesen
  let xml = zip.file('word/document.xml')?.asText() || '';

  // Gelbe Highlights entfernen
  xml = entferneGelbeHighlights(xml);

  // Daten vorbereiten
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
  const anfrage = formatDatumTeile(offerte.projekt.anfrageDatum);

  // Kontaktzeile
  let kontaktZeile = '';
  if (offerte.empfaenger.anrede && offerte.empfaenger.nachname) {
    kontaktZeile = `${offerte.empfaenger.anrede} ${offerte.empfaenger.vorname} ${offerte.empfaenger.nachname}`.trim();
  }

  // Offertnummer parsen (Format: 51.25.405)
  const offertNrTeile = offerte.offertnummer.split('.');
  const offertNr1 = offertNrTeile[0] ? `${offertNrTeile[0]}.` : '';

  // Total-Zeile Text (mit oder ohne Rabatt-Hinweis)
  const totalZeileText = offerte.kosten.rabattProzent > 0
    ? `Total inkl. MwSt. ${MWST_SATZ}% (inkl. Rabatt ${offerte.kosten.rabattProzent.toFixed(1)}%)`
    : `Total inkl. MwSt. ${MWST_SATZ}%`;

  // === PLATZHALTER ERSETZEN ===
  const replacements: [string, string][] = [
    // Empfänger
    ['{{FIRMA}}', offerte.empfaenger.firma],
    ['{{KONTAKT_ZEILE}}', kontaktZeile],
    ['{{FUNKTION}}', offerte.empfaenger.funktion || ''],
    ['{{STRASSE}}', offerte.empfaenger.strasse],
    ['{{PLZ_ORT}}', offerte.empfaenger.plzOrt],

    // Anrede
    ['{{ANREDE}}', generiereAnrede(offerte.empfaenger)],

    // Datum & Standort
    ['{{DATUM}}', formatDatumKurz(offerte.datum)],
    ['{{STANDORT_ORT}}', standort],

    // Offertnummer
    ['{{OFFERT_NR}}', offerte.offertnummer],
    ['{{OFFERT_NR_1}}', offertNr1],

    // Projekt - Bezeichnung nicht mehr aufteilen!
    ['{{PROJEKT_ORT}}', offerte.projekt.ort],
    ['{{PROJEKT_BEZEICHNUNG}}', offerte.projekt.bezeichnung],

    // Anfragedatum - alle Varianten
    ['{{ANFRAGE_TAG}}', anfrage.tag],
    ['{{ANFRAGE_MONAT}}', anfrage.monat],
    ['{{ANFRAGE_JAHR}}', anfrage.jahr],
    ['{{ANFRAGE_DATUM}}', formatDatumKurz(offerte.projekt.anfrageDatum)],

    // Kosten
    ['{{PREIS_LEISTUNG}}', formatCHF(offerte.kosten.leistungspreis)],
    ['{{PREIS_RABATT}}', `-${formatCHF(kosten.rabattBetrag)}`],
    ['{{PREIS_ZWISCHEN}}', formatCHF(kosten.zwischentotal)],
    ['{{PREIS_MWST}}', formatCHF(kosten.mwstBetrag)],
    ['{{PREIS_TOTAL}}', formatCHF(kosten.total)],
    ['{{RABATT_ZEILE}}', `Rabatt ${offerte.kosten.rabattProzent.toFixed(1)}%`],
    ['{{RABATT_PROZENT}}', `${offerte.kosten.rabattProzent.toFixed(1)}%`],
    ['{{TOTAL_ZEILE}}', totalZeileText],

    // Vorlaufzeit
    ['{{VORLAUFZEIT}}', offerte.vorlaufzeit],

    // Einsatzpauschalen
    ['{{EINSATZPAUSCHALEN}}', getEinsatzpauschaleText(offerte.einsatzpauschalen)],

    // Sonstiges-Felder für Checkboxen
    ['{{SONSTIGES_ART_BAUVORHABEN}}', offerte.checkboxen.artBauvorhaben.sonstiges || ''],
    ['{{SONSTIGES_ART_GEBAEUDE_1}}', offerte.checkboxen.artGebaeude.sonstiges1 || ''],
    ['{{SONSTIGES_ART_GEBAEUDE_2}}', offerte.checkboxen.artGebaeude.sonstiges2 || ''],
    ['{{SONSTIGES_TAETIGKEITEN}}', offerte.checkboxen.taetigkeiten.sonstiges || ''],
    ['{{SONSTIGES_KOORDINATION}}', offerte.checkboxen.koordination.sonstiges || ''],
    ['{{SONSTIGES_ERSTAUFNAHME}}', offerte.checkboxen.erstaufnahme.sonstiges || ''],
  ];

  for (const [placeholder, value] of replacements) {
    xml = xml.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  // Leere Zeilen entfernen
  xml = entferneLeereFunktionZeile(xml, offerte.empfaenger);
  xml = entferneLeereKontaktZeile(xml, offerte.empfaenger);

  // Checkboxen setzen
  xml = setCheckboxen(xml, offerte);

  // Rabatt-Zeile entfernen wenn 0%
  xml = entferneRabattZeile(xml, offerte.kosten.rabattProzent);

  // XML speichern
  zip.file('word/document.xml', xml);

  // Planbeilage ersetzen (wenn vorhanden)
  ersetzePlanbeilage(zip, offerte);

  // Buffer generieren
  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return Buffer.from(buffer);
}
