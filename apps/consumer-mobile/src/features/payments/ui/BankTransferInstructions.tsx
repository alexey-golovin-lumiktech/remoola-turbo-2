'use client';

import { useState } from 'react';

import styles from './BankTransferInstructions.module.css';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
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
      showErrorToast(getLocalToastMessage(localToastKeys.CLIPBOARD_ERROR), { code: localToastKeys.CLIPBOARD_ERROR });
    }
  };

  return (
    <div className={styles.main}>
      <div className={styles.alert}>
        <div className={styles.alertRow}>
          <div className={styles.alertIcon}>
            <InformationCircleIcon className={styles.alertIconSvg} />
          </div>
          <div className={styles.alertContent}>
            <h3 className={styles.alertTitle}>Action needed</h3>
            <p className={styles.alertText}>
              Send money from your bank using the instructions below. Include the reference code to ensure proper
              processing.
            </p>
          </div>
        </div>
      </div>

      {amount != null ? (
        <div className={styles.amountCard}>
          <div className={styles.amountRow}>
            <div>
              <p className={styles.amountLabel}>Amount due</p>
              <p className={styles.amountValue}>
                {new Intl.NumberFormat(undefined, { style: `currency`, currency }).format(amount / 100)}
              </p>
            </div>
            <Button variant="outline" size="sm">
              <DownloadIcon className={styles.downloadBtnIcon} />
              Download PDF
            </Button>
          </div>
        </div>
      ) : null}

      <div className={styles.detailsCard}>
        <div className={styles.detailsHeader}>
          <h2 className={styles.detailsTitle}>Wire transfer details</h2>
        </div>

        <div className={styles.detailsBody}>
          {referenceCode ? (
            <BankField
              label="Reference code"
              value={referenceCode}
              copied={copiedField === `reference`}
              onCopy={() => copyToClipboard(referenceCode, `reference`)}
              highlight
              hint="Include this ID in your payment for faster processing"
            />
          ) : null}

          {bankName ? (
            <BankField
              label="Bank name"
              value={bankName}
              copied={copiedField === `bankName`}
              onCopy={() => copyToClipboard(bankName, `bankName`)}
            />
          ) : null}

          {accountHolder ? (
            <BankField
              label="Beneficiary"
              value={accountHolder}
              copied={copiedField === `accountHolder`}
              onCopy={() => copyToClipboard(accountHolder, `accountHolder`)}
            />
          ) : null}

          {accountNumber ? (
            <BankField
              label="Account number"
              value={accountNumber}
              copied={copiedField === `accountNumber`}
              onCopy={() => copyToClipboard(accountNumber, `accountNumber`)}
            />
          ) : null}

          {routingNumber ? (
            <BankField
              label="Routing number"
              value={routingNumber}
              copied={copiedField === `routingNumber`}
              onCopy={() => copyToClipboard(routingNumber, `routingNumber`)}
            />
          ) : null}

          {swiftCode ? (
            <BankField
              label="SWIFT code"
              value={swiftCode}
              copied={copiedField === `swiftCode`}
              onCopy={() => copyToClipboard(swiftCode, `swiftCode`)}
            />
          ) : null}

          {address ? (
            <BankField
              label="Bank address"
              value={address}
              copied={copiedField === `address`}
              onCopy={() => copyToClipboard(address, `address`)}
            />
          ) : null}
        </div>

        {swiftCode ? (
          <div className={styles.swiftNote}>
            <div className={styles.swiftNoteRow}>
              <div className={styles.swiftNoteIcon}>
                <BellIcon className={styles.swiftNoteIconSvg} />
              </div>
              <div className={styles.swiftNoteContent}>
                <p className={styles.swiftNoteTitle}>Important</p>
                <p className={styles.swiftNoteText}>
                  <strong>Select &quot;OUR&quot;</strong> for SWIFT transfer fees. This ensures the recipient receives
                  your full payment amount.
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <Button variant="primary" size="lg" className={styles.continueBtn}>
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
    <div className={`${styles.field} ${highlight ? styles.fieldHighlight : styles.fieldNormal}`}>
      <div className={styles.fieldRow}>
        <div className={styles.fieldContent}>
          <p className={`${styles.fieldLabel} ${highlight ? styles.fieldLabelHighlight : styles.fieldLabelNormal}`}>
            {label}
          </p>
          <p className={`${styles.fieldValue} ${highlight ? styles.fieldValueHighlight : styles.fieldValueNormal}`}>
            {value}
          </p>
          {hint ? <p className={styles.fieldHint}>{hint}</p> : null}
        </div>
        <button
          onClick={onCopy}
          className={`${styles.copyBtn} ${copied ? styles.copyBtnCopied : styles.copyBtnDefault}`}
          aria-label={`Copy ${label}`}
        >
          {copied ? (
            <CheckIcon className={styles.copyBtnIcon} />
          ) : (
            <ClipboardCopyIcon className={styles.copyBtnIcon} strokeWidth={2} />
          )}
        </button>
      </div>
    </div>
  );
}
