import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  PageBreak,
  AlignmentType,
  BorderStyle,
  WidthType,
  CheckBox,
} from 'docx';

import { Offerte } from './types';

// === STAMMDATEN ===
const STANDORTE: Record<string, { name: string; strasse: string; plzOrt: string; telefon: string }> = {
  zh: { name: 'HMQ AG', strasse: 'Balz-Zimmermann-Strasse 7', plzOrt: '8152 Zürich-Opfikon', telefon: '+41 44 925 50 00' },
  gr: { name: 'HMQ AG', strasse: 'Sommeraustrasse 30', plzOrt: '7000 Chur', telefon: '+41 81 650 05 05' },
  ag: { name: 'HMQ AG', strasse: 'Vordere Hauptgasse 104', plzOrt: '4800 Zofingen', telefon: '+41 62 752 00 22' },
};

const ANSPRECHPARTNER: Record<string, { vorname: string; nachname: string; funktion: string; rolle: string }> = {
  bpa: { vorname: 'Benjamin', nachname: 'Patt', funktion: 'Geomatiker EFZ', rolle: 'Bereichsleitung Beweissicherung' },
  bho: { vorname: 'Bianca', nachname: 'Hochuli', funktion: 'Kauffrau EFZ', rolle: 'Stv. Bereichsleitung Beweissicherung' },
};

const MWST_SATZ = 8.1;

// === HELPER FUNKTIONEN ===
function formatDatumLang(isoDate: string): string {
  const date = new Date(isoDate);
  const monate = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${date.getDate()}. ${monate[date.getMonth()]} ${date.getFullYear()}`;
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

// === CHECKBOX HELPER ===
function cb(checked: boolean, label: string): (CheckBox | TextRun)[] {
  return [
    new CheckBox({ checked }),
    new TextRun({ text: ` ${label}  `, size: 22 }),
  ];
}

// === DOKUMENT-SEKTIONEN ===
function createAbsenderZeile(standort: typeof STANDORTE.zh): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${standort.name} · ${standort.strasse} · ${standort.plzOrt}`,
        size: 18,
        color: '666666',
      }),
    ],
  });
}

function createEmpfaengerBlock(offerte: Offerte): Paragraph[] {
  const { empfaenger } = offerte;
  const lines: Paragraph[] = [];

  lines.push(new Paragraph({ children: [new TextRun({ text: 'HMQ AG', size: 22 })] }));

  if (empfaenger.anrede) {
    lines.push(new Paragraph({ children: [new TextRun({ text: `${empfaenger.anrede} ${empfaenger.name}`, size: 22 })] }));
  } else {
    lines.push(new Paragraph({ children: [new TextRun({ text: empfaenger.name, size: 22 })] }));
  }

  if (empfaenger.zusatz) {
    lines.push(new Paragraph({ children: [new TextRun({ text: empfaenger.zusatz, size: 22 })] }));
  }

  lines.push(new Paragraph({ children: [new TextRun({ text: empfaenger.strasse, size: 22 })] }));
  lines.push(new Paragraph({ children: [new TextRun({ text: empfaenger.plzOrt, size: 22 })] }));

  return lines;
}

function createOrtDatum(standort: typeof STANDORTE.zh, datum: string): Paragraph {
  const ortName = standort.plzOrt.split(' ').slice(1).join(' ');
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: `${ortName}, ${formatDatumLang(datum)}`, size: 22 })],
  });
}

function createBetreff(offerte: Offerte): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: `${offerte.offertnummer}: Offerte für Beweissicherung`, bold: true, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: `${offerte.projekt.ort}, ${offerte.projekt.bezeichnung}`, bold: true, size: 22 })],
    }),
  ];
}

// === CHECKBOX SEKTIONEN ===
function createArtBauvorhabenCheckboxen(data: Offerte['checkboxen']['artBauvorhaben']): Paragraph[] {
  return [
    new Paragraph({
      children: [
        ...cb(data.neubau, 'Neubau'),
        ...cb(data.umbau, 'Umbau'),
        ...cb(data.rueckbau, 'Rückbau'),
        ...cb(!!data.sonstiges, data.sonstiges || '……………….'),
      ],
    }),
  ];
}

function createArtGebaeudeCheckboxen(data: Offerte['checkboxen']['artGebaeude']): Paragraph[] {
  return [
    new Paragraph({
      children: [
        ...cb(data.efhFreistehend, 'Einfamilienhäuser freistehend'),
        ...cb(data.reihenhaus, 'Reihenhäuser'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.terrassenhaus, 'Terrassenhäuser'),
        ...cb(data.mfh, 'Mehrfamilienhäuser'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.strassen, 'Strassen'),
        ...cb(data.kunstbauten, 'Kunstbauten'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(!!data.sonstiges1, data.sonstiges1 || '…………………….'),
        ...cb(!!data.sonstiges2, data.sonstiges2 || '…………………….'),
      ],
    }),
  ];
}

function createTaetigkeitenCheckboxen(data: Offerte['checkboxen']['taetigkeiten']): Paragraph[] {
  return [
    new Paragraph({
      children: [
        ...cb(data.aushub, 'Aushubarbeiten'),
        ...cb(data.rammarbeiten, 'Rammarbeiten (Spund- / Rühlwände)'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.mikropfaehle, 'Mikropfähle / Anker setzen'),
        ...cb(data.baustellenverkehr, 'Baustellenverkehr'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.schwereMaschinen, 'schwere Maschinen'),
        ...cb(data.sprengungen, 'Sprengungen'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.diverses, 'Diverses'),
        ...cb(!!data.sonstiges, data.sonstiges || '…………………….'),
      ],
    }),
  ];
}

function createKoordinationCheckboxen(data: Offerte['checkboxen']['koordination']): Paragraph[] {
  return [
    new Paragraph({ children: [...cb(data.schriftlicheInfo, 'schriftliche Eigentümerinformation')] }),
    new Paragraph({ children: [...cb(data.terminvereinbarung, 'Terminvereinbarung mit den betroffenen Eigentümern')] }),
    new Paragraph({ children: [...cb(data.durchAuftraggeber, 'Eigentümerinformation und Terminvereinbarung erfolgt durch den Auftraggeber')] }),
    new Paragraph({ children: [...cb(!!data.sonstiges, data.sonstiges || '…………………….')] }),
  ];
}

function createErstaufnahmeCheckboxen(data: Offerte['checkboxen']['erstaufnahme']): Paragraph[] {
  return [
    new Paragraph({
      children: [
        ...cb(data.fassaden, 'Fassaden'),
        ...cb(data.strassen, 'Strassen ('),
        ...cb(data.strassenBelag, 'Belagszustand'),
        ...cb(data.strassenRand, 'Randabschlüsse)'),
      ],
    }),
    new Paragraph({
      children: [
        ...cb(data.innenraeume, 'Innenräume'),
        ...cb(data.aussenanlagen, 'Aussenanlagen (Vorplätze, Mauern, Einfriedungen etc.)'),
      ],
    }),
    new Paragraph({ children: [...cb(!!data.sonstiges, data.sonstiges || '…………………….')] }),
  ];
}

function createDokumentationCheckboxen(data: Offerte['checkboxen']['dokumentation']): Paragraph[] {
  return [
    new Paragraph({ children: [...cb(data.rissprotokoll, 'Rissprotokoll der gemäss 2.2 Erstaufnahmen festgelegten Objekte')] }),
    new Paragraph({ children: [...cb(data.fotoAussen, 'Fotodokumentation Aussen (Fassaden, Vorplätze, Einfriedungen etc.)')] }),
    new Paragraph({ children: [...cb(data.fotoInnen, 'Fotodokumentation Innen (Innenräume, Treppenhaus etc.)')] }),
    new Paragraph({ children: [...cb(data.fotoStrasse, 'Fotodokumentation Strassenzustand')] }),
    new Paragraph({ children: [...cb(data.zustellbestaetigung, 'Zustellbestätigung (Versand per Einschreiben an die jeweiligen Eigentümer/Vertreter)')] }),
    new Paragraph({ children: [...cb(data.datenabgabe, 'Datenabgabe Auftraggeber (Bilder/Berichte per Webplattform, Zustellbestätigungen)')] }),
  ];
}

// === KOSTEN-TABELLE ===
function createKostenRow(label: string, value: string, isBold = false): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: isBold, size: 22 })] })],
      }),
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.NONE },
          bottom: { style: BorderStyle.NONE },
          left: { style: BorderStyle.NONE },
          right: { style: BorderStyle.NONE },
        },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, bold: isBold, size: 22 })] })],
      }),
    ],
  });
}

function createKostenTabelle(kosten: { leistungspreis: number; rabattProzent: number }): Table {
  const { rabattBetrag, zwischentotal, mwstBetrag, total } = berechneKosten(kosten.leistungspreis, kosten.rabattProzent);

  const rows = [
    createKostenRow('Tätigkeit', 'Fr.', true),
    createKostenRow('Leistungen gemäss Offerte', formatCHF(kosten.leistungspreis)),
  ];

  if (kosten.rabattProzent > 0) {
    rows.push(createKostenRow(`Rabatt ${kosten.rabattProzent.toFixed(1)}%`, `-${formatCHF(rabattBetrag)}`));
  }

  rows.push(createKostenRow('Zwischentotal', formatCHF(zwischentotal)));
  rows.push(createKostenRow('MwSt. 8.1%', formatCHF(mwstBetrag)));
  rows.push(createKostenRow(`Total pauschal (inkl. ${kosten.rabattProzent.toFixed(1)}% Rabatt und inkl. 8.1% MwSt.)`, formatCHF(total), true));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows,
  });
}

// === UNTERSCHRIFTEN ===
function createUnterschriftenBlock(ansprechpartnerIds: string[]): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  paragraphs.push(new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'HMQ AG', size: 22 })] }));
  paragraphs.push(new Paragraph({ spacing: { before: 600 } }));

  const aps = ansprechpartnerIds.map(id => ANSPRECHPARTNER[id]).filter(Boolean);

  if (aps.length >= 2) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${aps[0].vorname} ${aps[0].nachname}`, size: 22 }),
          new TextRun({ text: '\t\t\t\t' }),
          new TextRun({ text: `${aps[1].vorname} ${aps[1].nachname}`, size: 22 }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: aps[0].funktion, size: 22 }),
          new TextRun({ text: '\t\t\t\t' }),
          new TextRun({ text: aps[1].funktion, size: 22 }),
        ],
      }),
      new Paragraph({
        children: [
          new TextRun({ text: aps[0].rolle, size: 22 }),
          new TextRun({ text: '\t\t' }),
          new TextRun({ text: aps[1].rolle, size: 22 }),
        ],
      })
    );
  }

  return paragraphs;
}

// === PLANBEILAGE ===
function createPlanbeilageSeite(planbeilage: NonNullable<Offerte['planbeilage']>): Paragraph[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Planbeilage', bold: true, size: 28 })],
    }),
    new Paragraph({}),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data: Buffer.from(planbeilage.base64, 'base64'),
          transformation: { width: 550, height: 400 },
          type: planbeilage.mimeType === 'image/png' ? 'png' : 'jpg',
        }),
      ],
    }),
    new Paragraph({ spacing: { before: 400 } }),
    new Paragraph({ children: [new TextRun({ text: 'Legende', bold: true, size: 22 })] }),
    new Paragraph({
      children: [
        new TextRun({ text: '▶ ', color: 'FF6600', size: 22 }),
        new TextRun({ text: 'Fassaden inkl. Aussenanlagen (Mauern, Vorplätze, etc.)', size: 22 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '▶ ', color: '0066FF', size: 22 }),
        new TextRun({ text: 'Innenaufnahmen', size: 22 }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: '▶ ', color: '00AA00', size: 22 }),
        new TextRun({ text: 'Strassen', size: 22 }),
      ],
    }),
  ];
}

// === STANDARDTEXTE ===
const TEXTE = {
  einleitung: (anfrageDatum: string) =>
    `Wir beziehen uns auf Ihre Anfrage vom ${formatDatumLang(anfrageDatum)} in erwähnter Angelegenheit und danken Ihnen dafür. Gerne unterbreiten wir Ihnen unsere Offerte wie folgt:`,

  ausgangslage:
    'Wegen Bauarbeiten, welche unter Umständen schädigende Auswirkungen auf die Nachbarliegenschaften haben können, sollen vorgängig zwecks Beweissicherung Zustandsaufnahmen der umliegenden Bauten erstellt werden.',

  leistungenIntro:
    'Folgende Leistungen werden im Rahmen der Beweissicherung durch die HMQ erbracht:',

  hinweisKoordination:
    'Folgendes gilt es zu beachten: Der HMQ ist eine detaillierte Eigentümerliste pro Liegenschaft mit folgenden Kontaktangaben anzugeben: Name Eigentümer/Verwaltung, Adresse, Telefonnummer. Werden diese Daten nicht bereitgestellt und auf Wunsch durch die HMQ AG zusammengestellt, werden die dadurch anfallenden Aufwände und Kosten (Gebühren wie z. Bsp. Grundbuchauszug) zusätzlich verrechnet.',

  erstaufnahmeIntro:
    'Folgende Objekte (gemäss der Planbeilage) werden fotografisch aufgenommen und dokumentiert (Rissprotokoll) und basieren auf der Norm SN 640 312a „Erschütterungen der Vereinigung Schweizerischer Strassenfachleute VSS":',

  hinweisErstaufnahme:
    'Folgendes gilt es zu beachten: Für die Erstaufnahme vor Ort wurden total zwei Einsatzpauschalen (Einsätze an maximal zwei verschiedenen Tagen) einberechnet. Sollten aufgrund von Terminkomplikationen oder Nichterscheinen von Eigentümer/Vertreter weitere Einsätze nötig sein, werden pro Einsatz zusätzlich Fr. 250.- verrechnet.',

  dokumentationIntro:
    'Pro Parzelle wird ein Bericht mit folgendem Inhalt verfasst:',

  hinweisDokumentation:
    'Folgendes gilt es zu beachten: Dokumentationen von Liegenschaften wie z. Bsp. Zufahrtsstrassen o.Ä., welche diverse Eigentümer aufweisen, werden nicht per Post versendet und enthalten keine Auflistung der Eigentümer.',

  kostenIntro:
    'Wir schlagen Ihnen vor, die anfallenden Kosten für die Beweissicherungsaufnahmen pauschal wie folgt für Sie ausführen zu dürfen:',

  termine: (vorlaufzeit: string) =>
    `Die Aufnahmen werden in Absprache mit dem Auftraggeber durchgeführt. Um eine vollständige und reibungslose Organisation zu gewährleisten, wird eine Vorlaufzeit von mindestens ${vorlaufzeit} benötigt, um die gewünschten Aufnahmen zu terminieren. Dies wird gemäss Erfahrung auch seitens der Eigentümer/Verwaltungen vorausgesetzt.\n\nOffertgültigkeit: 90 Tage`,

  datenschutz:
    'Der Auftraggeber nimmt zur Kenntnis, dass die HMQ AG als Auftragnehmerin personenbezogene Daten verarbeitet, soweit dies im Rahmen der Anfrage erforderlich ist. Der Auftraggeber bestätigt mit der Auftragserteilung die Datenschutzerklärung des Auftragnehmers zur Kenntnis genommen zu haben.',

  kompetenz:
    'Wir können eine umfassende Erfahrung und Fachkompetenz in die Bearbeitung der offerierten Aufgaben einbringen, was auch unsere umfassenden Referenzen auf www.beweissicherungen.ch eindeutig aufzeigen.\n\nWir würden uns sehr freuen, diesen Auftrag für Sie bearbeiten zu dürfen und versichern Ihnen eine kompetente, zuverlässige und termingerechte Erledigung Ihres Auftrages.\n\nGerne stehen wir Ihnen jederzeit für allfällige Fragen zur Verfügung.',

  gruss: 'Freundliche Grüsse',
};

// === HAUPTFUNKTION ===
export async function generateOfferte(offerte: Offerte): Promise<Buffer> {
  const standort = STANDORTE[offerte.standortId] || STANDORTE.zh;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
          },
        },
        children: [
          // Absender
          createAbsenderZeile(standort),
          new Paragraph({}),

          // Empfänger
          ...createEmpfaengerBlock(offerte),
          new Paragraph({}),

          // Ort, Datum
          createOrtDatum(standort, offerte.datum),
          new Paragraph({}),

          // Betreff
          ...createBetreff(offerte),
          new Paragraph({}),

          // Anrede
          new Paragraph({ children: [new TextRun({ text: 'Sehr geehrte Damen und Herren', size: 22 })] }),
          new Paragraph({}),

          // Einleitung
          new Paragraph({ children: [new TextRun({ text: TEXTE.einleitung(offerte.projekt.anfrageDatum || offerte.datum), size: 22 })] }),
          new Paragraph({}),

          // Ausgangslage
          new Paragraph({ children: [new TextRun({ text: 'Ausgangslage', bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.ausgangslage, size: 22 })] }),
          new Paragraph({}),

          // 1.1 Art des Bauvorhabens
          new Paragraph({ children: [new TextRun({ text: '1.1 Art des Bauvorhabens', bold: true, size: 22 })] }),
          ...createArtBauvorhabenCheckboxen(offerte.checkboxen.artBauvorhaben),
          ...createArtGebaeudeCheckboxen(offerte.checkboxen.artGebaeude),

          // 1.2 Tätigkeiten
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '1.2 Tätigkeiten, die Erschütterungen und Rissbildungen erzeugen können', bold: true, size: 22 })] }),
          ...createTaetigkeitenCheckboxen(offerte.checkboxen.taetigkeiten),

          // Leistungen Header
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Leistungen Beweissicherung', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.leistungenIntro, size: 22 })] }),

          // 2.1 Koordination
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '2.1 Koordination mit den Eigentümern', bold: true, size: 22 })] }),
          ...createKoordinationCheckboxen(offerte.checkboxen.koordination),
          new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: TEXTE.hinweisKoordination, size: 20, italics: true })] }),

          // 2.2 Erstaufnahme
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '2.2 Beweissicherung Erstaufnahme', bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.erstaufnahmeIntro, size: 22 })] }),
          ...createErstaufnahmeCheckboxen(offerte.checkboxen.erstaufnahme),
          new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: TEXTE.hinweisErstaufnahme, size: 20, italics: true })] }),

          // 2.3 Dokumentation
          new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: '2.3 Dokumentation/Datenabgabe', bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.dokumentationIntro, size: 22 })] }),
          ...createDokumentationCheckboxen(offerte.checkboxen.dokumentation),
          new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: TEXTE.hinweisDokumentation, size: 20, italics: true })] }),

          // KOSTEN
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'KOSTEN', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: '3.1 Beweissicherung Erstaufnahme', bold: true, size: 22 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.kostenIntro, size: 22 })] }),
          new Paragraph({}),
          createKostenTabelle(offerte.kosten),

          // Termine
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Termine', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.termine(offerte.vorlaufzeit), size: 22 })] }),

          // Datenschutz
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'Datenschutz', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.datenschutz, size: 22 })] }),

          // Kompetenz
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: 'KOMPETENZ', bold: true, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: TEXTE.kompetenz, size: 22 })] }),

          // Gruss
          new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: TEXTE.gruss, size: 22 })] }),

          // Unterschriften
          ...createUnterschriftenBlock(offerte.ansprechpartnerIds),

          // Beilagen
          new Paragraph({ spacing: { before: 400 }, children: [new TextRun({ text: 'Beilagen: Planbeilage', size: 22 })] }),

          // Planbeilage (neue Seite)
          ...(offerte.planbeilage
            ? [new Paragraph({ children: [new PageBreak()] }), ...createPlanbeilageSeite(offerte.planbeilage)]
            : []),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}
