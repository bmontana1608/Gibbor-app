import "./globals.css";
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Gibbor App',
  description: 'Plataforma de Gestión Deportiva EFD Gibbor',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  }
};

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
      </body>
    </html>
  );
}