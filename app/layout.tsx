import SWRegistration from "@/components/SWRegistration";
import Providers from "@/components/Providers";
import "./globals.css";
import { getTenant } from '@/lib/tenant';
import InstallPrompt from "@/components/InstallPrompt";
import GlobalAnnouncementBanner from "@/components/GlobalAnnouncementBanner";

export const viewport = {
  themeColor: '#0a0a0a',
};

import { headers } from 'next/headers';

export async function generateMetadata() {
  const tenant = await getTenant();
  const tenantSlug = (tenant as any).slug;
  const isMaster = (tenant as any).isMaster || tenantSlug === 'master';
  
  const headersList = await headers();
  const referer = headersList.get('referer') || '';
  const currentPath = headersList.get('x-invoke-path') || '';
  const isEmbajador = referer.includes('/embajador') || currentPath.includes('/embajador');

  let manifestUrl = !isMaster ? `/${tenantSlug}/manifest.json` : '/manifest-admin.json';
  if (isEmbajador) manifestUrl = '/manifest-embajador.json';

  let titleStr = isMaster 
    ? 'Master Club Manager | El corazón de tu formación deportiva' 
    : `${tenant.config.nombre} | MCM`;
  if (isEmbajador) titleStr = 'Embajador MCM | Panel de Socios';

  let appIcon = isMaster ? '/admin-pwa-icon.png' : tenant.config.logo;
  if (isEmbajador) appIcon = '/embajador-pwa-icon.png';

  let appTitle = isMaster ? 'MCM SuperAdmin' : tenant.config.nombre;
  if (isEmbajador) appTitle = 'Embajador MCM';

  return {
    title: titleStr,
    description: isEmbajador ? 'Panel de Embajadores MCM' : 'Master Club Manager - El corazón de tu formación deportiva',
    ...(manifestUrl ? { manifest: manifestUrl } : {}),
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: appTitle,
    },
    icons: {
      icon: [
        { url: appIcon, type: 'image/png', sizes: '512x512' },
      ],
      apple: appIcon,
      shortcut: appIcon,
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
          <GlobalAnnouncementBanner />
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