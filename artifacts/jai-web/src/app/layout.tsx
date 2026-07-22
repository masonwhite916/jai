import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'JAI Roadside Assistance — مساعدة على الطريق',
  description:
    'خدمة إنقاذ على الطريق على مدار الساعة في المملكة العربية السعودية. مساعدة احترافية لمشاكل الإطارات والبطارية والسحب وأكثر. Premium 24/7 roadside assistance across Saudi Arabia.',
  openGraph: {
    title: 'JAI Roadside Assistance',
    description: 'Premium roadside assistance in Saudi Arabia — available 24/7.',
    siteName: 'JAI',
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JAI Roadside Assistance',
    description: 'Premium roadside assistance in Saudi Arabia — available 24/7.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Cairo:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
