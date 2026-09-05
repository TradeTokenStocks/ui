import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Geist_Mono, Instrument_Sans } from 'next/font/google';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

import './globals.css';

/**
 * The same three roles the native app uses. Loaded through `next/font` so they
 * are self-hosted and the balance figures do not reflow on first paint.
 */
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-bricolage',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-instrument',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const description =
  'One position per company, split into the part you can actually put to work onchain and the part your brokerage only lets you watch.';

export const metadata: Metadata = {
  metadataBase: new URL('https://tradetokenstocks.vercel.app'),
  title: {
    default: 'TradeTokenStocks — consolidated equity exposure',
    template: '%s · TradeTokenStocks',
  },
  description,
  applicationName: 'TradeTokenStocks',
  openGraph: {
    title: 'TradeTokenStocks — consolidated equity exposure',
    description,
    type: 'website',
    siteName: 'TradeTokenStocks',
  },
  twitter: { card: 'summary_large_image', title: 'TradeTokenStocks', description },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A0B0D',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      // `dark` is unconditional: the product has one theme, and the class is
      // here only so primitives' `dark:` branches resolve.
      className={cn('dark', bricolage.variable, instrument.variable, geistMono.variable)}
      suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
