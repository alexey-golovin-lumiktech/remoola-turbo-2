'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { cn } from '@remoola/ui';

import styles from './PaymentDetailView.module.css';
import { SendPaymentRequestButton } from './SendPaymentRequestButton';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showSuccessToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { Card, CardHeader, CardContent } from '../../../shared/ui/Card';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';
import { StatusBadge } from '../../../shared/ui/StatusBadge';

interface PaymentDetailViewProps {
  paymentRequestId: string;
  data: unknown;
}

interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  billingDetails?: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
}

interface LedgerEntry {
  id: string;
  status: string;
  type: string;
  createdAt: string;
}

interface Attachment {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
}

function getField(data: unknown, key: string): unknown {
  if (data == null || typeof data !== `object`) return undefined;
  if (!(key in data)) return undefined;
  return (data as Record<string, unknown>)[key];
}

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: `numeric`,
    month: `short`,
    day: `numeric`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PaymentDetailView({ paymentRequestId, data }: PaymentDetailViewProps) {
  const router = useRouter();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(``);
  const [paying, setPaying] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const statusRaw = getField(data, `status`);
  const amountRaw = getField(data, `amount`);
  const currencyRaw = getField(data, `currencyCode`);
  const descriptionRaw = getField(data, `description`);
  const createdAtRaw = getField(data, `createdAt`);
  const roleRaw = getField(data, `role`);
  const ledgerEntriesRaw = getField(data, `ledgerEntries`);
  const attachmentsRaw = getField(data, `attachments`);

  const status = statusRaw != null ? String(statusRaw) : `UNKNOWN`;
  const amount = amountRaw != null ? Number(amountRaw) : 0;
  const currencyCode = currencyRaw != null ? String(currencyRaw) : `USD`;
  const description = descriptionRaw != null ? String(descriptionRaw) : null;
  const createdAt = createdAtRaw != null ? String(createdAtRaw) : null;
  const role = roleRaw != null ? String(roleRaw) : null;
  const ledgerEntries = (Array.isArray(ledgerEntriesRaw) ? ledgerEntriesRaw : []) as LedgerEntry[];
  const attachments = (Array.isArray(attachmentsRaw) ? attachmentsRaw : []) as Attachment[];

  const isPending = status === `PENDING`;
  const isPayer = role === `PAYER`;
  const isDraft = status === `DRAFT`;
  const isRequester = role === `REQUESTER`;

  function createIdempotencyKey(): string {
    if (typeof crypto !== `undefined` && typeof crypto.randomUUID === `function`) {
      return crypto.randomUUID();
    }
    return `fallback-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  useEffect(() => {
    if (isPending && isPayer) {
      setLoadingMethods(true);
      fetch(`/api/payment-methods`, {
        method: `GET`,
        credentials: `include`,
        cache: `no-store`,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load payment methods`);
          return res.json();
        })
        .then((json) => {
          if (json?.items) {
            setPaymentMethods(json.items);
            const defaultMethod = json.items.find((m: PaymentMethod) => m.defaultSelected);
            if (defaultMethod) {
              setSelectedMethodId(defaultMethod.id);
            }
          }
        })
        .catch(() => {
          showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_METHODS_LOAD_FAILED));
        })
        .finally(() => {
          setLoadingMethods(false);
        });
    }
  }, [isPending, isPayer]);

  async function handlePayNow() {
    setPaying(true);
    try {
      if (selectedMethodId) {
        const res = await fetch(`/api/stripe/${paymentRequestId}/pay-with-saved-method`, {
          method: `POST`,
          credentials: `include`,
          headers: {
            'content-type': `application/json`,
            'idempotency-key': createIdempotencyKey(),
          },
          body: JSON.stringify({ paymentMethodId: selectedMethodId }),
        });

        if (!res.ok) {
          const errorData = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
          showErrorToast(
            getErrorMessageForUser(errorData.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)),
            {
              code: errorData.code,
            },
          );
          setPaying(false);
          return;
        }

        const json = await res.json();

        if (json.success) {
          showSuccessToast(`Payment completed successfully!`);
          router.refresh();
        } else if (json.nextAction) {
          showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_REQUIRES_ACTION));
        } else {
          const errData = json as { code?: string; message?: string };
          showErrorToast(getErrorMessageForUser(errData.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)), {
            code: errData.code,
          });
        }
      } else {
        const res = await fetch(`/api/stripe/${paymentRequestId}/stripe-session`, {
          method: `POST`,
          credentials: `include`,
          headers: { 'content-type': `application/json` },
        });

        if (!res.ok) {
          throw new Error(`Cannot start payment session`);
        }

        const json = await res.json();
        if (json.url) {
          window.location.href = json.url;
        } else {
          throw new Error(`Cannot start payment`);
        }
      }
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.PAYMENT_START_FAILED));
    } finally {
      setPaying(false);
    }
  }

  async function handleGenerateInvoice() {
    setGeneratingInvoice(true);
    try {
      const res = await fetch(`/api/payments/${paymentRequestId}/generate-invoice`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
      });

      if (!res.ok) {
        const errorData = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
        showErrorToast(
          getErrorMessageForUser(
            errorData.code,
            errorData.message ?? getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR),
          ),
          { code: errorData.code },
        );
        setGeneratingInvoice(false);
        return;
      }

      showSuccessToast(`Invoice generated successfully!`);
      router.refresh();
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR));
    } finally {
      setGeneratingInvoice(false);
    }
  }

  return (
    <div className={styles.wrap} data-testid="consumer-mobile-payment-detail">
      <div className={styles.headerRow}>
        <h1 className={styles.title}>Payment #{paymentRequestId.slice(0, 6).toUpperCase()}</h1>
        <Link href="/payments" className={styles.downloadLink} aria-label="Back to payments list">
          Back to payments
        </Link>
      </div>

      <Card noPadding>
        <CardHeader>
          <div className={styles.cardHeaderRow}>
            <div className={styles.cardHeaderLeft}>
              <div className={styles.amount}>{formatCurrency(amount / 100, currencyCode)}</div>
              {description ? <p className={styles.description}>{description}</p> : null}
              {createdAt ? <p className={styles.meta}>Created: {formatDateTime(createdAt)}</p> : null}
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>

        {ledgerEntries.length > 0 ? (
          <CardContent className={styles.timelineSection}>
            <h2 className={styles.sectionTitle}>Timeline</h2>
            <div className={styles.timelineList}>
              {ledgerEntries.map((entry) => (
                <div key={entry.id} className={styles.timelineItem}>
                  <div className={styles.timelineDotWrap}>
                    <div className={styles.timelineDot} />
                  </div>
                  <div className={styles.timelineBody}>
                    <div className={styles.timelineLabel}>
                      {entry.status} ({entry.type})
                    </div>
                    <div className={styles.timelineTime}>{formatDateTime(entry.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        ) : null}

        {attachments.length > 0 ? (
          <CardContent>
            <h2 className={styles.sectionTitle}>Attachments</h2>
            <div className={styles.attachmentsList}>
              {attachments.map((attachment) => (
                <div key={attachment.id} className={styles.attachmentRow}>
                  <div className={styles.attachmentLeft}>
                    <div className={styles.attachmentIconWrap}>
                      <DocumentIcon className={styles.attachmentIcon} />
                    </div>
                    <div>
                      <div className={styles.attachmentName}>{attachment.name}</div>
                      <div className={styles.attachmentSize}>{formatFileSize(attachment.size)}</div>
                    </div>
                  </div>
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.downloadLink}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        ) : null}
      </Card>

      {isPending && isPayer ? (
        <>
          {loadingMethods ? (
            <Card>
              <div className={styles.loadingWrap}>
                <div className={styles.loadingContent}>
                  <SpinnerIcon className={styles.loadingSpinner} />
                  <span className={styles.loadingText}>Loading payment methods...</span>
                </div>
              </div>
            </Card>
          ) : paymentMethods.length > 0 ? (
            <Card noPadding>
              <CardHeader>
                <h2 className={styles.methodCardTitle}>Select payment method</h2>
                <p className={styles.methodCardSub}>Choose how you would like to pay</p>
              </CardHeader>
              <CardContent className={styles.methodList}>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={cn(
                      styles.methodOption,
                      selectedMethodId === method.id ? styles.methodOptionSelected : styles.methodOptionDefault,
                    )}
                  >
                    <div className={styles.methodOptionRow}>
                      <div className={styles.methodOptionLeft}>
                        <input
                          type="radio"
                          checked={selectedMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                          className={styles.methodRadio}
                        />
                        <div className={styles.methodOptionMain}>
                          <div className={styles.methodOptionTitleRow}>
                            <span className="capitalize">{method.brand}</span>
                            <span className={styles.methodOptionMask}>••••</span>
                            <span>{method.last4}</span>
                            {method.defaultSelected ? <span className={styles.methodDefaultBadge}>Default</span> : null}
                          </div>
                          {method.expMonth && method.expYear ? (
                            <div className={styles.methodExp}>
                              Expires {method.expMonth}/{method.expYear}
                            </div>
                          ) : null}
                          {method.billingDetails?.name ? (
                            <div className={styles.methodBilling}>{method.billingDetails.name}</div>
                          ) : null}
                        </div>
                      </div>
                      <div className={styles.methodType}>{method.type.toLowerCase()}</div>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMethodId(``)}
                  className={cn(
                    styles.methodOption,
                    selectedMethodId === `` ? styles.methodOptionSelected : styles.methodOptionDefault,
                  )}
                >
                  <div className={styles.methodAddNewRow}>
                    <input
                      type="radio"
                      checked={selectedMethodId === ``}
                      onChange={() => setSelectedMethodId(``)}
                      className={styles.methodRadioSimple}
                    />
                    <div>
                      <div className={styles.methodAddNewTitle}>Add new payment method</div>
                      <div className={styles.methodAddNewSub}>Enter new card or bank details</div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}

      <div className={styles.actions}>
        {isPending && isPayer ? (
          <Button variant="primary" size="lg" onClick={handlePayNow} isLoading={paying} className={styles.actionBtn}>
            {paying ? `Processing payment...` : `Pay now`}
          </Button>
        ) : null}
        {isDraft && isRequester ? (
          <SendPaymentRequestButton paymentRequestId={paymentRequestId} status={status} />
        ) : null}
        <Button
          variant="outline"
          size="lg"
          onClick={handleGenerateInvoice}
          isLoading={generatingInvoice}
          className={styles.actionBtn}
        >
          {generatingInvoice ? `Generating...` : `Generate invoice`}
        </Button>
      </div>
    </div>
  );
}
