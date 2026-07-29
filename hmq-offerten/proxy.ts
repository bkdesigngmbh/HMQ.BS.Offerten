import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Schützt die ganze App (Seiten, /admin, /api und statische Assets) mit
// HTTP Basic Auth, gleiche Lösung wie beim Offertgenerator V2. Die Zugangsdaten
// kommen aus Umgebungsvariablen; fehlen sie, bleibt die App gesperrt
// (fail closed) statt still öffentlich zu werden.
export function proxy(request: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPass = process.env.BASIC_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return new NextResponse(
      'Zugriff nicht konfiguriert: BASIC_AUTH_USER und BASIC_AUTH_PASS als Umgebungsvariablen setzen.',
      { status: 503 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Basic ')) {
    const [user, pass] = atob(authHeader.slice(6)).split(':');
    if (user === expectedUser && pass === expectedPass) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Anmeldung erforderlich.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="HMQ Offertgenerator"' },
  });
}
