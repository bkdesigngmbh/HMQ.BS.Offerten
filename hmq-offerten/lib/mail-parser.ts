export interface ParsedMailData {
  // Projekt
  standort: string;
  bezeichnung: string;

  // Empfänger
  firma: string;
  abteilung: string;
  anrede: string;
  vorname: string;
  nachname: string;
  strasse: string;
  plz: string;
  ort: string;
  email: string;

  // Zusatz
  bemerkung: string;

  // Datum (aus Mail-Header)
  datum: string; // ISO-Format für Anfragedatum

  // Offerten-Deadline (falls vorhanden)
  offertenDeadline: string;
}

export interface ParsedFolderData {
  offertnummer: string;
  projektOrt: string;
  projektBezeichnung: string;
}

/**
 * Parst einen Ordnernamen im Format:
 * "51.25.405 Zürich, Seestrasse 44, Neubau MFH"
 */
export function parseFolderName(folderName: string): ParsedFolderData {
  // Regex: Offertnummer (XX.XX.XXX), dann Ort, dann Rest
  const match = folderName.match(/^(\d{2}\.\d{2}\.\d{3})\s+([^,]+),\s*(.+)$/);

  if (match) {
    return {
      offertnummer: match[1],
      projektOrt: match[2].trim(),
      projektBezeichnung: match[3].trim(),
    };
  }

  // Fallback: Versuche nur Offertnummer zu extrahieren
  const offertMatch = folderName.match(/^(\d{2}\.\d{2}\.\d{3})/);
  if (offertMatch) {
    const rest = folderName.substring(offertMatch[0].length).trim();
    return {
      offertnummer: offertMatch[1],
      projektOrt: '',
      projektBezeichnung: rest,
    };
  }

  return {
    offertnummer: '',
    projektOrt: '',
    projektBezeichnung: folderName,
  };
}

/**
 * Parst eine MSG-Datei (Outlook-Format) und extrahiert Body + Datum
 */
export async function parseMsgFile(arrayBuffer: ArrayBuffer): Promise<{ body: string; datum: string }> {
  // Dynamischer Import für Client-Side
  const MsgReader = (await import('@kenjiuno/msgreader')).default;

  const msgReader = new MsgReader(arrayBuffer);
  const fileData = msgReader.getFileData();

  // Body extrahieren (HTML oder Text)
  let body = fileData.body || '';

  // Falls HTML-Body vorhanden, diesen verwenden
  if (fileData.bodyHtml) {
    body = fileData.bodyHtml;
  }

  // Datum extrahieren (verschiedene mögliche Felder)
  let datum = '';

  // messageDeliveryTime ist das Zustelldatum
  if ((fileData as any).messageDeliveryTime) {
    try {
      const d = new Date((fileData as any).messageDeliveryTime);
      if (!isNaN(d.getTime())) {
        datum = d.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch {
      // ignore
    }
  }

  // Fallback: clientSubmitTime (Sendedatum)
  if (!datum && (fileData as any).clientSubmitTime) {
    try {
      const d = new Date((fileData as any).clientSubmitTime);
      if (!isNaN(d.getTime())) {
        datum = d.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
  }

  // Fallback: creationTime
  if (!datum && (fileData as any).creationTime) {
    try {
      const d = new Date((fileData as any).creationTime);
      if (!isNaN(d.getTime())) {
        datum = d.toISOString().split('T')[0];
      }
    } catch {
      // ignore
    }
  }

  return { body, datum };
}

/**
 * Dekodiert Quoted-Printable Encoding
 */
function decodeQuotedPrintable(text: string): string {
  return text
    .replace(/=\r?\n/g, '') // Soft line breaks
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
}

/**
 * Parst eine EML-Datei und extrahiert die relevanten Daten
 */
export function parseEmailContent(emlContent: string): ParsedMailData {
  // Dekodiere Quoted-Printable falls vorhanden
  let content = emlContent;
  if (content.includes('quoted-printable')) {
    // Finde den Body nach den Headers
    const bodyStart = content.indexOf('\r\n\r\n');
    if (bodyStart > 0) {
      const headers = content.substring(0, bodyStart);
      let body = content.substring(bodyStart + 4);
      body = decodeQuotedPrintable(body);
      content = headers + '\r\n\r\n' + body;
    }
  }

  // Entferne HTML-Tags
  let text = content.replace(/<[^>]+>/g, '\n');

  // Dekodiere HTML-Entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&uuml;/g, 'ü')
    .replace(/&auml;/g, 'ä')
    .replace(/&ouml;/g, 'ö')
    .replace(/&Uuml;/g, 'Ü')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&Ouml;/g, 'Ö');

  // Bereinige und splitte in Zeilen
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const result: ParsedMailData = {
    standort: '',
    bezeichnung: '',
    firma: '',
    abteilung: '',
    anrede: '',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    email: '',
    bemerkung: '',
    datum: '',
    offertenDeadline: '',
  };

  // Datum aus Mail-Header extrahieren
  const dateMatch = emlContent.match(/^Date:\s*(.+)$/m);
  if (dateMatch) {
    try {
      const mailDate = new Date(dateMatch[1].trim());
      if (!isNaN(mailDate.getTime())) {
        result.datum = mailDate.toISOString().split('T')[0]; // YYYY-MM-DD
      }
    } catch {
      // Datum konnte nicht geparst werden
    }
  }

  let section = '';
  let empfaengerLines: string[] = [];
  let bemerkungLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Standort erkennen
    if (line.startsWith('Standort:')) {
      result.standort = line.replace('Standort:', '').trim();
      continue;
    }

    // Bezeichnung erkennen
    if (line.startsWith('Bezeichnung:')) {
      result.bezeichnung = line.replace('Bezeichnung:', '').trim();
      continue;
    }

    // Sektionen erkennen
    if (line === 'Empfänger:') {
      section = 'empfaenger';
      continue;
    }

    if (line === 'Bemerkung' || line === 'Bemerkung:') {
      section = 'bemerkung';
      continue;
    }

    if (line.startsWith('Bei Fragen stehen wir')) {
      section = '';
      continue;
    }

    // Daten sammeln
    if (section === 'empfaenger') {
      empfaengerLines.push(line);
    } else if (section === 'bemerkung') {
      bemerkungLines.push(line);
    }
  }

  // Empfänger parsen - unterstützt zwei Formate:
  // Format A (alt): Anrede, Name, Strasse, PLZ Ort, Email
  // Format B (neu callExpert): Firma, Anrede, Name, Strasse, PLZ Ort, Email
  if (empfaengerLines.length >= 4) {
    let lineIdx = 0;

    // Prüfen ob erste Zeile eine Firma ist (nicht Herr/Frau und kein Name mit @)
    const firstLine = empfaengerLines[0];
    const isAnrede = firstLine === 'Herr' || firstLine === 'Frau';
    const isEmail = firstLine.includes('@');
    const isPlzOrt = /^\d{4}\s+/.test(firstLine);

    // Wenn erste Zeile keine Anrede ist und wie eine Firma aussieht
    if (!isAnrede && !isEmail && !isPlzOrt && empfaengerLines.length >= 5) {
      result.firma = empfaengerLines[lineIdx++];
    }

    // Zeile: Anrede (Herr/Frau)
    if (lineIdx < empfaengerLines.length) {
      if (empfaengerLines[lineIdx] === 'Herr' || empfaengerLines[lineIdx] === 'Frau') {
        result.anrede = empfaengerLines[lineIdx++];
      }
    }

    // Zeile: Name (Vorname Nachname)
    if (lineIdx < empfaengerLines.length && !empfaengerLines[lineIdx].includes('@') && !/^\d{4}\s+/.test(empfaengerLines[lineIdx])) {
      const nameParts = empfaengerLines[lineIdx++].split(' ');
      result.vorname = nameParts[0] || '';
      result.nachname = nameParts.slice(1).join(' ') || '';
    }

    // Zeile: Strasse
    if (lineIdx < empfaengerLines.length && !empfaengerLines[lineIdx].includes('@') && !/^\d{4}\s+/.test(empfaengerLines[lineIdx])) {
      result.strasse = empfaengerLines[lineIdx++];
    }

    // Zeile: PLZ Ort
    if (lineIdx < empfaengerLines.length) {
      const plzOrtMatch = empfaengerLines[lineIdx].match(/^(\d{4})\s+(.+)$/);
      if (plzOrtMatch) {
        result.plz = plzOrtMatch[1];
        result.ort = plzOrtMatch[2];
        lineIdx++;
      }
    }

    // Zeile: E-Mail
    if (lineIdx < empfaengerLines.length && empfaengerLines[lineIdx].includes('@')) {
      result.email = empfaengerLines[lineIdx];
    }
  }

  // Offerten Deadline parsen (Format: "Offerten Deadline: DD.MM.YYYY")
  for (const line of lines) {
    const deadlineMatch = line.match(/Offerten\s*Deadline[:\s]*(\d{2}\.\d{2}\.\d{4})/i);
    if (deadlineMatch) {
      result.offertenDeadline = deadlineMatch[1];
      break;
    }
  }

  // Bemerkung
  result.bemerkung = bemerkungLines.join(' ');

  return result;
}

/**
 * Extrahiert PLZ und Ort aus dem Standort-String
 * z.B. "6003 Luzern Gst. 3576" -> { plz: "6003", ort: "Luzern" }
 */
export function parseStandort(standort: string): { plz: string; ort: string; zusatz: string } {
  const match = standort.match(/^(\d{4})\s+(\S+)\s*(.*)$/);
  if (match) {
    return {
      plz: match[1],
      ort: match[2],
      zusatz: match[3] || '',
    };
  }
  return { plz: '', ort: standort, zusatz: '' };
}
