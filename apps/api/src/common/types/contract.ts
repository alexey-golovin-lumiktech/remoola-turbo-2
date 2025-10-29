import { type IRateUnit } from './rate-unit';

export const ContractStatus = {
  DRAFT: `draft`,
  SIGNATURE: `signature`,
  ACTIVE: `active`,
  ARCHIVED: `archived`,
} as const;
export const ContractStatuses = Object.values(ContractStatus);
export type IContractStatus = (typeof ContractStatus)[keyof typeof ContractStatus];

export type ICreateContract = {
  clientId: string;
  contractorId: string;
  rateCents: number;
  rateUnit: IRateUnit;
  status?: IContractStatus;
};

export type IUpdateContract = Partial<Pick<ICreateContract, `rateCents` | `rateUnit` | `status`>>;

export type IContractListItem = {
  id: string;
  contractorName: string;
  rate: string;
  status: IContractStatus;
  lastActivityAgo: string;
};
