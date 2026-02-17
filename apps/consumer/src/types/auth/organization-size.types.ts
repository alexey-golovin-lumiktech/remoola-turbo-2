import { OrganizationSizes } from '@remoola/api-types';

export const ORGANIZATION_SIZE_LABEL = {
  [OrganizationSizes.SMALL]: `1-10 team members`,
  [OrganizationSizes.MEDIUM]: `11-100 team members`,
  [OrganizationSizes.LARGE]: `100+ team members`,
} as const;

export type TOrganizationSizeLabel = (typeof ORGANIZATION_SIZE_LABEL)[keyof typeof ORGANIZATION_SIZE_LABEL];

export const SIZE_LABEL = {
  [OrganizationSizes.SMALL]: ORGANIZATION_SIZE_LABEL[OrganizationSizes.SMALL],
  [OrganizationSizes.MEDIUM]: ORGANIZATION_SIZE_LABEL[OrganizationSizes.MEDIUM],
  [OrganizationSizes.LARGE]: ORGANIZATION_SIZE_LABEL[OrganizationSizes.LARGE],
};

export const LABEL_SIZE = {
  [ORGANIZATION_SIZE_LABEL[OrganizationSizes.SMALL]]: OrganizationSizes.SMALL,
  [ORGANIZATION_SIZE_LABEL[OrganizationSizes.MEDIUM]]: OrganizationSizes.MEDIUM,
  [ORGANIZATION_SIZE_LABEL[OrganizationSizes.LARGE]]: OrganizationSizes.LARGE,
};
