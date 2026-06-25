import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RLM Lite — Reasoning Observability',
  description:
    'Claim-level instrumentation for multi-agent AI reasoning systems',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
