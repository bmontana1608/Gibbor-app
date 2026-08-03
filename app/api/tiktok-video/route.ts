import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tiktokUrl = searchParams.get('url');

  if (!tiktokUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}`);
    const data = await res.json();

    if (data && data.data && data.data.play) {
      return NextResponse.json({ playUrl: data.data.play });
    } else {
      return NextResponse.json({ error: 'Failed to extract video' }, { status: 400 });
    }
  } catch (error) {
    console.error('TikTok API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
