import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';

export async function GET() {
  try {
    const tenant = await getTenant();
    return NextResponse.json(tenant);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
