import PizZip from 'pizzip';
import { Offerte } from './types';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

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

// === LEGENDE MIT PNG-BILDERN ===

// CRC32 Tabelle und Funktion (für PNG-Erstellung)
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}
function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// PNG-Erstellung: Erzeugt ein einfaches PNG mit einer Farbe
function createPng(width: number, height: number, r: number, g: number, b: number, alpha: number): Buffer {
  // PNG Signatur
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  // Chunk erstellen
  const createChunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = Buffer.alloc(4);
    crcValue.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crcValue]);
  };

  // IHDR Chunk (Image Header)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);   // Breite
  ihdr.writeUInt32BE(height, 4);  // Höhe
  ihdr.writeUInt8(8, 8);          // Bit depth
  ihdr.writeUInt8(6, 9);          // Color type (RGBA)
  ihdr.writeUInt8(0, 10);         // Compression
  ihdr.writeUInt8(0, 11);         // Filter
  ihdr.writeUInt8(0, 12);         // Interlace

  // Raw Bilddaten (RGBA für jeden Pixel, mit Filter-Byte pro Zeile)
  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte (none)
    for (let x = 0; x < width; x++) {
      rawData.push(r, g, b, alpha);
    }
  }
  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);

  // IDAT Chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    idatChunk,
    iendChunk
  ]);
}

// PNG mit horizontaler Linie erstellen (zentriert in Bild mit transparentem Hintergrund)
function createLinePng(width: number, height: number, lineHeight: number, r: number, g: number, b: number, alpha: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const createChunk = (type: string, data: Buffer): Buffer => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const typeBuffer = Buffer.from(type);
    const crcData = Buffer.concat([typeBuffer, data]);
    const crcValue = Buffer.alloc(4);
    crcValue.writeUInt32BE(crc32(crcData), 0);
    return Buffer.concat([length, typeBuffer, data, crcValue]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);   // Bit depth
  ihdr.writeUInt8(6, 9);   // Color type (RGBA)
  ihdr.writeUInt8(0, 10);  // Compression
  ihdr.writeUInt8(0, 11);  // Filter
  ihdr.writeUInt8(0, 12);  // Interlace

  // Berechne wo die Linie vertikal zentriert sein soll
  const lineStart = Math.floor((height - lineHeight) / 2);
  const lineEnd = lineStart + lineHeight;

  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte
    for (let x = 0; x < width; x++) {
      if (y >= lineStart && y < lineEnd) {
        // Linie zeichnen
        rawData.push(r, g, b, alpha);
      } else {
        // Transparent
        rawData.push(0, 0, 0, 0);
      }
    }
  }
  const rawBuffer = Buffer.from(rawData);
  const compressed = zlib.deflateSync(rawBuffer);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

// Legende-Symbole als PNG erstellen - ALLE 40px BREIT, ALLE 15px HOCH
function createLegendSymbols(): { fassade: Buffer; innenraum: Buffer; strasse: Buffer } {
  // Fassade: Rote Linie 4px hoch, zentriert in 15px hohem Bild (40x15 Pixel, #FF0000, 60% Opazität = 153)
  const fassade = createLinePng(40, 15, 4, 255, 0, 0, 153);

  // Innenaufnahmen: Blaues Rechteck (40x15 Pixel, #4F81BD, 60% Opazität)
  const innenraum = createPng(40, 15, 79, 129, 189, 153);

  // Strassen: Oranges Rechteck (40x15 Pixel, #FAC090, 60% Opazität)
  const strasse = createPng(40, 15, 250, 192, 144, 153);

  return { fassade, innenraum, strasse };
}

interface LegendeEintrag {
  text: string;
  symbolKey: 'fassade' | 'innenraum' | 'strasse';
  rId: string;
}

interface LegendeResult {
  xml: string;
  symbols: { key: string; data: Buffer; rId: string }[];
}

function generiereLegende(offerte: Offerte, nextRIdStart: number): LegendeResult | null {
  const cb = offerte.checkboxen?.erstaufnahme;
  if (!cb) return null;

  const eintraege: LegendeEintrag[] = [];
  let rIdCounter = nextRIdStart;

  if (cb.fassaden) {
    eintraege.push({
      text: 'Fassaden inkl. Aussenanlagen (Mauern, Vorplätze, etc.)',
      symbolKey: 'fassade',
      rId: `rId${rIdCounter++}`
    });
  }

  if (cb.innenraeume) {
    eintraege.push({
      text: 'Innenaufnahmen',
      symbolKey: 'innenraum',
      rId: `rId${rIdCounter++}`
    });
  }

  if (cb.strassen) {
    eintraege.push({
      text: 'Strassen',
      symbolKey: 'strasse',
      rId: `rId${rIdCounter++}`
    });
  }

  // Keine Einträge = keine Legende
  if (eintraege.length === 0) return null;

  const symbols = createLegendSymbols();
  const symbolsToAdd: { key: string; data: Buffer; rId: string }[] = [];

  // Zeilen generieren mit eingebetteten Bildern
  const zeilen = eintraege.map((eintrag, idx) => {
    const symbolData = symbols[eintrag.symbolKey];

    // Symbol zur Liste hinzufügen
    symbolsToAdd.push({
      key: eintrag.symbolKey,
      data: symbolData,
      rId: eintrag.rId
    });

    // Bildgrössen in EMU (1cm = 360000 EMU)
    // Alle Symbole sind 40x15px → ca. 1cm x 0.375cm
    const imgWidthEmu = 360000;   // 1cm
    const imgHeightEmu = 135000;  // 0.375cm (alle gleich hoch)

    // Bild-XML (inline drawing)
    const bildXml = `<w:r>
<w:rPr><w:noProof/></w:rPr>
<w:drawing>
<wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">
<wp:extent cx="${imgWidthEmu}" cy="${imgHeightEmu}"/>
<wp:docPr id="${1000 + idx}" name="Legende_${eintrag.symbolKey}"/>
<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>
<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
<pic:nvPicPr><pic:cNvPr id="${1000 + idx}" name="Legende_${eintrag.symbolKey}"/><pic:cNvPicPr/></pic:nvPicPr>
<pic:blipFill><a:blip r:embed="${eintrag.rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>
<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${imgWidthEmu}" cy="${imgHeightEmu}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>
</pic:pic>
</a:graphicData>
</a:graphic>
</wp:inline>
</w:drawing>
</w:r>`;

    return `<w:tr>
<w:trPr><w:trHeight w:val="340" w:hRule="atLeast"/></w:trPr>
<w:tc>
<w:tcPr>
<w:tcW w:w="700" w:type="dxa"/>
<w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:right w:w="150" w:type="dxa"/></w:tcMar>
<w:vAlign w:val="center"/>
</w:tcPr>
<w:p>
<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr>
${bildXml}
</w:p>
</w:tc>
<w:tc>
<w:tcPr>
<w:tcW w:w="5800" w:type="dxa"/>
<w:tcMar><w:top w:w="40" w:type="dxa"/><w:bottom w:w="40" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
<w:vAlign w:val="center"/>
</w:tcPr>
<w:p>
<w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Univers" w:hAnsi="Univers"/><w:sz w:val="18"/></w:rPr><w:t>${eintrag.text}</w:t></w:r>
</w:p>
</w:tc>
</w:tr>`;
  }).join('\n');

  // Komplette Legende-Tabelle mit Titel und Rahmen
  // Breite: ca. 11.5cm = 6500 DXA (700 + 5800 = 6500)
  const legendeXml = `
<w:p><w:pPr><w:spacing w:after="170"/></w:pPr></w:p>
<w:tbl>
<w:tblPr>
<w:tblW w:w="6500" w:type="dxa"/>
<w:tblBorders>
<w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
<w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
<w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
<w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
<w:insideH w:val="nil"/>
<w:insideV w:val="nil"/>
</w:tblBorders>
<w:tblCellMar>
<w:top w:w="80" w:type="dxa"/>
<w:left w:w="100" w:type="dxa"/>
<w:bottom w:w="60" w:type="dxa"/>
<w:right w:w="100" w:type="dxa"/>
</w:tblCellMar>
</w:tblPr>
<w:tblGrid>
<w:gridCol w:w="700"/>
<w:gridCol w:w="5800"/>
</w:tblGrid>
<w:tr>
<w:tc>
<w:tcPr>
<w:gridSpan w:val="2"/>
<w:tcMar><w:top w:w="80" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tcMar>
</w:tcPr>
<w:p>
<w:pPr><w:spacing w:after="57"/></w:pPr>
<w:r><w:rPr><w:rFonts w:ascii="Univers" w:hAnsi="Univers"/><w:sz w:val="20"/><w:u w:val="single"/></w:rPr><w:t>Legende</w:t></w:r>
</w:p>
</w:tc>
</w:tr>
${zeilen}
</w:tbl>`;

  return {
    xml: legendeXml,
    symbols: symbolsToAdd
  };
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

function insertPlanbeilageUndLegende(zip: PizZip, offerte: Offerte): string {
  let xml = zip.file('word/document.xml')?.asText() || '';
  const relsPath = 'word/_rels/document.xml.rels';
  let rels = zip.file(relsPath)?.asText() || '';

  // Aktuelle höchste rId ermitteln
  const rIdMatches = rels.match(/Id="rId(\d+)"/g) || [];
  let maxId = Math.max(0, ...rIdMatches.map(m => parseInt(m.match(/\d+/)?.[0] || '0')));

  // Planbeilage-Bild verarbeiten
  let planRId = 'rId12'; // Fallback
  if (offerte.planbeilage) {
    const ext = offerte.planbeilage.mimeType === 'image/png' ? 'png' : 'jpeg';
    const imageData = Buffer.from(offerte.planbeilage.base64, 'base64');
    zip.file(`word/media/planbeilage_custom.${ext}`, imageData);

    planRId = `rId${++maxId}`;
    const newRel = `<Relationship Id="${planRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/planbeilage_custom.${ext}"/>`;
    rels = rels.replace('</Relationships>', `${newRel}</Relationships>`);
  }

  // Legende generieren (startet mit nächster verfügbarer rId)
  const legendeResult = generiereLegende(offerte, maxId + 1);

  // Legende-Symbole zum ZIP und Relationships hinzufügen
  if (legendeResult) {
    for (const symbol of legendeResult.symbols) {
      // PNG-Datei zum ZIP hinzufügen
      zip.file(`word/media/legende_${symbol.key}.png`, symbol.data);

      // Relationship hinzufügen
      const symbolRel = `<Relationship Id="${symbol.rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/legende_${symbol.key}.png"/>`;
      rels = rels.replace('</Relationships>', `${symbolRel}</Relationships>`);
    }
  }

  // Relationships speichern
  zip.file(relsPath, rels);

  // Planbeilage-Bild Grösse anpassen
  if (offerte.planbeilage) {
    const { widthEmu, heightEmu } = calculateProportionalSize(
      offerte.planbeilage.width || 0,
      offerte.planbeilage.height || 0
    );

    // Finde alle Drawing-Blöcke einzeln
    const drawingBlocks: { start: number; end: number; content: string }[] = [];
    let searchPos = 0;

    while (true) {
      const startIdx = xml.indexOf('<w:drawing>', searchPos);
      if (startIdx === -1) break;

      const endIdx = xml.indexOf('</w:drawing>', startIdx);
      if (endIdx === -1) break;

      const blockEnd = endIdx + '</w:drawing>'.length;
      drawingBlocks.push({
        start: startIdx,
        end: blockEnd,
        content: xml.substring(startIdx, blockEnd)
      });

      searchPos = blockEnd;
    }

    // Finde den Block mit {{PLAN_RID}} und ersetze nur dort
    for (const block of drawingBlocks) {
      if (block.content.includes('{{PLAN_RID}}')) {
        let newContent = block.content;

        // Ersetze den Platzhalter mit der neuen rId
        newContent = newContent.replace(/\{\{PLAN_RID\}\}/g, planRId);

        // Ersetze wp:extent nur in diesem Block
        newContent = newContent.replace(
          /(<wp:extent\s+cx=")(\d+)("\s+cy=")(\d+)(")/g,
          `$1${widthEmu}$3${heightEmu}$5`
        );

        // Ersetze a:ext nur in diesem Block
        newContent = newContent.replace(
          /(<a:ext\s+cx=")(\d+)("\s+cy=")(\d+)(")/g,
          `$1${widthEmu}$3${heightEmu}$5`
        );

        // Ersetze den Block im XML
        xml = xml.substring(0, block.start) + newContent + xml.substring(block.end);

        // Legende NACH dem Planbild-Paragraphen einfügen
        if (legendeResult) {
          const afterBlock = block.start + newContent.length;
          const closingPIdx = xml.indexOf('</w:p>', afterBlock);
          if (closingPIdx !== -1) {
            const insertPos = closingPIdx + '</w:p>'.length;
            xml = xml.substring(0, insertPos) + legendeResult.xml + xml.substring(insertPos);
          }
        }

        break;
      }
    }
  } else {
    // Kein Planbild, aber evtl. Legende
    if (legendeResult) {
      const planRidMatch = xml.match(/<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{PLAN_RID\}\}(?:(?!<\/w:p>).)*?<\/w:p>/s);
      if (planRidMatch && planRidMatch.index !== undefined) {
        const insertPos = planRidMatch.index + planRidMatch[0].length;
        xml = xml.substring(0, insertPos) + legendeResult.xml + xml.substring(insertPos);
      }
    }
  }

  // Fallback: Platzhalter ersetzen
  xml = xml.replace(/\{\{PLAN_RID\}\}/g, planRId);

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

  // Planbeilage und Legende
  xml = insertPlanbeilageUndLegende(zip, offerte);
  zip.file('word/document.xml', xml);

  return Buffer.from(zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }));
}
