import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MP_CLIENT_ID = process.env.NEXT_PUBLIC_MP_CLIENT_ID || '7714123508461740';
const MP_CLIENT_SECRET = process.env.MP_ACCESS_TOKEN || 'APP_USR-7714123508461740-061010-314ecedc6ca640a4b0594e0deb3a5833-3465102986';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(new URL('/?error=missing_mp_params', req.url));
    }

    // El state contiene el clubId_slug. Lo separamos.
    // Ej: "5f3a..._gibbor"
    const [clubId, slug] = state.split(':::');

    if (!clubId) {
       return NextResponse.redirect(new URL('/?error=invalid_state', req.url));
    }

    const redirectUri = `${url.origin}/api/mercadopago/callback`; // Siempre debe ser este mismo endpoint

    // Intercambiar el authorization_code por las credenciales del club
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Bearer ${MP_CLIENT_SECRET}`
      },
      body: new URLSearchParams({
        client_id: MP_CLIENT_ID,
        client_secret: MP_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri
      }).toString()
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('MercadoPago OAuth Error:', data);
      return NextResponse.redirect(new URL(`/${slug || ''}/director/configuracion?mp_status=error`, req.url));
    }

    const { access_token, public_key } = data;

    // Guardar las credenciales en la base de datos para este club
    await supabaseAdmin
      .from('clubes')
      .update({
        mp_access_token: access_token,
        mp_public_key: public_key
      })
      .eq('id', clubId);

    // Redirigir al director de vuelta a su panel específico
    return NextResponse.redirect(new URL(`/${slug || ''}/director/configuracion?mp_status=success`, req.url));

  } catch (error: any) {
    console.error('MP Callback Error:', error);
    return NextResponse.redirect(new URL('/?error=server_error', req.url));
  }
}
