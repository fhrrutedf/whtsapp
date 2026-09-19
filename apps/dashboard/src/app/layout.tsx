import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OmniDesk AI | منصة المحادثات والذكاء الاصطناعي العالمية',
  description: 'منصة خدمة العملاء والدعم الذكي عبر واتساب والقنوات المتعددة المتوافقة مع معايير Meta العالمية',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className="dark scroll-smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="bg-[#060911] text-slate-100 min-h-screen antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        {children}
      </body>
    </html>
  );
}
