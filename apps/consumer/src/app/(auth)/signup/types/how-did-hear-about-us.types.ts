export const HOW_DID_HEAR_ABOUT_US = {
  EMPLOYER_COMPANY: `Employer / Company`,
  EMPLOYEE_CONTRACTOR: `Employee / Contractor`,
  REFERRED_RECOMMENDED: `Referred / Recommended`,
  EMAIL_INVITE: `Email invite`,
  GOOGLE: `Google`,
  FACEBOOK: `Facebook`,
  TWITTER: `Twitter`,
  LINKED_IN: `LinkedIn`,
  OTHER: `Other`,
} as const;
export type IHowDidHearAboutUs = (typeof HOW_DID_HEAR_ABOUT_US)[keyof typeof HOW_DID_HEAR_ABOUT_US];
