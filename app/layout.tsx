import "./globals.css";
import { Toaster } from 'sonner';

export const metadata = {
  title: 'GIBBOR PRO',
  description: 'Portal de Alto Rendimiento - EFD Gibbor',
  manifest: '/manifest.json',
  themeColor: '#ea580c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'GIBBOR PRO',
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
};

import InstallPrompt from "@/components/InstallPrompt";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}
        <Toaster richColors position="top-right" />
        <InstallPrompt />
      </body>
    </html>
  );
}