import type { Metadata } from 'next';
import './globals.css';
import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Mnada — online industrial auctions & direct sale in Kenya', template: '%s | Mnada' },
  description: 'Bid online on machinery, vehicles, container houses and steel structures from verified sellers in Kenya — or buy now from our own yard.',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Mnada', locale: 'en_KE' },
  twitter: { card: 'summary_large_image' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
        />
        <style>{`:root{--font-archivo:'Archivo';--font-inter:'Inter';}`}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
