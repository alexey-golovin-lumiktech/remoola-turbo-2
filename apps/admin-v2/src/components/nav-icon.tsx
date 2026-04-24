import { type ReactElement } from 'react';

export type NavIconName =
  | `overview`
  | `consumers`
  | `verification`
  | `payments`
  | `ledger`
  | `audit`
  | `exchange`
  | `documents`
  | `payouts`
  | `payment-methods`
  | `system`
  | `admins`
  | `search`
  | `eye`
  | `flag`
  | `plus`;

const COMMON_PROPS = {
  width: 18,
  height: 18,
  viewBox: `0 0 24 24`,
  fill: `none`,
  stroke: `currentColor`,
  strokeWidth: 1.75,
  strokeLinecap: `round`,
  strokeLinejoin: `round`,
  'aria-hidden': `true`,
  focusable: `false`,
} as const;

export function NavIcon({ name }: { name: NavIconName }): ReactElement {
  switch (name) {
    case `overview`:
      return (
        <svg {...COMMON_PROPS}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case `consumers`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case `verification`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case `payments`:
      return (
        <svg {...COMMON_PROPS}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h4" />
        </svg>
      );
    case `ledger`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
          <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
        </svg>
      );
    case `audit`:
      return (
        <svg {...COMMON_PROPS}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
          <path d="M8 11h6" />
          <path d="M11 8v6" />
        </svg>
      );
    case `exchange`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M7 7h13" />
          <path d="m16 3 4 4-4 4" />
          <path d="M17 17H4" />
          <path d="m8 21-4-4 4-4" />
        </svg>
      );
    case `documents`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </svg>
      );
    case `payouts`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    case `payment-methods`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M20 12V8a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
          <path d="M22 12h-5a2 2 0 0 0 0 4h5z" />
        </svg>
      );
    case `system`:
      return (
        <svg {...COMMON_PROPS}>
          <rect x="2" y="3" width="20" height="8" rx="2" />
          <rect x="2" y="13" width="20" height="8" rx="2" />
          <path d="M6 7h.01" />
          <path d="M6 17h.01" />
        </svg>
      );
    case `admins`:
      return (
        <svg {...COMMON_PROPS}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
          <path d="m18 5 1 1.5 1.5-.5-1 1.5 1 1.5-1.5-.5-1 1.5-1-1.5-1.5.5 1-1.5-1-1.5 1.5.5z" />
        </svg>
      );
    case `search`:
      return (
        <svg {...COMMON_PROPS}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      );
    case `eye`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case `flag`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M4 21V4" />
          <path d="M4 4h12l-2 4 2 4H4" />
        </svg>
      );
    case `plus`:
      return (
        <svg {...COMMON_PROPS}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    default:
      return (
        <svg {...COMMON_PROPS}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
