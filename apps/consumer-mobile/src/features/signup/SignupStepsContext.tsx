'use client';

import { type ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';

import { type TAccountType, type TContractorKind } from '@remoola/api-types';

import { getSteps } from './utils/getSteps';
import { normalizeSteps } from './utils/normalizeSteps';

import type { NormalizedStep, StepName } from './stepNames';

interface SignupStepsContextValue {
  steps: NormalizedStep[];
  currentStep: StepName;
  goNext: () => void;
  goBack: () => void;
  goTo: (name: StepName) => void;
  markSubmitted: (name: StepName) => void;
  isFirst: boolean;
  isLast: boolean;
}

const SignupStepsContext = createContext<SignupStepsContextValue | null>(null);

export function SignupStepsProvider({
  children,
  accountType,
  contractorKind,
}: {
  children: ReactNode;
  accountType: TAccountType;
  contractorKind: TContractorKind;
}) {
  const stepsObj = useMemo(() => getSteps(accountType, contractorKind), [accountType, contractorKind]);
  const stepsArray = useMemo(() => normalizeSteps(stepsObj), [stepsObj]);
  const stepNames = useMemo(() => stepsArray.map((s) => s.name), [stepsArray]);
  const firstStep = stepNames[0] ?? `signup details`;

  const [currentStep, setCurrentStep] = useState<StepName>(firstStep);
  const [submitted, setSubmitted] = useState<Partial<Record<StepName, boolean>>>({});

  const currentIndex = stepNames.indexOf(currentStep);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => {
      const idx = stepNames.indexOf(prev);
      return idx < stepNames.length - 1 ? stepNames[idx + 1]! : prev;
    });
  }, [stepNames]);

  const goBack = useCallback(() => {
    setCurrentStep((prev) => {
      const idx = stepNames.indexOf(prev);
      return idx > 0 ? stepNames[idx - 1]! : prev;
    });
  }, [stepNames]);

  const goTo = useCallback(
    (name: StepName) => {
      if (stepNames.includes(name)) setCurrentStep(name);
    },
    [stepNames],
  );

  const markSubmitted = useCallback((name: StepName) => {
    setSubmitted((prev) => ({ ...prev, [name]: true }));
  }, []);

  const mergedSteps: NormalizedStep[] = useMemo(
    () => stepsArray.map((s) => ({ ...s, submitted: submitted[s.name] ?? s.submitted })),
    [stepsArray, submitted],
  );

  const value: SignupStepsContextValue = useMemo(
    () => ({
      steps: mergedSteps,
      currentStep,
      goNext,
      goBack,
      goTo,
      markSubmitted,
      isFirst: currentIndex === 0,
      isLast: currentIndex === stepNames.length - 1,
    }),
    [mergedSteps, currentStep, goNext, goBack, goTo, markSubmitted, currentIndex, stepNames.length],
  );

  return <SignupStepsContext.Provider value={value}>{children}</SignupStepsContext.Provider>;
}

export function useSignupSteps(): SignupStepsContextValue {
  const ctx = useContext(SignupStepsContext);
  if (!ctx) throw new Error(`useSignupSteps must be used within SignupStepsProvider`);
  return ctx;
}
