'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { type IAccountType, type IContractorKind } from '../types/account.types';
import { type IStepName, type NormalizedStep, STEP_NAME } from '../types/step.types';
import { getSteps } from '../utils/getSteps';
import { normalizeSteps } from '../utils/normalizeSteps';

interface SignupStepsState {
  steps: NormalizedStep[];
  currentStep: IStepName;

  goNext: () => void;
  goBack: () => void;
  goTo: (name: IStepName) => void;

  markSubmitted: (name: IStepName) => void;

  isFirst: boolean;
  isLast: boolean;
}

const SignupStepsContext = createContext<SignupStepsState | null>(null);

export const useSignupSteps = (): SignupStepsState => {
  const ctx = useContext(SignupStepsContext);
  if (!ctx) throw new Error(`SignupStepsContext missing`);
  return ctx;
};

export function SignupStepsProvider({
  children,
  accountType,
  contractorKind,
}: {
  children: ReactNode;
  accountType: IAccountType;
  contractorKind: IContractorKind;
}) {
  const stepsObj = useMemo(() => getSteps(accountType, contractorKind), [accountType, contractorKind]);

  const stepsArray = useMemo(() => normalizeSteps(stepsObj), [stepsObj]);

  const [currentStep, setCurrentStep] = useState<IStepName>(STEP_NAME.SIGNUP);
  const [submitted, setSubmitted] = useState<Partial<Record<IStepName, boolean>>>({});

  const stepNames = stepsArray.map((s) => s.name);
  const currentIndex = stepNames.indexOf(currentStep);

  const goNext = () => {
    if (currentIndex < stepNames.length - 1) {
      setCurrentStep(stepNames[currentIndex + 1]!);
    }
  };

  const goBack = () => {
    if (currentIndex > 0) {
      setCurrentStep(stepNames[currentIndex - 1]!);
    }
  };

  const goTo = (name: IStepName) => {
    if (stepNames.includes(name)) setCurrentStep(name);
  };

  const markSubmitted = (name: IStepName) => {
    setSubmitted((prev) => ({ ...prev, [name]: true }));
  };

  const mergedSteps: NormalizedStep[] = stepsArray.map((s) => ({
    ...s,
    submitted: submitted[s.name] || s.submitted,
  }));

  const value: SignupStepsState = {
    steps: mergedSteps,
    currentStep,
    goNext,
    goBack,
    goTo,
    markSubmitted,
    isFirst: currentIndex === 0,
    isLast: currentIndex === stepNames.length - 1,
  };

  return <SignupStepsContext.Provider value={value}>{children}</SignupStepsContext.Provider>;
}
