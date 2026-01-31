import type { Metadata } from 'next';
import { Lato } from 'next/font/google';
import './globals.css';

const lato = Lato({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['100', '300', '400', '700', '900'],
});

export const metadata: Metadata = {
  title: 'Alina Visitor Parking',
  description: 'Visitor parking pass management system for Alina Hospital',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={lato.variable} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
