/**
 * Transactional email via Resend. Only the welcome template ships in r4;
 * stale-approval, daily-summary, emergency-stop ship in r6.
 *
 * If RESEND_API_KEY is missing we log the email body to the dev console
 * instead of sending. This keeps the dev path frictionless without
 * requiring a Resend signup just to test activation locally.
 */
import { Resend } from 'resend';

let cached: Resend | null = null;

function getClient(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

const FROM = process.env.RESEND_FROM ?? 'mPilot <onboarding@mpilot.xyz>';

export interface WelcomeEmailArgs {
  readonly to: string;
  readonly agentTokenId: string;
  readonly smartAccountAddress: string;
  readonly chainId: 5000 | 5003;
  readonly mantleScanBase: string;
}

export async function sendWelcomeEmail(args: WelcomeEmailArgs): Promise<void> {
  const subject = `Your mPilot agent #${args.agentTokenId} is live`;
  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  <h1 style="font-size:20px;margin:0 0 16px">Welcome to mPilot.</h1>
  <p>Your autonomous DeFi agent is now active.</p>
  <ul style="line-height:1.7">
    <li><strong>Agent ID:</strong> #${args.agentTokenId}</li>
    <li><strong>Smart account:</strong> <a href="${args.mantleScanBase}/address/${args.smartAccountAddress}">${args.smartAccountAddress}</a></li>
  </ul>
  <p>The agent will run its first tick within the next minute. Watch the live stream in <a href="https://mpilot.xyz/app">your dashboard</a>.</p>
  <p style="color:#888;font-size:12px;margin-top:32px">mPilot — autonomous DeFi agent on Mantle. ERC-8004 attested.</p>
</div>`;
  const client = getClient();
  if (!client) {
    // Dev fallback — log the email instead of sending.
    // biome-ignore lint/suspicious/noConsole: dev observability
    console.info('[apps/web/resend] (dev) would send welcome email', { to: args.to, subject });
    return;
  }
  await client.emails.send({ from: FROM, to: args.to, subject, html });
}
