import { LegalStatuses } from '@remoola/api-types';

export const LEGAL_STATUS_LABEL = {
  [LegalStatuses.INDIVIDUAL]: `Individual`,
  [LegalStatuses.INDIVIDUAL_ENTREPRENEUR]: `Individual Entrepreneur`,
  [LegalStatuses.SOLE_TRADER]: `Sole Trader`,
} as const;
export type ILegalStatusLabel = (typeof LEGAL_STATUS_LABEL)[keyof typeof LEGAL_STATUS_LABEL];

export const STATUS_LABEL = {
  [LegalStatuses.INDIVIDUAL]: LEGAL_STATUS_LABEL[LegalStatuses.INDIVIDUAL],
  [LegalStatuses.INDIVIDUAL_ENTREPRENEUR]: LEGAL_STATUS_LABEL[LegalStatuses.INDIVIDUAL_ENTREPRENEUR],
  [LegalStatuses.SOLE_TRADER]: LEGAL_STATUS_LABEL[LegalStatuses.SOLE_TRADER],
};

export const LABEL_STATUS = {
  [LEGAL_STATUS_LABEL[LegalStatuses.INDIVIDUAL]]: LegalStatuses.INDIVIDUAL,
  [LEGAL_STATUS_LABEL[LegalStatuses.INDIVIDUAL_ENTREPRENEUR]]: LegalStatuses.INDIVIDUAL_ENTREPRENEUR,
  [LEGAL_STATUS_LABEL[LegalStatuses.SOLE_TRADER]]: LegalStatuses.SOLE_TRADER,
};
