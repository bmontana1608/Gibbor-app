import { getTenant } from '@/lib/tenant';

export async function generateMetadata({ params }: any) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);

  return {
    title: `${tenant.config.nombre} | MCM`,
    // Apuntamos a la API Route explícita que sirve el manifest con el MIME-type correcto
    // y sin interferencia del middleware
    manifest: `/${slug}/manifest.json`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: tenant.config.nombre,
    },
    icons: {
      icon: tenant.config.logo || '/logo.png',
      apple: tenant.config.logo || '/logo.png',
    },
  };
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
