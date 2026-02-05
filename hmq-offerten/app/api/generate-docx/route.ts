import { NextResponse } from 'next/server';
import { generateOfferteFromTemplate } from '@/lib/docx-template-generator';
import { convertDocxToPdf, isCloudConvertConfigured } from '@/lib/cloudconvert';

export async function POST(request: Request) {
  try {
    const offerte = await request.json();

    if (!offerte.offertnummer?.trim()) {
      return NextResponse.json({ error: 'Offertnummer fehlt' }, { status: 400 });
    }
    if (!offerte.empfaenger?.firma?.trim()) {
      return NextResponse.json({ error: 'Firma fehlt' }, { status: 400 });
    }

    console.log('Generiere Offerte:', offerte.offertnummer);
    console.log('Planbeilage:', offerte.planbeilage ? 'Ja' : 'Nein');

    // DOCX generieren
    const docxBuffer = await generateOfferteFromTemplate(offerte);

    // Dateiname zusammenbauen
    const projektOrt = offerte.projekt?.ort || '';
    const projektBezeichnung = offerte.projekt?.bezeichnung || '';
    let baseName = `Beweissicherung ¦ ${offerte.offertnummer}`;
    if (projektOrt) {
      baseName += ` ${projektOrt}`;
    }
    if (projektBezeichnung) {
      baseName += `, ${projektBezeichnung}`;
    }
    // Ungültige Zeichen für Dateinamen entfernen
    baseName = baseName.replace(/[<>:"/\\|?*]/g, '');

    // PDF generieren falls CloudConvert konfiguriert
    let pdfBuffer: Buffer | null = null;
    if (isCloudConvertConfigured()) {
      try {
        console.log('Konvertiere zu PDF...');
        pdfBuffer = await convertDocxToPdf(docxBuffer, `${baseName}.docx`);
        console.log('PDF erstellt');
      } catch (pdfError) {
        console.error('PDF-Konvertierung fehlgeschlagen:', pdfError);
        // Weitermachen ohne PDF
      }
    }

    // Response: JSON mit Base64-kodierten Dateien
    return NextResponse.json({
      docx: {
        data: docxBuffer.toString('base64'),
        filename: `${baseName}.docx`,
      },
      pdf: pdfBuffer
        ? {
            data: pdfBuffer.toString('base64'),
            filename: `${baseName}.pdf`,
          }
        : null,
    });
  } catch (error) {
    console.error('Fehler:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
