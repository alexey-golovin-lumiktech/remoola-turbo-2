export const STEP_NAME = {
  SIGNUP_DETAILS: `signup details`,
  PERSONAL_DETAILS: `personal details`,
  ORGANIZATION_DETAILS: `organization details`,
  ADDRESS_DETAILS: `address details`,
} as const;

export type IStepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

export type IStepMeta = {
  label: IStepName;
  submitted: boolean;
  stepNumber: number;
};

export type INormalizedStep = {
  name: IStepName;
  label: IStepName;
  submitted: boolean;
  index: number;
};
