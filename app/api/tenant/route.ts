import { NextResponse } from 'next/server';
import { getTenant } from '@/lib/tenant';
import { headers } from 'next/headers';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const headersList = await headers();
    
    // Prioridad: 1. Param ?slug, 2. Cabecera x-tenant-slug, 3. Default gibbor
    const slug = searchParams.get('slug') || headersList.get('x-tenant-slug') || 'gibbor';
    
    const tenant = await getTenant(slug);
    return NextResponse.json(tenant);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
