import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PrivyProviders } from './_lib/PrivyProviders';
import { ThemeProvider } from './_lib/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Concierge — Autonomous DeFi agent on Mantle',
  description:
    'You set a plain-English goal. Concierge plans, simulates, proposes, and executes across 7 Mantle protocols every tick — fully attested on-chain via ERC-8004.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <PrivyProviders>{children}</PrivyProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
