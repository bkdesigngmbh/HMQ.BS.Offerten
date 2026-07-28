import { NextResponse } from 'next/server';
import { generateOfferteFromTemplate } from '@/lib/docx-template-generator';
import { convertDocxToPdf, isCloudConvertConfigured } from '@/lib/cloudconvert';

export async function POST(request: Request) {
  try {
    const offerte = await request.json();

    // Eingabevalidierung
    if (!offerte.offertnummer?.trim()) {
      return NextResponse.json({ error: 'Offertnummer fehlt' }, { status: 400 });
    }
    if (!offerte.empfaenger?.firma?.trim()) {
      return NextResponse.json({ error: 'Firma fehlt' }, { status: 400 });
    }
    if (!/^\d{2}\.\d{2}\.\d{3}$/.test(offerte.offertnummer.trim())) {
      return NextResponse.json({ error: 'Ungültiges Offertnummer-Format (erwartet: XX.XX.XXX)' }, { status: 400 });
    }

    // EMG-Validierung: bei aktivem EMG sind Geräte, Wochen und berechnete Werte Pflicht
    const offertart: string = offerte.offertart ?? 'bs';
    if (offertart === 'bs_emg' || offertart === 'emg') {
      if (!offerte.emg || !(offerte.emg.anzahlGeraete >= 1)) {
        return NextResponse.json({ error: 'EMG: Anzahl Geräte fehlt' }, { status: 400 });
      }
      if (!(offerte.emg.anzahlWochen >= 1)) {
        return NextResponse.json({ error: 'EMG: Anzahl Wochen fehlt' }, { status: 400 });
      }
      if (!offerte.emg.gespeicherteWerte) {
        return NextResponse.json({ error: 'EMG: Kostenwerte fehlen (Tab 2 Kosten öffnen)' }, { status: 400 });
      }
    }

    // DOCX generieren
    const docxBuffer = await generateOfferteFromTemplate(offerte);

    // Dateiname zusammenbauen
    const projektOrt = offerte.projekt?.ort || '';
    const projektBezeichnung = offerte.projekt?.bezeichnung || '';
    const prefix = offertart === 'emg' ? 'Erschütterungsmessung' : 'Beweissicherung';
    let baseName = `${prefix} ¦ ${offerte.offertnummer}`;
    if (projektOrt) {
      baseName += ` ${projektOrt}`;
    }
    if (projektBezeichnung) {
      baseName += `, ${projektBezeichnung}`;
    }
    baseName = baseName.replace(/[<>:"/\\|?*]/g, '');

    // PDF generieren falls CloudConvert konfiguriert
    let pdfBuffer: Buffer | null = null;

    if (isCloudConvertConfigured()) {
      try {
        pdfBuffer = await convertDocxToPdf(docxBuffer, `${baseName}.docx`);
      } catch (pdfError) {
        console.error('PDF-Konvertierung fehlgeschlagen:', pdfError);
      }
    }

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
    console.error('Fehler bei Offerte-Generierung:', error);
    return NextResponse.json(
      { error: 'Fehler beim Generieren der Offerte' },
      { status: 500 }
    );
  }
}
