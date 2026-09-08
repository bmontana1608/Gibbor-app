import { Metadata } from 'next';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const { data: form } = await supabaseAdmin
      .from('formularios')
      .select('titulo, descripcion, logo_url, banner_url, clubes(nombre, logo_url)')
      .eq('id', id)
      .single();

    if (!form) {
      return {
        title: 'Formulario | Master Club Manager',
      };
    }

    const club = form.clubes as any;
    // Prioridad para WhatsApp y preview: banner -> logo formulario -> logo club
    const rawImage = form.banner_url || form.logo_url || club?.logo_url || '/mcm-favicon.png';
    const imageUrl = rawImage.startsWith('http') 
      ? rawImage 
      : `https://www.masterclubmanager.com${rawImage}`;

    const titulo = form.titulo 
      ? `${form.titulo}` 
      : 'Formulario Oficial | Master Club Manager';

    const descripcion = form.descripcion 
      ? form.descripcion.slice(0, 160) 
      : `Formulario oficial de inscripción y registro - ${club?.nombre || 'Master Club Manager'}`;

    const pageUrl = `https://www.masterclubmanager.com/f/${id}`;

    return {
      metadataBase: new URL('https://www.masterclubmanager.com'),
      title: `${titulo} | Master Club Manager`,
      description: descripcion,
      icons: {
        icon: imageUrl,
        shortcut: imageUrl,
        apple: imageUrl,
      },
      openGraph: {
        title: titulo,
        description: descripcion,
        url: pageUrl,
        siteName: club?.nombre || 'Master Club Manager',
        type: 'website',
        locale: 'es_ES',
        images: [
          {
            url: imageUrl,
            secureUrl: imageUrl,
            width: 1200,
            height: 630,
            alt: titulo,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title: titulo,
        description: descripcion,
        images: [imageUrl],
      },
    };
  } catch (error) {
    console.error('Error generando metadata para formulario:', error);
    return {
      title: 'Formulario | Master Club Manager',
    };
  }
}

export default async function FormularioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let form: any = null;
  try {
    const { data } = await supabaseAdmin
      .from('formularios')
      .select('titulo, descripcion, logo_url, banner_url, clubes(nombre, logo_url)')
      .eq('id', id)
      .single();
    form = data;
  } catch (e) {
    // fallback
  }

  const club = form?.clubes;
  const rawImage = form?.banner_url || form?.logo_url || club?.logo_url || '/mcm-favicon.png';
  const imageUrl = rawImage.startsWith('http') 
    ? rawImage 
    : `https://www.masterclubmanager.com${rawImage}`;

  const titulo = form?.titulo || 'Formulario Oficial';
  const descripcion = form?.descripcion 
    ? form.descripcion.slice(0, 160) 
    : `Formulario oficial de inscripción y registro - ${club?.nombre || 'Master Club Manager'}`;
  const pageUrl = `https://www.masterclubmanager.com/f/${id}`;

  return (
    <>
      <head>
        <meta property="og:title" content={titulo} />
        <meta property="og:description" content={descripcion} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:secure_url" content={imageUrl} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={club?.nombre || 'Master Club Manager'} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={titulo} />
        <meta name="twitter:description" content={descripcion} />
        <meta name="twitter:image" content={imageUrl} />
        <link rel="image_src" href={imageUrl} />
      </head>
      {children}
    </>
  );
}