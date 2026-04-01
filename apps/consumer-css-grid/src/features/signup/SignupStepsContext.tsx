'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type TAccountType, type TContractorKind } from '@remoola/api-types';

import { STEP_NAME, type StepName, type NormalizedStep } from './stepNames';
import { getSteps } from './utils/getSteps';
import { normalizeSteps } from './utils/normalizeSteps';

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
  contractorKind: TContractorKind | null;
}) {
  const stepsObj = useMemo(() => getSteps(accountType, contractorKind), [accountType, contractorKind]);
  const stepsArray = useMemo(() => normalizeSteps(stepsObj), [stepsObj]);
  const stepNames = useMemo(() => stepsArray.map((step) => step.name), [stepsArray]);
  const firstStep = stepNames[0] ?? STEP_NAME.SIGNUP_DETAILS;

  const [currentStep, setCurrentStep] = useState<StepName>(firstStep);
  const [submitted, setSubmitted] = useState<Partial<Record<StepName, boolean>>>({});

  useEffect(() => {
    if (!stepNames.includes(currentStep)) {
      setCurrentStep(firstStep);
      setSubmitted({});
    }
  }, [currentStep, firstStep, stepNames]);

  const currentIndex = stepNames.indexOf(currentStep);

  const goNext = useCallback(() => {
    setCurrentStep((previous) => {
      const index = stepNames.indexOf(previous);
      return index < stepNames.length - 1 ? stepNames[index + 1]! : previous;
    });
  }, [stepNames]);

  const goBack = useCallback(() => {
    setCurrentStep((previous) => {
      const index = stepNames.indexOf(previous);
      return index > 0 ? stepNames[index - 1]! : previous;
    });
  }, [stepNames]);

  const goTo = useCallback(
    (name: StepName) => {
      if (stepNames.includes(name)) {
        setCurrentStep(name);
      }
    },
    [stepNames],
  );

  const markSubmitted = useCallback((name: StepName) => {
    setSubmitted((previous) => ({ ...previous, [name]: true }));
  }, []);

  const mergedSteps: NormalizedStep[] = useMemo(
    () => stepsArray.map((step) => ({ ...step, submitted: submitted[step.name] ?? step.submitted })),
    [stepsArray, submitted],
  );

  const value = useMemo<SignupStepsContextValue>(
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
  const context = useContext(SignupStepsContext);
  if (!context) {
    throw new Error(`useSignupSteps must be used within SignupStepsProvider`);
  }
  return context;
}
