import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tiktokUrl = searchParams.get('url');

  if (!tiktokUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(tiktokUrl)}`);
    const data = await res.json();

    if (data && data.thumbnail_url) {
      return NextResponse.json({ thumbnailUrl: data.thumbnail_url });
    } else {
      return NextResponse.json({ error: 'Failed to extract thumbnail' }, { status: 400 });
    }
  } catch (error) {
    console.error('TikTok oEmbed Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
