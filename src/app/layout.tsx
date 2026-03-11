import type { Metadata, Viewport } from 'next';
import { Lato } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { SessionProvider } from '@/components/providers/session-provider';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';

const lato = Lato({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['100', '300', '400', '700', '900'],
});

export const viewport: Viewport = {
  themeColor: '#0f172a',
};

export const metadata: Metadata = {
  title: 'Alina Visitor Parking',
  description: 'Visitor parking pass management system for Alina Hospital',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Alina Parking',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={lato.variable} suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            {children}
            <Toaster />
            <ServiceWorkerRegister />
            <Analytics />
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
