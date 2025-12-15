// === MAIL & FOLDER PARSING UTILITIES ===

export interface ParsedFolder {
  offertnummer: string;
  projektOrt: string;
  projektBezeichnung: string;
}

export interface ParsedEmail {
  firma: string;
  anrede: string;
  vorname: string;
  nachname: string;
  funktion: string;
  strasse: string;
  plz: string;
  ort: string;
}

/**
 * Parst den Ordnernamen und extrahiert Offertnummer, Projektort, Projektbezeichnung
 * Erwartetes Format: "51.25.405 Zürich, Wehntalerstrasse 47"
 * oder: "51.25.405 - Zürich - Wehntalerstrasse 47"
 */
export function parseFolderName(folderName: string): ParsedFolder {
  const result: ParsedFolder = {
    offertnummer: '',
    projektOrt: '',
    projektBezeichnung: '',
  };

  if (!folderName) return result;

  // Versuche verschiedene Muster
  // Muster 1: "51.25.405 Zürich, Wehntalerstrasse 47"
  const pattern1 = /^(\d+\.\d+\.\d+)\s+([^,]+),\s*(.+)$/;
  // Muster 2: "51.25.405 - Zürich - Wehntalerstrasse 47"
  const pattern2 = /^(\d+\.\d+\.\d+)\s*[-–]\s*([^-–]+)\s*[-–]\s*(.+)$/;
  // Muster 3: "51.25.405 Zürich Wehntalerstrasse 47" (erstes Wort nach Nummer = Ort)
  const pattern3 = /^(\d+\.\d+\.\d+)\s+(\S+)\s+(.+)$/;

  let match = folderName.match(pattern1);
  if (match) {
    result.offertnummer = match[1];
    result.projektOrt = match[2].trim();
    result.projektBezeichnung = match[3].trim();
    return result;
  }

  match = folderName.match(pattern2);
  if (match) {
    result.offertnummer = match[1];
    result.projektOrt = match[2].trim();
    result.projektBezeichnung = match[3].trim();
    return result;
  }

  match = folderName.match(pattern3);
  if (match) {
    result.offertnummer = match[1];
    result.projektOrt = match[2].trim();
    result.projektBezeichnung = match[3].trim();
    return result;
  }

  // Fallback: Nur Offertnummer extrahieren
  const nummerMatch = folderName.match(/^(\d+\.\d+\.\d+)/);
  if (nummerMatch) {
    result.offertnummer = nummerMatch[1];
    const rest = folderName.slice(nummerMatch[0].length).trim();
    // Alles nach der Nummer als Bezeichnung
    result.projektBezeichnung = rest.replace(/^[-–,]\s*/, '');
  }

  return result;
}

/**
 * Dekodiert Quoted-Printable Encoding (für E-Mail-Inhalte)
 */
function decodeQuotedPrintable(str: string): string {
  return str
    .replace(/=\r?\n/g, '') // Soft line breaks entfernen
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Dekodiert MIME-kodierte Header (=?UTF-8?Q?...?= oder =?UTF-8?B?...?=)
 */
function decodeMimeHeader(str: string): string {
  if (!str) return '';

  // =?charset?encoding?text?= Pattern
  return str.replace(/=\?([^?]+)\?([BQ])\?([^?]*)\?=/gi, (_, charset, encoding, text) => {
    if (encoding.toUpperCase() === 'B') {
      // Base64
      try {
        return atob(text);
      } catch {
        return text;
      }
    } else {
      // Quoted-Printable
      return decodeQuotedPrintable(text.replace(/_/g, ' '));
    }
  });
}

/**
 * Extrahiert den Namen aus einer E-Mail-Adresse
 * Format: "Vorname Nachname <email@domain.com>" oder nur "<email@domain.com>"
 */
function parseEmailAddress(emailLine: string): { name: string; email: string } {
  const decoded = decodeMimeHeader(emailLine);

  // "Name <email>" Format
  const match = decoded.match(/^([^<]+)<([^>]+)>/);
  if (match) {
    return {
      name: match[1].trim().replace(/^["']|["']$/g, ''),
      email: match[2].trim(),
    };
  }

  // Nur E-Mail
  const emailOnly = decoded.match(/<([^>]+)>/);
  if (emailOnly) {
    return { name: '', email: emailOnly[1] };
  }

  return { name: '', email: decoded.trim() };
}

/**
 * Parst den Inhalt einer .eml-Datei und extrahiert Empfängerdaten
 */
export function parseEmailContent(emlContent: string): ParsedEmail {
  const result: ParsedEmail = {
    firma: '',
    anrede: '',
    vorname: '',
    nachname: '',
    funktion: '',
    strasse: '',
    plz: '',
    ort: '',
  };

  if (!emlContent) return result;

  // From-Header extrahieren
  const fromMatch = emlContent.match(/^From:\s*(.+?)(?:\r?\n(?!\s)|\r?\n\r?\n)/ms);
  if (fromMatch) {
    const { name, email } = parseEmailAddress(fromMatch[1].replace(/\r?\n\s+/g, ' '));

    if (name) {
      const nameParts = name.split(/\s+/);
      if (nameParts.length >= 2) {
        result.vorname = nameParts[0];
        result.nachname = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        result.nachname = nameParts[0];
      }
    }

    // Firma aus E-Mail-Domain ableiten (Heuristik)
    if (email) {
      const domain = email.split('@')[1];
      if (domain && !domain.match(/gmail|yahoo|hotmail|outlook|gmx|bluewin|icloud/i)) {
        // Firmen-E-Mail - Domain als Hinweis
        const firmaPart = domain.split('.')[0];
        if (firmaPart.length > 2) {
          result.firma = firmaPart.charAt(0).toUpperCase() + firmaPart.slice(1);
        }
      }
    }
  }

  // Signatur im Body nach Adressdaten durchsuchen
  const bodyStart = emlContent.indexOf('\r\n\r\n');
  if (bodyStart > -1) {
    let body = emlContent.slice(bodyStart + 4);

    // Quoted-Printable dekodieren falls nötig
    if (emlContent.includes('Content-Transfer-Encoding: quoted-printable')) {
      body = decodeQuotedPrintable(body);
    }

    // HTML-Tags entfernen
    body = body.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ');

    // PLZ/Ort Muster suchen (CH-Format: 4-stellige PLZ)
    const plzOrtMatch = body.match(/(\d{4})\s+([A-ZÄÖÜ][a-zäöüéèê]+(?:\s+[a-zäöüéèê]+)?)/);
    if (plzOrtMatch) {
      result.plz = plzOrtMatch[1];
      result.ort = plzOrtMatch[2];
    }

    // Strasse suchen (typisch: "Wort(e) + Hausnummer")
    const strasseMatch = body.match(/([A-ZÄÖÜ][a-zäöüéèê]+(?:strasse|weg|gasse|platz|allee)\s*\d+[a-z]?)/i);
    if (strasseMatch) {
      result.strasse = strasseMatch[1];
    }

    // Alternative: "Strasse Nr" Format
    if (!result.strasse) {
      const altStrasse = body.match(/([A-ZÄÖÜ][a-zäöüéèê\-]+\s+\d+[a-z]?)\s*[\r\n,]/);
      if (altStrasse) {
        result.strasse = altStrasse[1];
      }
    }
  }

  return result;
}

/**
 * Bestimmt den HMQ-Standort basierend auf PLZ
 * zh: Zürich-Opfikon (PLZ 80xx-89xx)
 * gr: Chur (PLZ 70xx-79xx)
 * ag: Zofingen (Rest)
 */
export function parseStandort(plz: string): string {
  if (!plz) return 'zh';

  const plzNum = parseInt(plz, 10);

  if (plzNum >= 7000 && plzNum < 8000) {
    return 'gr'; // Graubünden → Chur
  }
  if (plzNum >= 8000 && plzNum < 9000) {
    return 'zh'; // Zürich
  }

  // Aargau/Zentralschweiz
  if (plzNum >= 4000 && plzNum < 5000) {
    return 'ag'; // Zofingen
  }
  if (plzNum >= 5000 && plzNum < 6000) {
    return 'ag'; // Aargau
  }
  if (plzNum >= 6000 && plzNum < 7000) {
    return 'ag'; // Zentralschweiz
  }

  return 'zh'; // Default
}

/**
 * Verarbeitet alle Dateien eines importierten Ordners
 */
export async function processImportedFolder(
  folderName: string,
  files: { name: string; content: string }[]
): Promise<{
  folder: ParsedFolder;
  email: ParsedEmail | null;
  standortId: string;
}> {
  // Ordnername parsen
  const folder = parseFolderName(folderName);

  // .eml Datei suchen und parsen
  let email: ParsedEmail | null = null;
  const emlFile = files.find(f => f.name.toLowerCase().endsWith('.eml'));
  if (emlFile) {
    email = parseEmailContent(emlFile.content);
  }

  // Standort bestimmen
  const standortId = parseStandort(email?.plz || '');

  return { folder, email, standortId };
}
