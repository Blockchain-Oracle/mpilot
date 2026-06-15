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

/**
 * No-FOUC theme bootstrap. Runs synchronously before paint so the user never
 * sees a light-theme flash on first load when they prefer dark. Reads
 * localStorage, falls back to `prefers-color-scheme`. Wraps in try/catch for
 * private-browsing modes that throw on storage access.
 */
const NO_FOUC_SCRIPT = `
(function(){try{
var t=localStorage.getItem('concierge.theme');
if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
document.documentElement.dataset.theme=t;
}catch(e){}})();
`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/** biome-ignore lint/security/noDangerouslySetInnerHtml: inline no-FOUC bootstrap, source is a static literal */}
        <script dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>
          <PrivyProviders>{children}</PrivyProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
