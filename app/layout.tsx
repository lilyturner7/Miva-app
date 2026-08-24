import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miva',
  description: 'Assistente personale per trasformare il piano nutrizionale in scelte quotidiane semplici.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
