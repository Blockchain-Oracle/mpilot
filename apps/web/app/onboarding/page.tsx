'use client';

import { useCallback, useEffect, useState } from 'react';
import { MinimalHeader } from './_components/MinimalHeader';
import { StepAccount } from './_components/StepAccount';
import { StepActivate } from './_components/StepActivate';
import { StepConnect } from './_components/StepConnect';
import { StepGoal } from './_components/StepGoal';
import { StepIdentity } from './_components/StepIdentity';
import { StepLlm } from './_components/StepLlm';
import { StepPolicy } from './_components/StepPolicy';
import { INITIAL_DATA, ONBOARDING_STEPS, type OnboardingData } from './_types';

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);

  const patch = useCallback(
    (input: Partial<OnboardingData> | ((prev: OnboardingData) => Partial<OnboardingData>)) => {
      setData((prev) => ({
        ...prev,
        ...(typeof input === 'function' ? input(prev) : input),
      }));
    },
    [],
  );

  const next = useCallback(() => setStep((s) => Math.min(s + 1, ONBOARDING_STEPS.length - 1)), []);
  const back = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  // Designer's prototype scrolls back to top on every step change. The lint
  // rule wants `step` listed; that's exactly what we want as the trigger.
  // biome-ignore lint/correctness/useExhaustiveDependencies: step IS the dep we want
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  return (
    <>
      <MinimalHeader stepIdx={step} />
      <main
        style={{
          minHeight: 'calc(100vh - var(--nav-h))',
          display: 'grid',
          placeItems: 'center',
          padding: '48px 24px 64px',
        }}
      >
        <div style={{ width: '100%' }}>
          {step === 0 && <StepConnect data={data} set={patch} onNext={next} />}
          {step === 1 && <StepAccount onBack={back} onNext={next} />}
          {step === 2 && <StepIdentity onBack={back} onNext={next} />}
          {step === 3 && <StepGoal data={data} set={patch} onBack={back} onNext={next} />}
          {step === 4 && <StepLlm data={data} set={patch} onBack={back} onNext={next} />}
          {step === 5 && <StepPolicy data={data} set={patch} onBack={back} onNext={next} />}
          {step === 6 && <StepActivate data={data} onBack={back} />}
        </div>
      </main>
    </>
  );
}
