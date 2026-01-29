'use client';

import { Check, Clipboard, FileDown } from 'lucide-react';
import { useState } from 'react';

import styles from '../ui/classNames.module.css';

const {
  bankTransferAlert,
  bankTransferAlertText,
  bankTransferAlertTitle,
  bankTransferAmountLabel,
  bankTransferAmountRow,
  bankTransferAmountValue,
  bankTransferCard,
  bankTransferCardTitle,
  bankTransferContainer,
  bankTransferContinueButton,
  bankTransferDownloadButton,
  bankTransferStepper,
  bankTransferSwiftNote,
  fieldCopyButton,
  fieldCopyIconActive,
  fieldHelper,
  fieldLabel,
  fieldRow,
  fieldValue,
  fieldWrapper,
  stepContainer,
  stepIconActive,
  stepIconBase,
  stepIconInactive,
  stepLabelActive,
  stepLabelInactive,
} = styles;

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
    <div className={bankTransferContainer}>
      {/* Stepper */}
      <div className={bankTransferStepper}>
        <Step active label="Choose Payment Method" />
        <Step active label="Confirm Payment" />
      </div>

      {/* Action needed */}
      <div className={bankTransferAlert}>
        <h3 className={bankTransferAlertTitle}>Action needed</h3>
        <p className={bankTransferAlertText}>
          Send money from your bank using the instructions below.
          <br />
          You can access these details again from your Payments screen.
        </p>
      </div>

      {/* Amount Due + PDF Button */}
      <div className={bankTransferAmountRow}>
        <div>
          <h2 className={bankTransferAmountLabel}>Amount due</h2>
          <div className={bankTransferAmountValue}>
            {isNaN(details.amount) ? `—` : `$${details.amount.toFixed(2)} ${details.currency}`}
          </div>
        </div>

        <button className={bankTransferDownloadButton}>
          <FileDown size={18} />
          Download Invoice PDF
        </button>
      </div>

      {/* Wire transfer card */}
      <div className={bankTransferCard}>
        <h3 className={bankTransferCardTitle}>Wire Transfer Details</h3>

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
        <div className={bankTransferSwiftNote}>
          <strong>Select “OUR”</strong> for SWIFT transfer fees. This ensures Remoola receives your full payment.
        </div>
      </div>

      {/* Continue button */}
      <button className={bankTransferContinueButton}>Continue to Pay</button>
    </div>
  );
}

/* -------------------------
   Sub-components
-------------------------- */

function Step({ active, label }: { active?: boolean; label: string }) {
  return (
    <div className={stepContainer}>
      <div className={`${stepIconBase} ` + (active ? stepIconActive : stepIconInactive)}>
        <Check size={14} />
      </div>
      <span className={active ? stepLabelActive : stepLabelInactive}>{label}</span>
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
    <div className={fieldWrapper}>
      <div className={fieldLabel}>{label}</div>

      <div className={fieldRow}>
        <div className={fieldValue}>{value}</div>

        <button className={fieldCopyButton} onClick={onCopy}>
          {copied ? <Check size={18} className={fieldCopyIconActive} /> : <Clipboard size={18} />}
        </button>
      </div>

      {helper && <div className={fieldHelper}>{helper}</div>}
    </div>
  );
}
