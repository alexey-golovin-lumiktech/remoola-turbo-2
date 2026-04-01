export const STEP_NAME = {
  SIGNUP_DETAILS: `signup_details`,
  INDIVIDUAL_DETAILS: `individual_details`,
  ENTITY_DETAILS: `entity_details`,
  ADDRESS_DETAILS: `address_details`,
  ORGANIZATION_DETAILS: `organization_details`,
} as const;

export type StepName = (typeof STEP_NAME)[keyof typeof STEP_NAME];

export interface StepMeta {
  label: string;
  submitted: boolean;
}

export interface NormalizedStep {
  name: StepName;
  label: string;
  submitted: boolean;
  index: number;
}
