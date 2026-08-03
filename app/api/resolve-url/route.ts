import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return NextResponse.json({ finalUrl: response.url });
  } catch (error) {
    console.error('Error resolving URL:', error);
    // En caso de error (CORS o bloqueo), devolvemos la misma URL para no romper el flujo
    return NextResponse.json({ finalUrl: url });
  }
}
