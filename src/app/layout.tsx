import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RLM Lite — Reasoning Observability',
  description: 'Claim-level instrumentation for multi-agent AI reasoning systems',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* WebMCP Origin Trial — rlm-lite.vercel.app, expires Nov 16 2026 */}
        <meta
          httpEquiv="origin-trial"
          content="AnCSqqP77Nd6YUkekQHA0QZZVuzwxVJgVS7eb2zhz32unUrTpYYUsm0IgheQphAF/qH1q1Z4w9ZkWswiH3iU5gwAAABTeyJvcmlnaW4iOiJodHRwczovL3JsbS1saXRlLnZlcmNlbC5hcHA6NDQzIiwiZmVhdHVyZSI6IldlYk1DUCIsImV4cGlyeSI6MTc5NDg3MzYwMH0="
        />
      </head>
      <body className="font-mono antialiased">{children}</body>
    </html>
  );
}
