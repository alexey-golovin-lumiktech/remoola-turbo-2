import { type NavIconName } from '../../components/nav-icon';

type NavTupleItem = {
  href: string;
  label: string;
  workspace: string;
  icon?: NavIconName;
  queueSignalKey?: string;
};

export const coreShellItems = [
  { href: `/overview`, label: `Overview`, workspace: `overview`, icon: `overview` },
  { href: `/consumers`, label: `Consumers`, workspace: `consumers`, icon: `consumers` },
  {
    href: `/verification`,
    label: `Verification`,
    workspace: `verification`,
    icon: `verification`,
    queueSignalKey: `pendingVerifications`,
  },
  {
    href: `/payments`,
    label: `Payments`,
    workspace: `payments`,
    icon: `payments`,
    queueSignalKey: `overduePaymentRequests`,
  },
  {
    href: `/ledger`,
    label: `Ledger and Disputes`,
    workspace: `ledger`,
    icon: `ledger`,
    queueSignalKey: `ledgerAnomalies`,
  },
  { href: `/audit`, label: `Audit`, workspace: `audit`, icon: `audit` },
] as const satisfies ReadonlyArray<NavTupleItem>;

export const topLevelBreadthItems = [
  { href: `/exchange`, label: `Exchange`, workspace: `exchange`, icon: `exchange` },
  { href: `/documents`, label: `Documents`, workspace: `documents`, icon: `documents` },
] as const satisfies ReadonlyArray<NavTupleItem>;

export const financeBreadthItems = [
  { href: `/payouts`, label: `Payouts`, workspace: `ledger`, icon: `payouts` },
  { href: `/payment-methods`, label: `Payment Methods`, workspace: `payment_methods`, icon: `payment-methods` },
] as const satisfies ReadonlyArray<NavTupleItem>;

export const maturityItems = [
  { href: `/system`, label: `System`, workspace: `system`, icon: `system` },
] as const satisfies ReadonlyArray<NavTupleItem>;

export const auditExplorerItems = [
  { href: `/audit/auth`, label: `Auth`, workspace: `audit`, icon: `audit` },
  { href: `/audit/admin-actions`, label: `Admin Actions`, workspace: `audit`, icon: `audit` },
  { href: `/audit/consumer-actions`, label: `Consumer Actions`, workspace: `audit`, icon: `audit` },
] as const satisfies ReadonlyArray<NavTupleItem>;

export const laterBreadthItems = [
  { href: `/admins`, label: `Admins`, workspace: `admins`, icon: `admins` },
] as const satisfies ReadonlyArray<NavTupleItem>;
