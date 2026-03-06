'use client';

import { useState } from 'react';

import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { BellIcon } from '../../../shared/ui/icons/BellIcon';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ClipboardCopyIcon } from '../../../shared/ui/icons/ClipboardCopyIcon';
import { DownloadIcon } from '../../../shared/ui/icons/DownloadIcon';
import { InformationCircleIcon } from '../../../shared/ui/icons/InformationCircleIcon';

interface BankTransferInstructionsProps {
  accountNumber?: string;
  routingNumber?: string;
  accountHolder?: string;
  bankName?: string;
  referenceCode?: string;
  swiftCode?: string;
  amount?: number;
  currency?: string;
  address?: string;
}

export function BankTransferInstructions({
  accountNumber,
  routingNumber,
  accountHolder,
  bankName,
  referenceCode,
  swiftCode,
  amount,
  currency = `USD`,
  address,
}: BankTransferInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      showErrorToast(`Failed to copy. Please copy manually.`, { code: `CLIPBOARD_ERROR` });
    }
  };

  return (
    <div className={`space-y-6`}>
      <div
        className={`
        overflow-hidden
        rounded-xl
        border
        border-blue-200
        bg-blue-50
        dark:border-blue-900
        dark:bg-blue-900/20
      `}
      >
        <div
          className={`
          flex
          items-start
          gap-3
          p-4
        `}
        >
          <div
            className={`
            mt-0.5
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-full
            bg-blue-600
            text-white
            dark:bg-blue-500
          `}
          >
            <InformationCircleIcon className={`h-5 w-5`} />
          </div>
          <div className={`flex-1`}>
            <h3
              className={`
              text-sm
              font-semibold
              text-blue-900
              dark:text-blue-100
            `}
            >
              Action needed
            </h3>
            <p
              className={`
              mt-1
              text-xs
              text-blue-800
              dark:text-blue-200
            `}
            >
              Send money from your bank using the instructions below. Include the reference code to ensure proper
              processing.
            </p>
          </div>
        </div>
      </div>

      {amount != null && (
        <div
          className={`
          rounded-xl
          border
          border-slate-200
          bg-white
          p-6
          shadow-sm
          dark:border-slate-700
          dark:bg-slate-800
        `}
        >
          <div className={`flex items-center justify-between`}>
            <div>
              <p
                className={`
                text-sm
                font-medium
                text-slate-600
                dark:text-slate-400
              `}
              >
                Amount due
              </p>
              <p
                className={`
                mt-1
                text-3xl
                font-bold
                text-slate-900
                dark:text-white
              `}
              >
                {new Intl.NumberFormat(undefined, { style: `currency`, currency }).format(amount / 100)}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <DownloadIcon className={`mr-2 h-4 w-4`} />
              Download PDF
            </Button>
          </div>
        </div>
      )}

      <div
        className={`
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
        dark:border-slate-700
        dark:bg-slate-800
      `}
      >
        <div
          className={`
          border-b
          border-slate-200
          p-6
          dark:border-slate-700
        `}
        >
          <h2
            className={`
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          `}
          >
            Wire transfer details
          </h2>
        </div>

        <div className={`space-y-1 p-6`}>
          {referenceCode && (
            <BankField
              label="Reference code"
              value={referenceCode}
              copied={copiedField === `reference`}
              onCopy={() => copyToClipboard(referenceCode, `reference`)}
              highlight
              hint="Include this ID in your payment for faster processing"
            />
          )}

          {bankName && (
            <BankField
              label="Bank name"
              value={bankName}
              copied={copiedField === `bankName`}
              onCopy={() => copyToClipboard(bankName, `bankName`)}
            />
          )}

          {accountHolder && (
            <BankField
              label="Beneficiary"
              value={accountHolder}
              copied={copiedField === `accountHolder`}
              onCopy={() => copyToClipboard(accountHolder, `accountHolder`)}
            />
          )}

          {accountNumber && (
            <BankField
              label="Account number"
              value={accountNumber}
              copied={copiedField === `accountNumber`}
              onCopy={() => copyToClipboard(accountNumber, `accountNumber`)}
            />
          )}

          {routingNumber && (
            <BankField
              label="Routing number"
              value={routingNumber}
              copied={copiedField === `routingNumber`}
              onCopy={() => copyToClipboard(routingNumber, `routingNumber`)}
            />
          )}

          {swiftCode && (
            <BankField
              label="SWIFT code"
              value={swiftCode}
              copied={copiedField === `swiftCode`}
              onCopy={() => copyToClipboard(swiftCode, `swiftCode`)}
            />
          )}

          {address && (
            <BankField
              label="Bank address"
              value={address}
              copied={copiedField === `address`}
              onCopy={() => copyToClipboard(address, `address`)}
            />
          )}
        </div>

        {swiftCode && (
          <div
            className={`
            border-t
            border-slate-200
            bg-amber-50
            p-4
            dark:border-slate-700
            dark:bg-amber-900/20
          `}
          >
            <div className={`flex gap-3`}>
              <div
                className={`
                flex
                h-6
                w-6
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-amber-600
                text-white
                dark:bg-amber-500
              `}
              >
                <BellIcon className={`h-4 w-4`} />
              </div>
              <div className={`flex-1`}>
                <p
                  className={`
                  text-sm
                  font-semibold
                  text-amber-900
                  dark:text-amber-100
                `}
                >
                  Important
                </p>
                <p
                  className={`
                  mt-0.5
                  text-xs
                  text-amber-800
                  dark:text-amber-200
                `}
                >
                  <strong>Select &quot;OUR&quot;</strong> for SWIFT transfer fees. This ensures the recipient receives
                  your full payment amount.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Button variant="primary" size="lg" className={`w-full`}>
        Continue to payment
      </Button>
    </div>
  );
}

interface BankFieldProps {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  highlight?: boolean;
  hint?: string;
}

function BankField({ label, value, copied, onCopy, highlight = false, hint }: BankFieldProps) {
  return (
    <div
      className={`rounded-lg p-4 transition-colors ${
        highlight
          ? `bg-amber-50 dark:bg-amber-900/20`
          : `bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700`
      }`}
    >
      <div
        className={`
        flex
        items-start
        justify-between
        gap-3
      `}
      >
        <div className={`min-w-0 flex-1`}>
          <p
            className={`text-xs font-medium uppercase tracking-wide ${highlight ? `text-amber-700 dark:text-amber-400` : `text-slate-500 dark:text-slate-400`}`}
          >
            {label}
          </p>
          <p
            className={`mt-1 break-all font-mono text-sm font-semibold ${highlight ? `text-amber-900 dark:text-amber-100` : `text-slate-900 dark:text-white`}`}
          >
            {value}
          </p>
          {hint && (
            <p
              className={`
            mt-1
            text-xs
            text-slate-600
            dark:text-slate-400
          `}
            >
              {hint}
            </p>
          )}
        </div>
        <button
          onClick={onCopy}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all ${
            copied
              ? `bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300`
              : `text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-600`
          }`}
          aria-label={`Copy ${label}`}
        >
          {copied ? <CheckIcon className={`h-5 w-5`} /> : <ClipboardCopyIcon className={`h-5 w-5`} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}
