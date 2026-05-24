import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kolo Kept | The Digital Piggy Bank Vault',
  description: 'A digital piggy bank secured with the locks of an institutional vault. Multi-factor lockouts, rate limiting, and session hardening protect your growing savings.',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          {children}
        </div>
      </body>
    </html>
  );
}
