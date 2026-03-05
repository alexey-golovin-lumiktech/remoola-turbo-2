/** Step names for the signup stepper. Order per account type is defined in getSteps(). */
export const STEP_NAME = {
  SIGNUP_DETAILS: `signup details`,
  PERSONAL_DETAILS: `personal details`,
  ORGANIZATION_DETAILS: `organization details`,
  ADDRESS_DETAILS: `address details`,
} as const;

export type StepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

/** Display labels shown in the stepper UI (capitalized). */
export const STEP_DISPLAY_LABEL: Record<StepName, string> = {
  [STEP_NAME.SIGNUP_DETAILS]: `Signup`,
  [STEP_NAME.PERSONAL_DETAILS]: `Personal`,
  [STEP_NAME.ADDRESS_DETAILS]: `Address`,
  [STEP_NAME.ORGANIZATION_DETAILS]: `Organization`,
};

/** Alternate label when entity form is shown for personal-details step. */
export const STEP_ENTITY_LABEL: Partial<Record<StepName, string>> = {
  [STEP_NAME.PERSONAL_DETAILS]: `Entity`,
};

export interface StepMeta {
  label: StepName;
  submitted: boolean;
  stepNumber: number;
}

export interface NormalizedStep {
  name: StepName;
  label: string;
  submitted: boolean;
  index: number;
}
