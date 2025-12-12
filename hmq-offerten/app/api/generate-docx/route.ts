import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const offerte = await request.json();
    console.log('Offerte empfangen:', offerte);

    // TODO: Word-Generierung wird vom Senior Developer implementiert
    return NextResponse.json(
      { error: 'Word-Generierung noch nicht implementiert' },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Fehler beim Verarbeiten der Anfrage' },
      { status: 500 }
    );
  }
}
