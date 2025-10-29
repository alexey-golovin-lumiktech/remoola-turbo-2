/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Compliance } from './Compliance';
import type { ContractListItem } from './ContractListItem';
import type { DocumentListItem } from './DocumentListItem';
export type Dashboard = {
    balance: string;
    contractsActiveCount: number;
    lastPaymentAgo: string;
    openContracts: Array<ContractListItem>;
    quickDocs: Array<DocumentListItem>;
    compliance: Compliance;
};

