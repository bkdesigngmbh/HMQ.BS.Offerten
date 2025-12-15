import { NextResponse } from 'next/server';
import { generateOfferteFromTemplate } from '@/lib/docx-template-generator';

export async function POST(request: Request) {
  try {
    const offerte = await request.json();

    // Validierung
    if (!offerte.offertnummer?.trim()) {
      return NextResponse.json({ error: 'Offertnummer fehlt' }, { status: 400 });
    }
    if (!offerte.empfaenger?.firma?.trim()) {
      return NextResponse.json({ error: 'Firma fehlt' }, { status: 400 });
    }

    console.log('Generiere Offerte:', offerte.offertnummer);

    const buffer = await generateOfferteFromTemplate(offerte);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="Offerte_${offerte.offertnummer.replace(/\./g, '-')}.docx"`,
      },
    });
  } catch (error) {
    console.error('Fehler:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
