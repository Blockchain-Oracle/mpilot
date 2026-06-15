/**
 * Landing page (`/`). Composes the four sections shipped in this v1 cut:
 * Nav → Hero → HowItWorks → DeveloperCTA → Footer.
 *
 * Deferred to follow-up PRs:
 * - Live tick demo wired to `@mpilot/react` SSE hook (story-115).
 * - Comparison / TrustSignals sections from the designer's prototype.
 * - i18n.
 */
import { DeveloperCTA } from './_components/DeveloperCTA';
import { Footer } from './_components/Footer';
import { Hero } from './_components/Hero';
import { HowItWorks } from './_components/HowItWorks';
import { Nav } from './_components/Nav';

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <DeveloperCTA />
      </main>
      <Footer />
    </>
  );
}
