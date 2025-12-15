export interface ParsedMailData {
  // Projekt
  standort: string;
  bezeichnung: string;

  // Empfänger
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
 * Parst eine MSG-Datei (Outlook-Format) und extrahiert den Body
 */
export async function parseMsgFile(arrayBuffer: ArrayBuffer): Promise<string> {
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

  return body;
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
    anrede: '',
    vorname: '',
    nachname: '',
    strasse: '',
    plz: '',
    ort: '',
    email: '',
    bemerkung: '',
    datum: '',
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

  // Empfänger parsen
  if (empfaengerLines.length >= 4) {
    // Zeile 0: Anrede (Herr/Frau)
    if (empfaengerLines[0] === 'Herr' || empfaengerLines[0] === 'Frau') {
      result.anrede = empfaengerLines[0];
      empfaengerLines.shift();
    }

    // Zeile 1: Name (Vorname Nachname)
    if (empfaengerLines.length > 0) {
      const nameParts = empfaengerLines[0].split(' ');
      result.vorname = nameParts[0] || '';
      result.nachname = nameParts.slice(1).join(' ') || '';
      empfaengerLines.shift();
    }

    // Zeile 2: Strasse
    if (empfaengerLines.length > 0) {
      result.strasse = empfaengerLines[0];
      empfaengerLines.shift();
    }

    // Zeile 3: PLZ Ort
    if (empfaengerLines.length > 0) {
      const plzOrtMatch = empfaengerLines[0].match(/^(\d{4})\s+(.+)$/);
      if (plzOrtMatch) {
        result.plz = plzOrtMatch[1];
        result.ort = plzOrtMatch[2];
      }
      empfaengerLines.shift();
    }

    // Zeile 4: E-Mail
    if (empfaengerLines.length > 0 && empfaengerLines[0].includes('@')) {
      result.email = empfaengerLines[0];
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
