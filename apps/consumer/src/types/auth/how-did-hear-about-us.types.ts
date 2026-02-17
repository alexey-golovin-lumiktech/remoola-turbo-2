import { HowDidHearAboutUsValues } from '@remoola/api-types';

export const HOW_DID_HEAR_ABOUT_US_LABEL = {
  [HowDidHearAboutUsValues.EMPLOYER_COMPANY]: `Employer / Company`,
  [HowDidHearAboutUsValues.EMPLOYEE_CONTRACTOR]: `Employee / Contractor`,
  [HowDidHearAboutUsValues.REFERRED_RECOMMENDED]: `Referred / Recommended`,
  [HowDidHearAboutUsValues.EMAIL_INVITE]: `Email invite`,
  [HowDidHearAboutUsValues.GOOGLE]: `Google`,
  [HowDidHearAboutUsValues.FACEBOOK]: `Facebook`,
  [HowDidHearAboutUsValues.TWITTER]: `Twitter`,
  [HowDidHearAboutUsValues.LINKED_IN]: `LinkedIn`,
  [HowDidHearAboutUsValues.OTHER]: `Other`,
} as const;
export type IHowDidHearAboutUsLabel = (typeof HOW_DID_HEAR_ABOUT_US_LABEL)[keyof typeof HOW_DID_HEAR_ABOUT_US_LABEL];

export const HOW_LABEL = {
  [HowDidHearAboutUsValues.EMPLOYER_COMPANY]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMPLOYER_COMPANY],
  [HowDidHearAboutUsValues.EMPLOYEE_CONTRACTOR]:
    HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMPLOYEE_CONTRACTOR],
  [HowDidHearAboutUsValues.REFERRED_RECOMMENDED]:
    HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.REFERRED_RECOMMENDED],
  [HowDidHearAboutUsValues.EMAIL_INVITE]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMAIL_INVITE],
  [HowDidHearAboutUsValues.GOOGLE]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.GOOGLE],
  [HowDidHearAboutUsValues.FACEBOOK]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.FACEBOOK],
  [HowDidHearAboutUsValues.TWITTER]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.TWITTER],
  [HowDidHearAboutUsValues.LINKED_IN]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.LINKED_IN],
  [HowDidHearAboutUsValues.OTHER]: HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.OTHER],
};

export const LABEL_HOW = {
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMPLOYER_COMPANY]]: HowDidHearAboutUsValues.EMPLOYER_COMPANY,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMPLOYEE_CONTRACTOR]]:
    HowDidHearAboutUsValues.EMPLOYEE_CONTRACTOR,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.REFERRED_RECOMMENDED]]:
    HowDidHearAboutUsValues.REFERRED_RECOMMENDED,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.EMAIL_INVITE]]: HowDidHearAboutUsValues.EMAIL_INVITE,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.GOOGLE]]: HowDidHearAboutUsValues.GOOGLE,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.FACEBOOK]]: HowDidHearAboutUsValues.FACEBOOK,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.TWITTER]]: HowDidHearAboutUsValues.TWITTER,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.LINKED_IN]]: HowDidHearAboutUsValues.LINKED_IN,
  [HOW_DID_HEAR_ABOUT_US_LABEL[HowDidHearAboutUsValues.OTHER]]: HowDidHearAboutUsValues.OTHER,
};
