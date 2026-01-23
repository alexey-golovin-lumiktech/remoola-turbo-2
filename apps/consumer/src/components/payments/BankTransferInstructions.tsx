'use client';

import { Check, Clipboard, FileDown } from 'lucide-react';
import { useState } from 'react';

type BankDetails = {
  amount: number;
  currency: string;
  reference: string;
  beneficiary: string;
  accountNumber: string;
  swiftCode: string;
  routingNumber: string;
  address: string;
};

type BankTransferInstructionsProps = { details: BankDetails };

export function BankTransferInstructions({ details }: BankTransferInstructionsProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 800);
  };

  return (
    <div className="max-w-3xl mx-auto pb-16">
      {/* Stepper */}
      <div className="flex items-center gap-4 mb-10">
        <Step active label="Choose Payment Method" />
        <Step active label="Confirm Payment" />
      </div>

      {/* Action needed */}
      <div className="bg-amber-50 border border-amber-300 text-amber-800 p-4 rounded-xl mb-8">
        <h3 className="font-semibold mb-1">Action needed</h3>
        <p className="text-sm">
          Send money from your bank using the instructions below.
          <br />
          You can access these details again from your Payments screen.
        </p>
      </div>

      {/* Amount Due + PDF Button */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Amount due</h2>
          <div className="text-2xl font-bold">
            {isNaN(details.amount) ? `—` : `$${details.amount.toFixed(2)} ${details.currency}`}
          </div>
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-blue-600
        hover:bg-blue-700 text-white rounded-lg shadow-sm"
        >
          <FileDown size={18} />
          Download Invoice PDF
        </button>
      </div>

      {/* Wire transfer card */}
      <div className="border border-slate-200 bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-semibold mb-5 text-slate-800 dark:text-slate-200">Wire Transfer Details</h3>

        <Field
          label="Reference"
          value={details.reference}
          helper="Include this ID in your payment for faster processing."
          copied={copiedField === `reference`}
          onCopy={() => copy(`reference`, details.reference)}
        />

        <Field
          label="Currency"
          value={details.currency}
          copied={copiedField === `currency`}
          onCopy={() => copy(`currency`, details.currency)}
        />

        <Field
          label="Beneficiary"
          value={details.beneficiary}
          copied={copiedField === `beneficiary`}
          onCopy={() => copy(`beneficiary`, details.beneficiary)}
        />

        <Field
          label="Account Number"
          value={details.accountNumber}
          copied={copiedField === `accountNumber`}
          onCopy={() => copy(`accountNumber`, details.accountNumber)}
        />

        <Field
          label="Swift Code"
          value={details.swiftCode}
          copied={copiedField === `swiftCode`}
          onCopy={() => copy(`swiftCode`, details.swiftCode)}
        />

        <Field
          label="Routing Number"
          value={details.routingNumber}
          copied={copiedField === `routingNumber`}
          onCopy={() => copy(`routingNumber`, details.routingNumber)}
        />

        <Field
          label="Address"
          value={details.address}
          copied={copiedField === `address`}
          onCopy={() => copy(`address`, details.address)}
        />

        {/* SWIFT note */}
        <div className="mt-6 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl p-4 text-sm text-slate-700 dark:text-slate-300">
          <strong>Select “OUR”</strong> for SWIFT transfer fees. This ensures Remoola receives your full payment.
        </div>
      </div>

      {/* Continue button */}
      <button
        className="w-full mt-10 py-4 bg-green-600 hover:bg-green-700
      text-white font-semibold text-lg rounded-xl shadow"
      >
        Continue to Pay
      </button>
    </div>
  );
}

/* -------------------------
   Sub-components
-------------------------- */

function Step({ active, label }: { active?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={
          `w-5 h-5 rounded-full flex items-center justify-center ` +
          (active ? `bg-green-600 text-white` : `bg-slate-200`)
        }
      >
        <Check size={14} />
      </div>
      <span className={active ? `text-slate-900 dark:text-white font-medium` : `text-slate-400 dark:text-slate-500`}>{label}</span>
    </div>
  );
}

function Field({
  label,
  value,
  helper,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  helper?: string;
  copied?: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="mb-5">
      <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</div>

      <div className="flex items-center border border-slate-300 rounded-lg bg-slate-50 px-3 py-2">
        <div className="text-slate-900 font-medium truncate">{value}</div>

        <button className="ml-auto text-slate-500 hover:text-slate-700" onClick={onCopy}>
          {copied ? <Check size={18} className="text-green-600" /> : <Clipboard size={18} />}
        </button>
      </div>

      {helper && <div className="text-xs text-slate-500 mt-1">{helper}</div>}
    </div>
  );
}
