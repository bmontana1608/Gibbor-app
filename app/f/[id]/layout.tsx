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
    // Prioridad solicitada: banner -> logo de formulario -> logo del club
    const faviconUrl = form.banner_url || form.logo_url || club?.logo_url || '/mcm-favicon.png';
    const titulo = form.titulo ? `${form.titulo} | Master Club Manager` : 'Formulario Oficial | Master Club Manager';
    const descripcion = form.descripcion || 'Formulario de registro y carnetización oficial.';

    return {
      title: titulo,
      description: descripcion,
      icons: {
        icon: faviconUrl,
        shortcut: faviconUrl,
        apple: faviconUrl,
      },
      openGraph: {
        title: titulo,
        description: descripcion,
        images: [{ url: faviconUrl }],
      },
      twitter: {
        card: 'summary_large_image',
        title: titulo,
        description: descripcion,
        images: [faviconUrl],
      },
    };
  } catch (error) {
    console.error('Error generando metadata para formulario:', error);
    return {
      title: 'Formulario | Master Club Manager',
    };
  }
}

export default function FormularioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}