export const CONSUMER_ROLE = {
  FOUNDER: `Founder`,
  FINANCE: `Finance`,
  MARKETING: `Marketing`,
  CUSTOMER_SUPPORT: `Customer support`,
  SALES: `Sales`,
  LEGAL: `Legal`,
  HUMAN_RESOURCE: `Human resource`,
  OPERATIONS: `Operations`,
  COMPLIANCE: `Compliance`,
  PRODUCT: `Product`,
  ENGINEERING: `Engineering`,
  ANALYSIS_DATA: `Analysis/Data`,
  OTHER: `Other`,
} as const;
export type IConsumerRole = (typeof CONSUMER_ROLE)[keyof typeof CONSUMER_ROLE];
