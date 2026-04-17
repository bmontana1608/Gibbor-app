import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

export const metadata = {
  title: 'Gibbor App',
  description: 'Plataforma de Gestión Deportiva EFD Gibbor',
  manifest: '/manifest.json',
  themeColor: '#ea580c',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Gibbor App',
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
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 antialiased transition-colors duration-300">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
          <InstallPrompt />
        </ThemeProvider>
      </body>
    </html>
  );
}