import { ConsumerRoles } from '@remoola/api-types';

export const CONSUMER_ROLE_LABEL = {
  [ConsumerRoles.FOUNDER]: `Founder`,
  [ConsumerRoles.FINANCE]: `Finance`,
  [ConsumerRoles.MARKETING]: `Marketing`,
  [ConsumerRoles.CUSTOMER_SUPPORT]: `Customer support`,
  [ConsumerRoles.SALES]: `Sales`,
  [ConsumerRoles.LEGAL]: `Legal`,
  [ConsumerRoles.HUMAN_RESOURCE]: `Human resource`,
  [ConsumerRoles.OPERATIONS]: `Operations`,
  [ConsumerRoles.COMPLIANCE]: `Compliance`,
  [ConsumerRoles.PRODUCT]: `Product`,
  [ConsumerRoles.ENGINEERING]: `Engineering`,
  [ConsumerRoles.ANALYSIS_DATA]: `Analysis/Data`,
  [ConsumerRoles.OTHER]: `Other`,
} as const;
export type IConsumerRoleLabel = (typeof CONSUMER_ROLE_LABEL)[keyof typeof CONSUMER_ROLE_LABEL];

export const ROLE_LABEL = {
  [ConsumerRoles.FOUNDER]: CONSUMER_ROLE_LABEL[ConsumerRoles.FOUNDER],
  [ConsumerRoles.FINANCE]: CONSUMER_ROLE_LABEL[ConsumerRoles.FINANCE],
  [ConsumerRoles.MARKETING]: CONSUMER_ROLE_LABEL[ConsumerRoles.MARKETING],
  [ConsumerRoles.CUSTOMER_SUPPORT]: CONSUMER_ROLE_LABEL[ConsumerRoles.CUSTOMER_SUPPORT],
  [ConsumerRoles.SALES]: CONSUMER_ROLE_LABEL[ConsumerRoles.SALES],
  [ConsumerRoles.LEGAL]: CONSUMER_ROLE_LABEL[ConsumerRoles.LEGAL],
  [ConsumerRoles.HUMAN_RESOURCE]: CONSUMER_ROLE_LABEL[ConsumerRoles.HUMAN_RESOURCE],
  [ConsumerRoles.OPERATIONS]: CONSUMER_ROLE_LABEL[ConsumerRoles.OPERATIONS],
  [ConsumerRoles.COMPLIANCE]: CONSUMER_ROLE_LABEL[ConsumerRoles.COMPLIANCE],
  [ConsumerRoles.PRODUCT]: CONSUMER_ROLE_LABEL[ConsumerRoles.PRODUCT],
  [ConsumerRoles.ENGINEERING]: CONSUMER_ROLE_LABEL[ConsumerRoles.ENGINEERING],
  [ConsumerRoles.ANALYSIS_DATA]: CONSUMER_ROLE_LABEL[ConsumerRoles.ANALYSIS_DATA],
  [ConsumerRoles.OTHER]: CONSUMER_ROLE_LABEL[ConsumerRoles.OTHER],
};

export const LABEL_ROLE = {
  [CONSUMER_ROLE_LABEL[ConsumerRoles.FOUNDER]]: ConsumerRoles.FOUNDER,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.FINANCE]]: ConsumerRoles.FINANCE,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.MARKETING]]: ConsumerRoles.MARKETING,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.CUSTOMER_SUPPORT]]: ConsumerRoles.CUSTOMER_SUPPORT,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.SALES]]: ConsumerRoles.SALES,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.LEGAL]]: ConsumerRoles.LEGAL,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.HUMAN_RESOURCE]]: ConsumerRoles.HUMAN_RESOURCE,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.OPERATIONS]]: ConsumerRoles.OPERATIONS,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.COMPLIANCE]]: ConsumerRoles.COMPLIANCE,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.PRODUCT]]: ConsumerRoles.PRODUCT,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.ENGINEERING]]: ConsumerRoles.ENGINEERING,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.ANALYSIS_DATA]]: ConsumerRoles.ANALYSIS_DATA,
  [CONSUMER_ROLE_LABEL[ConsumerRoles.OTHER]]: ConsumerRoles.OTHER,
};
