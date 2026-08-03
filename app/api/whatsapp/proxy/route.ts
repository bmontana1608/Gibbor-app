import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, method, headers, data } = body;

    if (!url) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    console.log(`[WA-PROXY] ${method} a ${url}`);

    const response = await fetch(url, {
      method: method || 'GET',
      headers: headers || {},
      body: data ? JSON.stringify(data) : undefined,
    });

    const contentType = response.headers.get("content-type");
    let responseData;
    
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = { text: await response.text() };
    }

    return NextResponse.json({ 
      status: response.status,
      ok: response.ok,
      data: responseData,
      headers: Object.fromEntries(response.headers.entries())
    });

  } catch (error: any) {
    console.error('[WA-PROXY-ERROR]', error);
    return NextResponse.json({ 
      error: 'Error en el proxy de WhatsApp', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('apikey');

  if (!targetUrl) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'apikey': apiKey || '',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
