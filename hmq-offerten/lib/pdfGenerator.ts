import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Offerte, Standort, Ansprechpartner } from './types';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: {
      startY?: number;
      head?: string[][];
      body: (string | number)[][];
      theme?: string;
      styles?: Record<string, unknown>;
      headStyles?: Record<string, unknown>;
      columnStyles?: Record<number, Record<string, unknown>>;
      margin?: { left?: number; right?: number };
    }) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

const MWST_SATZ = 0.081;

interface PdfGeneratorOptions {
  offerte: Offerte;
  standort: Standort | undefined;
  ansprechpartner: Ansprechpartner[];
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency',
    currency: 'CHF',
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '–';
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-CH');
};

export async function generateOffertePdf({
  offerte,
  standort,
  ansprechpartner,
}: PdfGeneratorOptions): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let currentY = 20;

  // === HEADER ===
  // Logo placeholder (left side)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('HMQ AG', margin, currentY);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Beweissicherung', margin, currentY + 5);

  // Standort (right side)
  if (standort) {
    doc.setFontSize(9);
    const rightX = pageWidth - margin;
    doc.text(standort.name, rightX, currentY, { align: 'right' });
    doc.text(standort.strasse, rightX, currentY + 4, { align: 'right' });
    doc.text(standort.plzOrt, rightX, currentY + 8, { align: 'right' });
    doc.text(standort.telefon, rightX, currentY + 12, { align: 'right' });
  }

  currentY += 30;

  // === OFFERTE INFO ===
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Offerte Nr.: ${offerte.offertnummer || '–'}`, margin, currentY);
  doc.text(`Datum: ${formatDate(offerte.datum)}`, margin, currentY + 5);
  doc.setTextColor(0);

  currentY += 15;

  // === EMPFÄNGER ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const anredeText = offerte.empfaenger.anrede ? `${offerte.empfaenger.anrede} ` : '';
  doc.text(`${anredeText}${offerte.empfaenger.name || '–'}`, margin, currentY);
  doc.setFont('helvetica', 'normal');
  currentY += 5;

  if (offerte.empfaenger.zusatz) {
    doc.setFontSize(10);
    doc.text(offerte.empfaenger.zusatz, margin, currentY);
    currentY += 5;
  }

  doc.setFontSize(10);
  if (offerte.empfaenger.strasse) {
    doc.text(offerte.empfaenger.strasse, margin, currentY);
    currentY += 5;
  }
  if (offerte.empfaenger.plzOrt) {
    doc.text(offerte.empfaenger.plzOrt, margin, currentY);
    currentY += 5;
  }

  currentY += 10;

  // === TITEL ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`Offerte: ${offerte.projekt.bezeichnung || '–'}`, margin, currentY);
  currentY += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(
    `Projekt-Ort: ${offerte.projekt.ort || '–'} | Anfragedatum: ${formatDate(offerte.projekt.anfrageDatum)}`,
    margin,
    currentY
  );
  doc.setTextColor(0);
  currentY += 10;

  // === LEISTUNGSUMFANG ===
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Leistungsumfang:', margin, currentY);
  currentY += 6;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  // Art Bauvorhaben
  const artBauvorhaben = [
    offerte.checkboxen.artBauvorhaben.neubau && 'Neubau',
    offerte.checkboxen.artBauvorhaben.umbau && 'Umbau',
    offerte.checkboxen.artBauvorhaben.rueckbau && 'Rückbau',
    offerte.checkboxen.artBauvorhaben.sonstiges,
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Art Bauvorhaben:', margin, currentY);
  doc.setTextColor(0);
  doc.text(artBauvorhaben, margin + 35, currentY);
  currentY += 5;

  // Art Gebäude
  const artGebaeude = [
    offerte.checkboxen.artGebaeude.efhFreistehend && 'EFH freistehend',
    offerte.checkboxen.artGebaeude.reihenhaus && 'Reihenhaus',
    offerte.checkboxen.artGebaeude.terrassenhaus && 'Terrassenhaus',
    offerte.checkboxen.artGebaeude.mfh && 'MFH',
    offerte.checkboxen.artGebaeude.strassen && 'Strassen',
    offerte.checkboxen.artGebaeude.kunstbauten && 'Kunstbauten',
    offerte.checkboxen.artGebaeude.sonstiges1,
    offerte.checkboxen.artGebaeude.sonstiges2,
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Art Gebäude:', margin, currentY);
  doc.setTextColor(0);
  doc.text(artGebaeude, margin + 35, currentY);
  currentY += 5;

  // Tätigkeiten
  const taetigkeiten = [
    offerte.checkboxen.taetigkeiten.aushub && 'Aushub',
    offerte.checkboxen.taetigkeiten.rammarbeiten && 'Rammarbeiten',
    offerte.checkboxen.taetigkeiten.mikropfaehle && 'Mikropfähle',
    offerte.checkboxen.taetigkeiten.baustellenverkehr && 'Baustellenverkehr',
    offerte.checkboxen.taetigkeiten.schwereMaschinen && 'Schwere Maschinen',
    offerte.checkboxen.taetigkeiten.sprengungen && 'Sprengungen',
    offerte.checkboxen.taetigkeiten.diverses && 'Diverses',
    offerte.checkboxen.taetigkeiten.sonstiges,
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Tätigkeiten:', margin, currentY);
  doc.setTextColor(0);
  doc.text(taetigkeiten, margin + 35, currentY);
  currentY += 5;

  // Koordination
  const koordination = [
    offerte.checkboxen.koordination.schriftlicheInfo && 'Schriftliche Info',
    offerte.checkboxen.koordination.terminvereinbarung && 'Terminvereinbarung',
    offerte.checkboxen.koordination.durchAuftraggeber && 'Durch Auftraggeber',
    offerte.checkboxen.koordination.sonstiges,
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Koordination:', margin, currentY);
  doc.setTextColor(0);
  doc.text(koordination, margin + 35, currentY);
  currentY += 5;

  // Erstaufnahme
  const erstaufnahme = [
    offerte.checkboxen.erstaufnahme.fassaden && 'Fassaden',
    offerte.checkboxen.erstaufnahme.strassen && 'Strassen',
    offerte.checkboxen.erstaufnahme.strassenBelag && 'Strassenbelag',
    offerte.checkboxen.erstaufnahme.strassenRand && 'Strassenrand',
    offerte.checkboxen.erstaufnahme.innenraeume && 'Innenräume',
    offerte.checkboxen.erstaufnahme.aussenanlagen && 'Aussenanlagen',
    offerte.checkboxen.erstaufnahme.sonstiges,
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Erstaufnahme:', margin, currentY);
  doc.setTextColor(0);
  doc.text(erstaufnahme, margin + 35, currentY);
  currentY += 5;

  // Dokumentation
  const dokumentation = [
    offerte.checkboxen.dokumentation.rissprotokoll && 'Rissprotokoll',
    offerte.checkboxen.dokumentation.fotoAussen && 'Foto aussen',
    offerte.checkboxen.dokumentation.fotoInnen && 'Foto innen',
    offerte.checkboxen.dokumentation.fotoStrasse && 'Foto Strasse',
    offerte.checkboxen.dokumentation.zustellbestaetigung && 'Zustellbestätigung',
    offerte.checkboxen.dokumentation.datenabgabe && 'Datenabgabe',
  ].filter(Boolean).join(', ') || '–';

  doc.setTextColor(100);
  doc.text('Dokumentation:', margin, currentY);
  doc.setTextColor(0);
  doc.text(dokumentation, margin + 35, currentY);
  currentY += 10;

  // Vorlaufzeit
  doc.setTextColor(100);
  doc.text('Vorlaufzeit:', margin, currentY);
  doc.setTextColor(0);
  doc.text(offerte.vorlaufzeit || '–', margin + 35, currentY);
  currentY += 15;

  // === KOSTENTABELLE ===
  const { leistungspreis, rabattProzent } = offerte.kosten;
  const rabattBetrag = (leistungspreis * rabattProzent) / 100;
  const netto = leistungspreis - rabattBetrag;
  const mwst = netto * MWST_SATZ;
  const total = netto + mwst;

  const tableBody: (string | number)[][] = [['Leistungspreis', formatCurrency(leistungspreis)]];

  if (rabattProzent > 0) {
    tableBody.push([`Rabatt (${rabattProzent}%)`, `-${formatCurrency(rabattBetrag)}`]);
  }

  tableBody.push(
    ['Netto', formatCurrency(netto)],
    ['MwSt (8.1%)', formatCurrency(mwst)],
    ['Total', formatCurrency(total)]
  );

  doc.autoTable({
    startY: currentY,
    body: tableBody,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 50, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  currentY = doc.lastAutoTable.finalY + 20;

  // === GRUSSFORMEL UND UNTERSCHRIFTEN ===
  doc.setFontSize(10);
  doc.text('Mit freundlichen Grüssen', margin, currentY);
  currentY += 10;

  // Ansprechpartner mit Unterschriften
  let signatureX = margin;
  for (const ap of ansprechpartner) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${ap.vorname} ${ap.nachname}`, signatureX, currentY + 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(ap.funktion, signatureX, currentY + 20);
    signatureX += 70;
  }

  if (ansprechpartner.length === 0) {
    doc.setTextColor(150);
    doc.text('Keine Ansprechpartner gewählt', margin, currentY + 15);
    doc.setTextColor(0);
  }

  // === PLANBEILAGE AUF NEUER SEITE ===
  if (offerte.planbeilage?.base64) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Planbeilage', margin, 20);

    try {
      // Extract image format and data
      const base64Parts = offerte.planbeilage.base64.split(',');
      const imageData = base64Parts.length > 1 ? base64Parts[1] : offerte.planbeilage.base64;
      const format = offerte.planbeilage.mimeType === 'image/png' ? 'PNG' : 'JPEG';

      doc.addImage(imageData, format, margin, 30, pageWidth - 2 * margin, 0);
    } catch {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Planbeilage konnte nicht geladen werden.', margin, 35);
    }
  }

  // Download PDF
  const filename = offerte.offertnummer
    ? `Offerte_${offerte.offertnummer.replace(/\./g, '_')}.pdf`
    : `Offerte_${formatDate(offerte.datum).replace(/\./g, '_')}.pdf`;

  doc.save(filename);
}
