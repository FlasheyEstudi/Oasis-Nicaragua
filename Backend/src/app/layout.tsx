import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Oasis Nicaragua - Backend Console',
  description: 'Consola de control, documentación interactiva y pruebas de API en vivo para Oasis Nicaragua.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="antialiased min-h-screen bg-[#060A13] text-white">
        {children}
      </body>
    </html>
  );
}
