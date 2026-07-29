import PizZip from 'pizzip';
import { EmgGespeicherteWerte, Offerte, Offertart, getOffertart } from './types';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { formatCHF, berechneRabattUndMwst } from './kosten-helpers';
import { STANDORTE, GERMAN_MONTHS, EMU_PER_CM, TEMPLATE_FILENAME } from './constants';

// === HELPER ===

// XML-Escape für Sonderzeichen (wichtig für Word-Dokument!)
function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDatumKurz(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}.${d.getFullYear()}`;
}

function generiereAnrede(empfaenger: Offerte['empfaenger']): string {
  if (empfaenger.anrede && empfaenger.nachname) {
    return empfaenger.anrede === 'Herr'
      ? `Sehr geehrter Herr ${escapeXml(empfaenger.nachname)}`
      : `Sehr geehrte Frau ${escapeXml(empfaenger.nachname)}`;
  }
  return 'Sehr geehrte Damen und Herren';
}

function formatAnfrageDatum(isoDate: string): { tag: string; monat: string; jahr: string } {
  if (!isoDate) return { tag: '', monat: '', jahr: '' };
  const d = new Date(isoDate);
  return {
    tag: `${d.getDate()}. `,
    monat: GERMAN_MONTHS[d.getMonth()],
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
    5: { z1: 'fü', z2: 'nf', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'fünf verschiedenen Tagen' },
    6: { z1: 'se', z2: 'chs', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'sechs verschiedenen Tagen' },
    7: { z1: 'si', z2: 'eben', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'sieben verschiedenen Tagen' },
    8: { z1: 'ac', z2: 'ht', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'acht verschiedenen Tagen' },
    9: { z1: 'ne', z2: 'un', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'neun verschiedenen Tagen' },
    10: { z1: 'ze', z2: 'hn', wort: 'Einsatzpauschalen', tage1: 'Einsätze an maximal ', tage2: 'zehn verschiedenen Tagen' },
  };
  return daten[anzahl] || daten[2];
}

// === CHECKBOXEN ===

// Reihenfolge = Dokumentreihenfolge der im XML VERBLIEBENEN Checkboxen.
// Bei 'emg' sind die BS-Abschnitte (Koordination/Erstaufnahme/VA/Dokumentation)
// bereits entfernt, bei inaktivem EMG der EMG-Block.
function setCheckboxen(xml: string, offerte: Offerte): string {
  const cb = offerte.checkboxen;
  const art = getOffertart(offerte);
  const bsAktiv = art !== 'emg';
  const emgAktiv = art !== 'bs';
  const vaAktiv = bsAktiv && !!offerte.vergleichsaufnahme;

  // Strassen-Logik: Wenn Strassen aktiv, automatisch auch Belag und Rand
  const strassenBelag = cb.erstaufnahme.strassen ? true : cb.erstaufnahme.strassenBelag;
  const strassenRand = cb.erstaufnahme.strassen ? true : cb.erstaufnahme.strassenRand;

  // Kapitel 1.1/1.2 sind in allen Offertarten vorhanden
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
  ];

  if (bsAktiv) {
    states.push(
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
    );
    // Vergleichsaufnahme-Block (4 Checkboxen zwischen Erstaufnahme und
    // Dokumentation): nur im XML vorhanden, wenn aktiv — dann alle angekreuzt
    if (vaAktiv) {
      states.push(true, true, true, true);
    }
    states.push(
      cb.dokumentation.rissprotokoll,
      cb.dokumentation.fotoAussen,
      cb.dokumentation.fotoInnen,
      cb.dokumentation.fotoStrasse,
      cb.dokumentation.zustellbestaetigung,
      cb.dokumentation.datenabgabe,
    );
  }

  if (emgAktiv) {
    const leistungen = offerte.emg?.leistungen;
    if (!leistungen) {
      throw new Error('EMG aktiv, aber emg.leistungen fehlen');
    }
    states.push(
      leistungen.konfiguration,
      leistungen.smsAlarmierung,
      leistungen.terminvereinbarung,
      leistungen.erstinstallation,
      leistungen.vorhalten,
      leistungen.deinstallation,
      !!offerte.emg?.abschlussbericht,
      false, // Leerzeile "…………………."
    );
  }

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

function entferneLeereAbteilung(xml: string, abteilung: string): string {
  if (abteilung && abteilung.trim()) return xml;

  // Entferne den kompletten Paragraphen mit {{ABTEILUNG}}
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{ABTEILUNG\}\}(?:(?!<\/w:p>).)*?<\/w:p>/gs,
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

// === VERGLEICHSAUFNAHME ===

// Abschnitt 2.3 Vergleichsaufnahme + Kostenzeile "Optional: Leistungen Vergleichsaufnahme".
// Im Template ist der Textblock von {{VA_START}}/{{VA_END}}-Markerabsätzen umschlossen.
// Aktiv: Markerabsätze entfernen + Paginierung wie Muster-Offerte anpassen.
// Inaktiv: Block und Kostenzeile komplett entfernen (Output wie bisher).
function entferneVergleichsaufnahme(xml: string, aktiv: boolean): string {
  if (aktiv) {
    xml = xml.replace(
      /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{VA_START\}\}(?:(?!<\/w:p>).)*?<\/w:p>/gs,
      ''
    );
    xml = xml.replace(
      /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{VA_END\}\}(?:(?!<\/w:p>).)*?<\/w:p>/gs,
      ''
    );

    // Kapitel Dokumentation (2.4) beginnt auf neuer Seite: pageBreakBefore in die
    // Überschrift einfügen (Absatz mit {{NR_DOKU}}, direkt nach pStyle = schemakonform)
    xml = xml.replace(
      /(<w:p\b[^>]*><w:pPr><w:pStyle w:val="[^"]+"\/>)((?:(?!<\/w:p>).)*?\{\{NR_DOKU\}\})/s,
      '$1<w:pageBreakBefore/>$2'
    );

    return xml;
  }

  // Alles vom {{VA_START}}- bis zum {{VA_END}}-Absatz entfernen (inkl. Marker)
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{VA_START\}\}[\s\S]*?\{\{VA_END\}\}(?:(?!<\/w:p>).)*?<\/w:p>/s,
    ''
  );

  // Kostenzeile entfernen
  xml = xml.replace(
    /<w:tr[^>]*>(?:(?!<\/w:tr>).)*\{\{PREIS_VERGLEICH\}\}(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
    ''
  );

  return xml;
}

// === EMG (ERSCHÜTTERUNGSMESSUNG) ===

// Absatz, der nur den Marker-Platzhalter enthält, entfernen
function entferneMarkerAbsatz(xml: string, marker: string): string {
  return xml.replace(
    new RegExp(`<w:p\\b[^>]*>(?:(?!</w:p>).)*?\\{\\{${marker}\\}\\}(?:(?!</w:p>).)*?</w:p>`, 'gs'),
    ''
  );
}

// Alles vom START- bis zum END-Markerabsatz entfernen (inkl. Marker, inkl. Tabellen)
function entferneMarkerBlock(xml: string, startMarker: string, endMarker: string): string {
  return xml.replace(
    new RegExp(
      `<w:p\\b[^>]*>(?:(?!</w:p>).)*?\\{\\{${startMarker}\\}\\}[\\s\\S]*?` +
      `\\{\\{${endMarker}\\}\\}(?:(?!</w:p>).)*?</w:p>`,
      's'
    ),
    ''
  );
}

// Fester Umbruch vor dem Schlussteil: bei aktivem VA- oder EMG-Block entfernen
// (KOMPETENZ bleibt mit Unterschriften auf einer Seite, wie die Muster-Offerten),
// sonst bleibt der Absatz bestehen und nur der Marker wird später geleert.
function passeSchlussUmbruchAn(xml: string, entfernen: boolean): string {
  if (!entfernen) return xml;
  const leerAbsatz = '<w:pPr><w:spacing w:line="240" w:lineRule="auto"/><w:jc w:val="left"/><w:rPr><w:noProof/></w:rPr></w:pPr></w:p>';
  return xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{SCHLUSS_UMBRUCH\}\}(?:(?!<\/w:p>).)*?<\/w:p>/s,
    `<w:p>${leerAbsatz}<w:p>${leerAbsatz}`
  );
}

// Singular/Plural-Texte für die dynamischen EMG-Stellen
function formatGeraete(n: number): string {
  return n === 1 ? '1 Gerät' : `${n} Geräte`;
}
function formatGeophone(n: number): string {
  return n === 1 ? '1 Geophon' : `${n} Geophonen`;
}
function formatWochen(n: number): string {
  return n === 1 ? '1 Woche' : `${n} Wochen`;
}
// Fussnote wie in der Muster-Offerte: "CHF 80.- an." (ganzzahlig), sonst "CHF 82.50 an."
function formatFolgetarif(preis: number): string {
  return Number.isInteger(preis) ? `${preis}.-` : preis.toFixed(2);
}

// Wochentarif-Zeilen (Bullet-Liste, kursiv; aktives Band fett wie in der Muster-Offerte)
function baueTarifZeilen(werte: EmgGespeicherteWerte): string {
  const sortiert = [...werte.tarife].sort((a, b) => a.abWochen - b.abWochen);
  let aktivIdx = 0;
  sortiert.forEach((t, i) => {
    if (werte.anzahlWochen >= t.abWochen) aktivIdx = i;
  });
  return sortiert
    .map((t, i) => {
      const fett = i === aktivIdx ? '<w:b/><w:bCs/>' : '';
      const rpr = `<w:rPr>${fett}<w:i/></w:rPr>`;
      return (
        '<w:p><w:pPr><w:pStyle w:val="Absatz1ohneTitelohneAbstandunten"/>' +
        '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="15"/></w:numPr>' +
        '<w:tabs><w:tab w:val="clear" w:pos="284"/></w:tabs>' +
        `<w:spacing w:before="120" w:after="60"/><w:rPr>${fett}<w:i/></w:rPr></w:pPr>` +
        `<w:r>${rpr}<w:t xml:space="preserve">Ab ${formatWochen(t.abWochen)} Laufzeit</w:t></w:r>` +
        `<w:r>${rpr}<w:tab/></w:r>` +
        `<w:r>${rpr}<w:tab/><w:t xml:space="preserve">CHF ${formatCHF(t.preisChf)} pro Gerät/Woche</w:t></w:r>` +
        '</w:p>'
      );
    })
    .join('');
}

// Strukturelle EMG-Verarbeitung: Blöcke entfernen oder aktivieren, Tarifzeilen
// einsetzen, Paginierung anpassen. Die Text-Platzhalter ersetzt danach die
// zentrale Replacement-Map.
function verarbeiteEmg(
  xml: string,
  art: Offertart,
  emgWerte: EmgGespeicherteWerte | undefined
): string {
  const emgAktiv = art !== 'bs';

  if (!emgAktiv) {
    // EMG-Blöcke komplett entfernen, BS-Marker aufräumen: Output wie bisher
    xml = entferneMarkerBlock(xml, 'EMG_START', 'EMG_END');
    xml = entferneMarkerBlock(xml, 'EMGK_START', 'EMGK_END');
    xml = entferneMarkerAbsatz(xml, 'BS_START');
    xml = entferneMarkerAbsatz(xml, 'BS_END');
    xml = entferneMarkerAbsatz(xml, 'BSK_START');
    xml = entferneMarkerAbsatz(xml, 'BSK_END');
    return xml;
  }

  if (!emgWerte) {
    throw new Error('EMG aktiv, aber emg.gespeicherteWerte fehlen');
  }

  if (art === 'emg') {
    // Nur EMG: BS-Leistungskapitel und BS-Kostensektion komplett entfernen
    xml = entferneMarkerBlock(xml, 'BS_START', 'BS_END');
    xml = entferneMarkerBlock(xml, 'BSK_START', 'BSK_END');
    // Kein Seitenumbruch vor dem EMG-Kapitel (folgt direkt auf Kapitel 1)
    xml = entferneMarkerAbsatz(xml, 'EMG_PB');
    // Voraussetzung "Installation erfolgt zeitgleich mit der Aufnahme der
    // Rissprotokolle." entfällt ohne Beweissicherung
    xml = xml.replace(
      /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?Installation erfolgt zeitgleich mit der Aufnahme der Rissprotokolle\.(?:(?!<\/w:p>).)*?<\/w:p>/s,
      ''
    );
  } else {
    // BS + EMG: BS-Marker aufräumen, KOSTEN-Kapitel beginnt auf neuer Seite
    // (pageBreakBefore nach keepLines = schemakonforme pPr-Reihenfolge)
    xml = entferneMarkerAbsatz(xml, 'BS_START');
    xml = entferneMarkerAbsatz(xml, 'BS_END');
    xml = entferneMarkerAbsatz(xml, 'BSK_START');
    xml = entferneMarkerAbsatz(xml, 'BSK_END');
    xml = xml.replace(
      /(<w:pStyle w:val="berschrift2"\/><w:keepLines w:val="0"\/>)((?:(?!<\/w:p>).)*?<w:t>KOSTEN<\/w:t>)/s,
      '$1<w:pageBreakBefore/>$2'
    );
  }

  // EMG-Blockmarker entfernen, Inhalt bleibt
  xml = entferneMarkerAbsatz(xml, 'EMG_START');
  xml = entferneMarkerAbsatz(xml, 'EMG_END');
  xml = entferneMarkerAbsatz(xml, 'EMGK_START');
  xml = entferneMarkerAbsatz(xml, 'EMGK_END');

  // Offertgültigkeit in den Vorlaufzeit-Absatz ziehen (Feedback BPa 2026-07-29:
  // spart eine Zeile, Datenschutz passt mit auf die Seite). Nur bei EMG-Offerten,
  // damit reine BS-Offerten byte-identisch zum bisherigen Output bleiben.
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?<w:t>Offertgültigkeit: 90 Tage<\/w:t>(?:(?!<\/w:p>).)*?<\/w:p>/s,
    ''
  );
  xml = xml.replace(
    'vorausgesetzt.</w:t></w:r></w:p>',
    'vorausgesetzt.</w:t></w:r><w:r><w:t xml:space="preserve"> </w:t></w:r><w:r><w:t>Offertgültigkeit: 90 Tage</w:t></w:r></w:p>'
  );

  // Wochentarif-Zeilen anstelle des Marker-Absatzes
  xml = xml.replace(
    /<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{EMG_TARIFE\}\}(?:(?!<\/w:p>).)*?<\/w:p>/s,
    baueTarifZeilen(emgWerte)
  );

  // Rabattzeile der EMG-Tabelle entfernen, wenn kein EMG-Rabatt
  if (!(emgWerte.rabattProzent > 0)) {
    xml = xml.replace(
      /<w:tr[^>]*>(?:(?!<\/w:tr>).)*\{\{EMG_PREIS_RABATT\}\}(?:(?!<\/w:tr>).)*<\/w:tr>/gs,
      ''
    );
  }

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

// PNG mit gefülltem Kreis erstellen (zentriert, mit dunklerem Rand, transparenter Hintergrund)
function createCirclePng(
  width: number,
  height: number,
  durchmesser: number,
  fill: [number, number, number],
  rand: [number, number, number]
): Buffer {
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

  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const radius = durchmesser / 2;
  const randBreite = 1.2;

  const rawData: number[] = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // Filter byte
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist <= radius - randBreite) {
        rawData.push(fill[0], fill[1], fill[2], 255);
      } else if (dist <= radius) {
        rawData.push(rand[0], rand[1], rand[2], 255);
      } else {
        rawData.push(0, 0, 0, 0);
      }
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(rawData));

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', compressed),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Legende-Symbole als PNG erstellen - ALLE 40px BREIT, ALLE 15px HOCH
function createLegendSymbols(): { fassade: Buffer; innenraum: Buffer; strasse: Buffer; emg: Buffer } {
  // Fassade: Rote Linie 4px hoch, zentriert in 15px hohem Bild (40x15 Pixel, #FF0000, 60% Opazität = 153)
  const fassade = createLinePng(40, 15, 4, 255, 0, 0, 153);

  // Innenaufnahmen: Blaues Rechteck (40x15 Pixel, #4F81BD, 60% Opazität)
  const innenraum = createPng(40, 15, 79, 129, 189, 153);

  // Strassen: Oranges Rechteck (40x15 Pixel, #FAC090, 60% Opazität)
  const strasse = createPng(40, 15, 250, 192, 144, 153);

  // Erschütterungsmessung: Grüner Kreis mit dunklem Rand (wie Muster-Offerte:
  // Word-Theme accent3 #9BBB59, Rand accent3 lumMod 50% ≈ #4E5E2D)
  const emg = createCirclePng(40, 15, 13, [155, 187, 89], [78, 94, 45]);

  return { fassade, innenraum, strasse, emg };
}

interface LegendeEintrag {
  text: string;
  symbolKey: 'fassade' | 'innenraum' | 'strasse' | 'emg';
  rId: string;
}

interface LegendeResult {
  xml: string;
  symbols: { key: string; data: Buffer; rId: string }[];
}

function generiereLegende(offerte: Offerte, nextRIdStart: number): LegendeResult | null {
  const cb = offerte.checkboxen?.erstaufnahme;
  if (!cb) return null;

  const art = getOffertart(offerte);
  const bsAktiv = art !== 'emg';
  const emgAktiv = art !== 'bs';

  const eintraege: LegendeEintrag[] = [];
  let rIdCounter = nextRIdStart;

  if (bsAktiv && cb.fassaden) {
    eintraege.push({
      text: 'Fassaden inkl. Aussenanlagen (Mauern, Vorplätze, etc.)',
      symbolKey: 'fassade',
      rId: `rId${rIdCounter++}`
    });
  }

  if (bsAktiv && cb.innenraeume) {
    eintraege.push({
      text: 'Innenaufnahmen',
      symbolKey: 'innenraum',
      rId: `rId${rIdCounter++}`
    });
  }

  if (bsAktiv && cb.strassen) {
    eintraege.push({
      text: 'Strassen/Vorplätze',
      symbolKey: 'strasse',
      rId: `rId${rIdCounter++}`
    });
  }

  // EMG-Eintrag immer, wenn EMG aktiv (Geophon-Standorte werden auf dem Plan markiert)
  if (emgAktiv) {
    eintraege.push({
      text: 'Erschütterungsmessung',
      symbolKey: 'emg',
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
<w:r><w:rPr><w:rFonts w:ascii="Univers" w:hAnsi="Univers"/><w:sz w:val="18"/></w:rPr><w:t>${escapeXml(eintrag.text)}</w:t></w:r>
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

  // Content-Types für Bilder hinzufügen falls nicht vorhanden
  let contentTypes = zip.file('[Content_Types].xml')?.asText() || '';
  let contentTypesChanged = false;

  // PNG Content-Type (für Legende-Symbole und PNG-Planbeilagen)
  if (!contentTypes.includes('Extension="png"')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="png" ContentType="image/png"/></Types>'
    );
    contentTypesChanged = true;
  }

  // JPEG Content-Type (für JPEG-Planbeilagen)
  if (!contentTypes.includes('Extension="jpeg"') && !contentTypes.includes('Extension="jpg"')) {
    contentTypes = contentTypes.replace(
      '</Types>',
      '<Default Extension="jpeg" ContentType="image/jpeg"/></Types>'
    );
    contentTypesChanged = true;
  }

  if (contentTypesChanged) {
    zip.file('[Content_Types].xml', contentTypes);
  }

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

// Template-Buffer einmalig cachen (statisch pro Deploy) — kein Blocking-Read pro Request
let cachedTemplateBuffer: Buffer | null = null;
async function loadTemplateBuffer(): Promise<Buffer> {
  if (cachedTemplateBuffer) return cachedTemplateBuffer;
  const templatePath = path.join(process.cwd(), 'public', TEMPLATE_FILENAME);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template nicht gefunden: ${templatePath}`);
  }
  cachedTemplateBuffer = await fs.promises.readFile(templatePath);
  return cachedTemplateBuffer;
}

export async function generateOfferteFromTemplate(offerte: Offerte): Promise<Buffer> {
  const zip = new PizZip(await loadTemplateBuffer());
  let xml = zip.file('word/document.xml')?.asText() || '';

  // Offertart-Flags: alte Offerten ohne offertart sind 'bs' (nur Beweissicherung)
  const art = getOffertart(offerte);
  const bsAktiv = art !== 'emg';
  const emgAktiv = art !== 'bs';
  const vaAktiv = bsAktiv && !!offerte.vergleichsaufnahme;
  const emgWerte = offerte.emg?.gespeicherteWerte;
  if (emgAktiv && !emgWerte) {
    throw new Error('EMG aktiv, aber emg.gespeicherteWerte fehlen (Kosten in Tab 2 berechnen)');
  }

  // Daten vorbereiten
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;

  // WICHTIG: Gespeicherte Werte verwenden (falls vorhanden), sonst berechnen
  // Die App speichert manuell überschriebene Werte in gespeicherteWerte
  // HINWEIS: gespeichert.zwischentotal ist der Leistungspreis (VOR Rabatt)
  // aber kosten.zwischentotal muss NACH Rabatt sein für die Platzhalter-Logik
  const gespeichert = offerte.kostenBerechnung?.gespeicherteWerte;
  const kosten = gespeichert
    ? {
        rabattBetrag: gespeichert.rabattBetrag || 0,
        zwischentotal: gespeichert.zwischentotal - (gespeichert.rabattBetrag || 0), // NACH Rabatt
        mwstBetrag: gespeichert.mwstBetrag,
        total: gespeichert.totalInklMwst,
      }
    : berechneRabattUndMwst(offerte.kosten.leistungspreis, offerte.kosten.rabattProzent);
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
  xml = entferneLeereAbteilung(xml, offerte.empfaenger.abteilung || '');
  xml = entferneRabatt(xml, offerte.kosten.rabattProzent);
  xml = entferneVergleichsaufnahme(xml, vaAktiv);
  xml = verarbeiteEmg(xml, art, emgWerte);
  xml = passeSchlussUmbruchAn(xml, vaAktiv || emgAktiv);

  // =====================================================
  // DANN Platzhalter ersetzen
  // =====================================================
  const replacements: Record<string, string> = {
    '{{ABSENDER_ADRESSE}}': escapeXml(standort.adresse),
    '{{FIRMA}}': escapeXml(offerte.empfaenger.firma),
    '{{ABTEILUNG}}': escapeXml(offerte.empfaenger.abteilung || ''),
    '{{KONTAKT_ZEILE}}': escapeXml(kontaktZeile),
    '{{FUNKTION_1}}': escapeXml(funktion1),
    '{{FUNKTION_2}}': funktion2 ? ` ${escapeXml(funktion2)}` : '',
    '{{STRASSE}}': escapeXml(offerte.empfaenger.strasse),
    '{{PLZ_ORT}}': escapeXml(plzOrt),
    '{{ANREDE}}': generiereAnrede(offerte.empfaenger),
    '{{STANDORT}}': escapeXml(standort.name),
    '{{DATUM}}': escapeXml(formatDatumKurz(offerte.datum)),
    '{{OFFNR_A}}': escapeXml(offNr.a),
    '{{OFFNR_B}}': escapeXml(offNr.b),
    '{{OFFNR_C}}': escapeXml(offNr.c),
    '{{OFFNR_D}}': escapeXml(offNr.d),
    '{{PROJEKT_ORT}}': escapeXml(offerte.projekt.ort),
    '{{PROJEKT_BEZ1}}': escapeXml(offerte.projekt.bezeichnung.split(' ')[0] || offerte.projekt.bezeichnung),
    '{{PROJEKT_BEZ2}}': offerte.projekt.bezeichnung.includes(' ')
      ? ' ' + escapeXml(offerte.projekt.bezeichnung.split(' ').slice(1).join(' '))
      : '',
    '{{ANF_TAG}}': anfrage.tag,
    '{{ANF_MONAT}}': anfrage.monat,
    '{{ANF_JAHR}}': anfrage.jahr,
    // Leistungspreis = Zwischentotal + Rabatt (Summe vor Rabattabzug)
    '{{PREIS_LEISTUNG}}': formatCHF(kosten.zwischentotal + kosten.rabattBetrag),
    // Vergleichsaufnahme: identischer Preis wie Erstaufnahme, rein informativ (fliesst nicht ins Total)
    '{{PREIS_VERGLEICH}}': formatCHF(kosten.zwischentotal + kosten.rabattBetrag),
    '{{LEISTUNG_LABEL}}': vaAktiv ? 'Leistungen Erstaufnahme' : 'Leistungen gemäss Offerte',
    '{{NR_DOKU}}': vaAktiv ? '2.4' : '2.3',
    '{{KOSTEN_TITEL}}': vaAktiv ? 'Beweissicherung' : 'Beweissicherung Erstaufnahme',
    // Marker im Umbruch-Absatz vor dem Schlussteil (Absatz selbst bleibt bei VA-off bestehen)
    '{{SCHLUSS_UMBRUCH}}': '',
    // Offertart-abhängige Texte (V13)
    '{{OFFERT_TITEL}}': art === 'emg' ? 'Erschütterungsmessung' : 'Beweissicherung',
    '{{AUSGANGSLAGE_ZIEL}}': art === 'emg'
      ? 'sollen während den Bautätigkeiten Erschütterungsmessungen durchgeführt werden.'
      : 'sollen vorgängig zwecks Beweissicherung Zustandsaufnahmen der umliegenden Bauten erstellt werden.',
    '{{TERMINE_SATZ1}}': art === 'emg'
      ? 'Die Installation der Messgeräte wird in Absprache mit dem Auftraggeber durchgeführt.'
      : 'Die Aufnahmen werden in Absprache mit dem Auftraggeber durchgeführt.',
    '{{TERMINE_OBJEKT}}': art === 'emg' ? 'die gewünschte Installation' : 'die gewünschten Aufnahmen',
    // Kapitel-/Unterkapitelnummern: EMG schiebt KOSTEN von 3 auf 4;
    // bei "nur EMG" entfällt das BS-Kapitel und alles rückt nach vorne
    '{{NR_KOSTEN}}': emgAktiv ? '4.1' : '3.1',
    '{{NR_EMG}}': art === 'emg' ? '2.1' : '3.1',
    '{{NR_EMGK}}': art === 'emg' ? '3.1' : '4.2',
    // EMG-Seitenumbruch-Marker (Absatz bleibt bei BS+EMG mit Umbruch bestehen)
    '{{EMG_PB}}': '',
    // EMG-Texte und -Beträge (bei inaktivem EMG sind die Blöcke bereits entfernt)
    '{{EMG_GEOPHONE}}': emgWerte ? formatGeophone(emgWerte.anzahlGeraete) : '',
    '{{EMG_VORHALTEN_WOCHEN}}': emgWerte ? formatWochen(emgWerte.anzahlWochen) : '',
    '{{EMG_ANNAHME}}': emgWerte
      ? `${formatGeraete(emgWerte.anzahlGeraete)}, ${formatWochen(emgWerte.anzahlWochen)}`
      : '',
    '{{EMG_VORHALTEN_DETAIL}}': emgWerte
      ? `${formatGeraete(emgWerte.anzahlGeraete)} à ${formatWochen(emgWerte.anzahlWochen)} (total ${formatWochen(emgWerte.geraetewochen)})`
      : '',
    '{{EMG_PREIS_GRUND}}': emgWerte ? formatCHF(emgWerte.grundpauschale) : '',
    '{{EMG_PREIS_VORHALTEN}}': emgWerte ? formatCHF(emgWerte.vorhalten) : '',
    '{{EMG_AB_LABEL}}': emgWerte?.abschlussberichtAktiv
      ? 'Abschlussbericht'
      : 'Abschlussbericht optional (nicht eingerechnet)',
    '{{EMG_PREIS_AB}}': emgWerte
      ? (emgWerte.abschlussberichtAktiv
          ? formatCHF(emgWerte.abschlussberichtPreis)
          : `(${formatCHF(emgWerte.abschlussberichtPreis)})`)
      : '',
    '{{EMG_RABATT_LABEL}}': emgWerte ? `Rabatt ${emgWerte.rabattProzent.toFixed(1)}%` : '',
    '{{EMG_PREIS_RABATT}}': emgWerte ? `-${formatCHF(emgWerte.rabattBetrag)}` : '',
    '{{EMG_PREIS_ZWISCHEN}}': emgWerte ? formatCHF(emgWerte.zwischentotal) : '',
    '{{EMG_PREIS_MWST}}': emgWerte ? formatCHF(emgWerte.mwstBetrag) : '',
    '{{EMG_TOTAL_LABEL}}': emgWerte && emgWerte.rabattProzent > 0
      ? `Total pauschal (inkl. ${emgWerte.rabattProzent.toFixed(1)}% Rabatt und inkl. 8.1% MwSt.)*`
      : 'Total pauschal (inkl. 8.1% MwSt.)*',
    '{{EMG_PREIS_TOTAL}}': emgWerte ? formatCHF(emgWerte.totalInklMwst) : '',
    '{{EMG_FOLGETARIF}}': emgWerte ? formatFolgetarif(emgWerte.wochentarif) : '',
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
    // Sonstiges-Textfelder (Text wenn vorhanden, sonst Punkte)
    '{{BAUVORHABEN_SONSTIGES}}': escapeXml(offerte.checkboxen.artBauvorhaben.sonstiges?.trim()) || '……………….',
    '{{GEBAEUDE_SONSTIGES_1}}': escapeXml(offerte.checkboxen.artGebaeude.sonstiges1?.trim()) || '……………….',
    '{{GEBAEUDE_SONSTIGES_2}}': escapeXml(offerte.checkboxen.artGebaeude.sonstiges2?.trim()) || '……………….',
    '{{TAETIGKEITEN_SONSTIGES}}': escapeXml(offerte.checkboxen.taetigkeiten.sonstiges?.trim()) || '……………….',
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
