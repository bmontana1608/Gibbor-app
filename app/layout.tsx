import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';
import { getTenant } from '@/lib/tenant';
import InstallPrompt from "@/components/InstallPrompt";

export const viewport = {
  themeColor: '#ea580c',
};

export async function generateMetadata() {
  const tenant = await getTenant();
  return {
    title: `${tenant.config.nombre} - Gibbor App`,
    description: 'Plataforma de Gestión Deportiva EFD Gibbor',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: `${tenant.config.nombre} - Gibbor App`,
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
      <head />
      <body 
        className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300"
        style={{
          '--brand-primary': tenant.config.color,
          '--brand-primary-rgb': hexToRgb(tenant.config.color)
        } as React.CSSProperties}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}

// Utilidad simple para convertir hex a RGB para opacidades en CSS
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '234, 88, 12'; // Fallback a orange-600
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}