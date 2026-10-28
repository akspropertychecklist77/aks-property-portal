import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AKS Property Checklist | Legal Portal & Client Tracking',
  description: 'Confidential Advocate & Operations Portal for Legal Due Diligence, Land Title Verification, and Client Case Progress.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}

