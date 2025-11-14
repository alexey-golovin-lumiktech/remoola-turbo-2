export const STEP_NAME = {
  SIGNUP: `signup details`,
  PERSONAL: `personal details`,
  ORGANIZATION: `organization details`,
  ADDRESS: `address details`,
} as const;

export type IStepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

export interface StepMeta {
  label: IStepName;
  submitted: boolean;
  stepNumber: number;
}

export interface NormalizedStep {
  name: IStepName;
  label: IStepName;
  submitted: boolean;
  index: number;
}
