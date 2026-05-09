import { Metadata } from 'next';
import { getTenant } from '@/lib/tenant';
import { supabase } from '@/lib/supabase';
import RegistroForm from './RegistroForm';
import { AlertCircle } from 'lucide-react';

interface Props {
  params: { tenant: string };
}

export async function generateMetadata({ params }: any): Promise<Metadata> {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  const clubName = tenant?.config?.nombre || 'Club';
  const clubLogo = tenant?.config?.logo || '';

  return {
    title: `Únete a ${clubName} | Registro Oficial`,
    description: `Inicia tu proceso de inscripción en ${clubName}. Completa el formulario oficial para unirte a nuestra academia.`,
    openGraph: {
      title: `Únete a ${clubName}`,
      description: `Formulario de inscripción oficial de ${clubName}.`,
      images: clubLogo ? [clubLogo] : [],
    },
    whatsapp: {
        title: `Únete a ${clubName}`,
        description: `Formulario de inscripción oficial de ${clubName}.`,
        status: `Inscripciones abiertas para ${clubName}`
    }
  } as any;
}

export default async function UnetePage({ params }: any) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);

  if (!tenant || tenant.slug === 'master') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-2xl font-black text-slate-800 mb-2">Club no encontrado</h1>
        <p className="text-slate-500">El enlace de invitación no es válido o el club no existe.</p>
      </div>
    );
  }

  // Cargar categorías iniciales desde el servidor
  const { data: categorias } = await supabase
    .from('categorias')
    .select('*')
    .eq('club_id', (tenant as any).id)
    .eq('estado', 'Activo');

  const clubData = {
    id: (tenant as any).id,
    nombre: tenant.config.nombre,
    logo_url: tenant.config.logo,
    color_primario: tenant.config.color,
    slug: tenant.slug
  };

  return <RegistroForm club={clubData} categoriasIniciales={categorias || []} />;
}
