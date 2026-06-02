import SWRegistration from "@/components/SWRegistration";
import Providers from "@/components/Providers";
import "./globals.css";
import { getTenant } from '@/lib/tenant';
import InstallPrompt from "@/components/InstallPrompt";

export const viewport = {
  themeColor: '#ea580c',
};

export async function generateMetadata() {
  const tenant = await getTenant();
  const tenantSlug = (tenant as any).slug;

  // Inyectar manifest en TODAS las páginas (director, futbolista, entrenador, login, etc.)
  // El [tenant]/layout.tsx solo cubre /login y /unete; el root layout cubre TODO lo demás
  const manifestUrl = tenantSlug && tenantSlug !== 'master'
    ? `/${tenantSlug}/manifest.json`
    : undefined;

  return {
    title: `${tenant.config.nombre} | MCM`,
    description: 'Master Club Manager - El corazón de tu formación deportiva',
    ...(manifestUrl ? { manifest: manifestUrl } : {}),
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getTenant();
  
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body 
        className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300"
        style={{
          '--brand-primary': tenant.config.color,
          '--brand-primary-rgb': hexToRgb(tenant.config.color),
          '--brand-secondary': (tenant.config as any).color_secundario || '#0284c7',
          '--brand-secondary-rgb': hexToRgb((tenant.config as any).color_secundario || '#0284c7')
        } as React.CSSProperties}
      >
        <Providers>
          {children}
          <InstallPrompt />
          <SWRegistration />
        </Providers>
      </body>
    </html>
  );
}

// Utilidad simple para convertir hex a RGB para opacidades en CSS
function hexToRgb(hex: string) {
  if (!hex) return '234, 88, 12';
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '234, 88, 12'; // Fallback a orange-600
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}