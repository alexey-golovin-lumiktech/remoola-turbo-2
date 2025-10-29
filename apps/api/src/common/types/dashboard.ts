import { type IContractListItem } from './contract';
import { type IDocumentListItem } from './document';

export type IDashboard = {
  balance: string;
  contractsActiveCount: number;
  lastPaymentAgo: string;
  openContracts: IContractListItem[];
  quickDocs: IDocumentListItem[];
  compliance: { w9Ready: boolean; kycInReview: boolean; bankVerified: boolean };
};
