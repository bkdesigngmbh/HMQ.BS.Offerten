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

// === BILD EINFÜGEN ===

function insertPlanbeilage(zip: PizZip, offerte: Offerte): string {
  if (!offerte.planbeilage) {
    // Platzhalter entfernen wenn kein Bild
    let xml = zip.file('word/document.xml')?.asText() || '';
    xml = xml.replace(/\{\{PLANBEILAGE_BILD\}\}/g, '');
    return xml;
  }

  const ext = offerte.planbeilage.mimeType === 'image/png' ? 'png' : 'jpeg';
  const imageData = Buffer.from(offerte.planbeilage.base64, 'base64');

  // Bild hinzufügen
  zip.file(`word/media/planbeilage.${ext}`, imageData);

  // Relationship hinzufügen
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = zip.file(relsPath)?.asText() || '';

  // Nächste freie rId finden
  const rIdMatches = rels.match(/Id="rId(\d+)"/g) || [];
  const maxId = Math.max(0, ...rIdMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')));
  const newRId = `rId${maxId + 1}`;

  // Neue Relationship einfügen
  rels = rels.replace(
    '</Relationships>',
    `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/planbeilage.${ext}"/></Relationships>`
  );
  zip.file(relsPath, rels);

  // Bild-XML erstellen
  const imageXml = `</w:t></w:r></w:p><w:p>
    <w:r>
      <w:drawing>
        <wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
          <wp:extent cx="5400000" cy="3600000"/>
          <wp:docPr id="1" name="Planbeilage"/>
          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                <pic:nvPicPr>
                  <pic:cNvPr id="0" name="planbeilage.${ext}"/>
                  <pic:cNvPicPr/>
                </pic:nvPicPr>
                <pic:blipFill>
                  <a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="${newRId}"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </pic:blipFill>
                <pic:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="5400000" cy="3600000"/></a:xfrm>
                  <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                </pic:spPr>
              </pic:pic>
            </a:graphicData>
          </a:graphic>
        </wp:inline>
      </w:drawing>
    </w:r>
  </w:p><w:p><w:r><w:t>`;

  // Platzhalter ersetzen
  let xml = zip.file('word/document.xml')?.asText() || '';
  xml = xml.replace('{{PLANBEILAGE_BILD}}', imageXml);

  return xml;
}

// === HAUPTFUNKTION ===

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  // Template laden
  const templatePath = path.join(process.cwd(), 'public', 'Offerte_Template_V2.docx');

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template nicht gefunden: ${templatePath}`);
  }

  const templateContent = fs.readFileSync(templatePath);
  const zip = new PizZip(templateContent);

  // document.xml lesen
  let xml = zip.file('word/document.xml')?.asText() || '';

  // Daten vorbereiten
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;
  const kosten = berechneKosten(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
  const anfrage = formatDatumTeile(offerte.projekt.anfrageDatum);

  // Kontaktzeile
  let kontaktZeile = '';
  if (offerte.empfaenger.anrede && offerte.empfaenger.nachname) {
    kontaktZeile = `${offerte.empfaenger.anrede} ${offerte.empfaenger.vorname} ${offerte.empfaenger.nachname}`.trim();
  }

  // Funktion aufteilen
  const funktionTeile = offerte.empfaenger.funktion?.split(' ') || ['', ''];
  const funktion1 = funktionTeile[0] || '';
  const funktion2 = funktionTeile.slice(1).join(' ') || '';

  // Offertnummer parsen (Format: 51.25.405)
  const offertNrTeile = offerte.offertnummer.split('.');
  const offertNr1 = offertNrTeile[0] ? `${offertNrTeile[0]}.` : '';

  // === PLATZHALTER ERSETZEN ===
  const replacements: [string, string][] = [
    // Empfänger
    ['{{FIRMA}}', offerte.empfaenger.firma],
    ['{{KONTAKT_ZEILE}}', kontaktZeile],
    ['{{FUNKTION_1}}', funktion1],
    ['{{FUNKTION_2}}', funktion2 ? ` ${funktion2}` : ''],
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

    // Projekt
    ['{{PROJEKT_ORT}}', offerte.projekt.ort],
    ['{{PROJEKT_STRASSE}}', offerte.projekt.bezeichnung.split(' ')[0] || ''],
    ['{{PROJEKT_REST}}', offerte.projekt.bezeichnung.split(' ').slice(1).join(' ') || ''],

    // Anfragedatum
    ['{{ANFRAGE_TAG}}', anfrage.tag],
    ['{{ANFRAGE_MONAT}}', anfrage.monat],
    ['{{ANFRAGE_JAHR}}', anfrage.jahr],

    // Kosten
    ['{{PREIS_LEISTUNG}}', formatCHF(offerte.kosten.leistungspreis)],
    ['{{PREIS_RABATT}}', `-${formatCHF(kosten.rabattBetrag)}`],
    ['{{PREIS_ZWISCHEN}}', formatCHF(kosten.zwischentotal)],
    ['{{PREIS_MWST}}', formatCHF(kosten.mwstBetrag)],
    ['{{PREIS_TOTAL}}', formatCHF(kosten.total)],
    ['{{RABATT_ZEILE}}', `Rabatt ${offerte.kosten.rabattProzent.toFixed(1)}%`],
    ['{{RABATT_PROZENT}}', `${offerte.kosten.rabattProzent.toFixed(1)}%`],

    // Vorlaufzeit
    ['{{VORLAUFZEIT}}', offerte.vorlaufzeit],
  ];

  for (const [placeholder, value] of replacements) {
    xml = xml.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  }

  // Checkboxen setzen
  xml = setCheckboxen(xml, offerte);

  // Rabatt-Zeile entfernen wenn 0%
  xml = entferneRabattZeile(xml, offerte.kosten.rabattProzent);

  // XML speichern (vor Bild-Einfügung)
  zip.file('word/document.xml', xml);

  // Planbeilage einfügen
  if (offerte.planbeilage) {
    xml = insertPlanbeilage(zip, offerte);
    zip.file('word/document.xml', xml);
  } else {
    // Platzhalter entfernen
    xml = xml.replace(/\{\{PLANBEILAGE_BILD\}\}/g, '');
    zip.file('word/document.xml', xml);
  }

  // Buffer generieren
  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return Buffer.from(buffer);
}
