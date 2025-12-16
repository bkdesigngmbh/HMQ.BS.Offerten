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

// === LEGENDE ===

interface LegendeEintrag {
  text: string;
  farbe: string;  // Hex ohne #, z.B. "FF0000"
  typ: 'linie' | 'flaeche';
}

function generiereLegendeFarbe(farbe: string, transparenz: number = 0.4): string {
  // Für Word: Opazität = 1 - Transparenz, als Hex-Wert (0-255)
  // 40% Transparenz = 60% Opazität = 0.6 * 255 = 153 = "99"
  const opazitaet = Math.round((1 - transparenz) * 255);
  const alpha = opazitaet.toString(16).padStart(2, '0').toUpperCase();
  return alpha + farbe;
}

function generiereLegendeXml(offerte: Offerte): string {
  const cb = offerte.checkboxen?.erstaufnahme;
  if (!cb) return '';

  const eintraege: LegendeEintrag[] = [];

  if (cb.fassaden) {
    eintraege.push({
      text: 'Fassaden inkl. Aussenanlagen (Mauern, Vorplätze, etc.)',
      farbe: 'FF0000',
      typ: 'linie'
    });
  }

  if (cb.innenraeume) {
    eintraege.push({
      text: 'Innenaufnahmen',
      farbe: '4F81BD',
      typ: 'flaeche'
    });
  }

  if (cb.strassen) {
    eintraege.push({
      text: 'Strassen',
      farbe: 'FAC090',
      typ: 'flaeche'
    });
  }

  // Keine Einträge = keine Legende
  if (eintraege.length === 0) return '';

  // Symbol-Breite: ca. 1cm = 360000 EMU, Höhe: 0.4cm = 144000 EMU
  const symbolBreite = 360000;
  const symbolHoehe = 144000;

  // Generiere Zeilen für jeden Eintrag
  const zeilen = eintraege.map(eintrag => {
    // Symbol als gefärbtes Rechteck oder Linie
    let symbolXml: string;

    if (eintrag.typ === 'linie') {
      // Rote Linie - als Rechteck mit geringer Höhe
      symbolXml = `
        <w:r>
          <w:rPr><w:noProof/></w:rPr>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${symbolBreite}" cy="50800"/>
              <wp:docPr id="${Math.floor(Math.random() * 100000)}" name="Legende"/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                  <wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                    <wps:spPr>
                      <a:xfrm><a:off x="0" y="0"/><a:ext cx="${symbolBreite}" cy="50800"/></a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      <a:solidFill><a:srgbClr val="${eintrag.farbe}"><a:alpha val="60000"/></a:srgbClr></a:solidFill>
                      <a:ln w="0"><a:noFill/></a:ln>
                    </wps:spPr>
                    <wps:bodyPr/>
                  </wps:wsp>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>`;
    } else {
      // Fläche als Rechteck
      symbolXml = `
        <w:r>
          <w:rPr><w:noProof/></w:rPr>
          <w:drawing>
            <wp:inline distT="0" distB="0" distL="0" distR="0">
              <wp:extent cx="${symbolBreite}" cy="${symbolHoehe}"/>
              <wp:docPr id="${Math.floor(Math.random() * 100000)}" name="Legende"/>
              <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                  <wps:wsp xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                    <wps:spPr>
                      <a:xfrm><a:off x="0" y="0"/><a:ext cx="${symbolBreite}" cy="${symbolHoehe}"/></a:xfrm>
                      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                      <a:solidFill><a:srgbClr val="${eintrag.farbe}"><a:alpha val="60000"/></a:srgbClr></a:solidFill>
                      <a:ln w="12700"><a:solidFill><a:srgbClr val="${eintrag.farbe}"/></a:solidFill></a:ln>
                    </wps:spPr>
                    <wps:bodyPr/>
                  </wps:wsp>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>`;
    }

    return `
      <w:tr>
        <w:tc>
          <w:tcPr><w:tcW w="1200" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p><w:pPr><w:jc w:val="center"/></w:pPr>${symbolXml}</w:p>
        </w:tc>
        <w:tc>
          <w:tcPr><w:tcW w="5000" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="40" w:after="40"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="18"/></w:rPr><w:t>${eintrag.text}</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>`;
  }).join('');

  // Tabelle mit Rahmen für die Legende
  const legendeXml = `
    <w:tbl>
      <w:tblPr>
        <w:tblStyle w:val="TableGrid"/>
        <w:tblW w:type="auto" w:w="0"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="4" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CCCCCC"/>
          <w:insideV w:val="nil"/>
        </w:tblBorders>
        <w:tblCellMar>
          <w:top w:w="40" w:type="dxa"/>
          <w:left w:w="80" w:type="dxa"/>
          <w:bottom w:w="40" w:type="dxa"/>
          <w:right w:w="80" w:type="dxa"/>
        </w:tblCellMar>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="1200"/>
        <w:gridCol w:w="5000"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr><w:gridSpan w:val="2"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/></w:tcPr>
          <w:p>
            <w:pPr><w:spacing w:before="60" w:after="60"/></w:pPr>
            <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:sz w:val="18"/></w:rPr><w:t>Legende</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
      ${zeilen}
    </w:tbl>
    <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>`;

  return legendeXml;
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

  // Legende generieren und vor dem Planbeilage einfügen
  const legendeXml = generiereLegendeXml(offerte);

  if (!offerte.planbeilage) {
    // Auch ohne Planbeilage kann die Legende eingefügt werden
    if (legendeXml) {
      // Finde den Planbeilage-Bereich (Paragraph mit PLAN_RID) und füge Legende davor ein
      xml = xml.replace(
        /(<w:p\b[^>]*>(?:(?!<\/w:p>).)*?\{\{PLAN_RID\}\}(?:(?!<\/w:p>).)*?<\/w:p>)/gs,
        legendeXml + '$1'
      );
    }
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

  // Proportionale Bildgrösse berechnen
  const { widthEmu, heightEmu } = calculateProportionalSize(
    offerte.planbeilage.width || 0,
    offerte.planbeilage.height || 0
  );

  // NUR das Planbeilage-Bild anpassen
  // Finde alle Drawing-Blöcke einzeln und bearbeite nur den mit {{PLAN_RID}}
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

  // Finde den Block mit {{PLAN_RID}} und ersetze nur dort die Grössen
  for (const block of drawingBlocks) {
    if (block.content.includes('{{PLAN_RID}}')) {
      let newContent = block.content;

      // Ersetze den Platzhalter mit der neuen rId
      newContent = newContent.replace(/\{\{PLAN_RID\}\}/g, newRId);

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

      // Finde den umschliessenden Paragraphen für die Legende-Einfügung
      // Suche rückwärts nach <w:p> vor dem Drawing-Block
      let paragraphStart = block.start;
      const searchArea = xml.substring(0, block.start);
      const lastParagraphStart = searchArea.lastIndexOf('<w:p');
      if (lastParagraphStart !== -1) {
        paragraphStart = lastParagraphStart;
      }

      // Legende vor dem Planbeilage-Paragraphen einfügen
      if (legendeXml) {
        xml = xml.substring(0, paragraphStart) + legendeXml + xml.substring(paragraphStart, block.start) + newContent + xml.substring(block.end);
      } else {
        // Nur den Block ersetzen ohne Legende
        xml = xml.substring(0, block.start) + newContent + xml.substring(block.end);
      }
      break; // Nur einen Block bearbeiten
    }
  }

  // Falls Platzhalter noch vorhanden (Fallback)
  xml = xml.replace(/\{\{PLAN_RID\}\}/g, newRId);

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
