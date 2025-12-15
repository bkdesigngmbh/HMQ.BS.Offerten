import { NextResponse } from 'next/server';
import { generateOfferteFromTemplateWithCheckboxes } from '@/lib/docx-template-generator';

export async function POST(request: Request) {
  try {
    const offerte = await request.json();

    // Validierung
    if (!offerte.offertnummer || !offerte.empfaenger?.name) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 });
    }

    // Word generieren
    const buffer = await generateOfferteFromTemplateWithCheckboxes(offerte);

    // Als Download zurückgeben (Buffer zu Uint8Array für Next.js 16)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Offerte_${offerte.offertnummer.replace(/\./g, '-')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Fehler bei Word-Generierung:', error);
    return NextResponse.json({ error: 'Fehler beim Generieren der Offerte' }, { status: 500 });
  }
}
