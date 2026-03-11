'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { SendPaymentRequestButton } from './SendPaymentRequestButton';
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
  expMonth: number | null;
  expYear: number | null;
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
  }).format(amount / 100);
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
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : `Failed to load payment methods`);
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
          headers: { 'content-type': `application/json` },
          body: JSON.stringify({ paymentMethodId: selectedMethodId }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Payment failed`);
        }

        const json = await res.json();

        if (json.success) {
          toast.success(`Payment completed successfully!`);
          router.refresh();
        } else if (json.nextAction) {
          toast.error(`Payment requires additional action. Please check your email or payment method for next steps.`);
        } else {
          throw new Error(json.message || `Payment failed`);
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Payment error`;
      toast.error(errorMessage);
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
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.code || `Invoice generation failed`);
      }

      toast.success(`Invoice generated successfully!`);
      router.refresh();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Invoice generation failed`;
      toast.error(errorMessage);
    } finally {
      setGeneratingInvoice(false);
    }
  }

  return (
    <div className={`space-y-6`} data-testid="consumer-mobile-payment-detail">
      <div className={`flex items-center justify-between`}>
        <h1
          className={`
          text-2xl
          font-bold
          text-slate-900
          dark:text-white
        `}
        >
          Payment #{paymentRequestId.slice(0, 6).toUpperCase()}
        </h1>
      </div>

      <Card noPadding>
        <CardHeader>
          <div
            className={`
            flex
            items-start
            justify-between
            gap-4
          `}
          >
            <div className={`flex-1`}>
              <div
                className={`
                text-3xl
                font-bold
                text-slate-900
                dark:text-white
              `}
              >
                {formatCurrency(amount, currencyCode)}
              </div>
              {description && (
                <p
                  className={`
                mt-2
                text-sm
                text-slate-600
                dark:text-slate-400
              `}
                >
                  {description}
                </p>
              )}
              {createdAt && (
                <p
                  className={`
                  mt-1
                  text-xs
                  text-slate-500
                  dark:text-slate-500
                `}
                >
                  Created: {formatDateTime(createdAt)}
                </p>
              )}
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>

        {ledgerEntries.length > 0 && (
          <CardContent className={`border-b border-slate-200 dark:border-slate-700`}>
            <h2
              className={`
              mb-4
              text-lg
              font-semibold
              text-slate-900
              dark:text-white
            `}
            >
              Timeline
            </h2>
            <div className={`space-y-4`}>
              {ledgerEntries.map((entry) => (
                <div key={entry.id} className={`flex gap-3`}>
                  <div
                    className={`
                    relative
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-primary-100
                    dark:bg-primary-900/20
                  `}
                  >
                    <div
                      className={`
                      h-2.5
                      w-2.5
                      rounded-full
                      bg-primary-600
                      dark:bg-primary-400
                    `}
                    />
                  </div>
                  <div className={`flex-1 pt-0.5`}>
                    <div
                      className={`
                      text-sm
                      font-medium
                      text-slate-900
                      dark:text-white
                    `}
                    >
                      {entry.status} ({entry.type})
                    </div>
                    <div className={`text-xs text-slate-500 dark:text-slate-500`}>
                      {formatDateTime(entry.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}

        {attachments.length > 0 && (
          <CardContent>
            <h2
              className={`
              mb-4
              text-lg
              font-semibold
              text-slate-900
              dark:text-white
            `}
            >
              Attachments
            </h2>
            <div className={`space-y-2`}>
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={`
                    flex
                    items-center
                    justify-between
                    rounded-lg
                    border
                    border-slate-200
                    p-3
                    transition-colors
                    hover:bg-slate-50
                    dark:border-slate-700
                    dark:hover:bg-slate-700/50
                  `}
                >
                  <div className={`flex items-center gap-3`}>
                    <div
                      className={`
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-slate-100
                      dark:bg-slate-700
                    `}
                    >
                      <DocumentIcon
                        className={`
                          h-5
                          w-5
                          text-slate-600
                          dark:text-slate-400
                        `}
                      />
                    </div>
                    <div>
                      <div
                        className={`
                        text-sm
                        font-medium
                        text-slate-900
                        dark:text-white
                      `}
                      >
                        {attachment.name}
                      </div>
                      <div className={`text-xs text-slate-500 dark:text-slate-500`}>
                        {formatFileSize(attachment.size)}
                      </div>
                    </div>
                  </div>
                  <a
                    href={attachment.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`
                      rounded-lg
                      px-3
                      py-1.5
                      text-sm
                      font-medium
                      text-primary-600
                      transition-colors
                      hover:bg-primary-50
                      hover:text-primary-700
                      dark:text-primary-400
                      dark:hover:bg-primary-900/20
                    `}
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {isPending && isPayer && (
        <>
          {loadingMethods ? (
            <Card>
              <div
                className={`
                flex
                items-center
                justify-center
                py-8
              `}
              >
                <div
                  className={`
                  flex
                  items-center
                  gap-3
                  text-slate-600
                  dark:text-slate-400
                `}
                >
                  <SpinnerIcon className={`h-5 w-5 animate-spin`} />
                  <span className={`text-sm`}>Loading payment methods...</span>
                </div>
              </div>
            </Card>
          ) : paymentMethods.length > 0 ? (
            <Card noPadding>
              <CardHeader>
                <h2
                  className={`
                  text-lg
                  font-semibold
                  text-slate-900
                  dark:text-white
                `}
                >
                  Select payment method
                </h2>
                <p
                  className={`
                  mt-1
                  text-sm
                  text-slate-600
                  dark:text-slate-400
                `}
                >
                  Choose how you would like to pay
                </p>
              </CardHeader>
              <CardContent className={`space-y-3`}>
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethodId(method.id)}
                    className={`group w-full rounded-lg border p-4 text-left transition-all ${
                      selectedMethodId === method.id
                        ? `border-primary-500 bg-primary-50 ring-2 ring-primary-500 ring-offset-2 dark:border-primary-400 dark:bg-primary-900/20`
                        : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600`
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
                      <div className={`flex items-start gap-3`}>
                        <input
                          type="radio"
                          checked={selectedMethodId === method.id}
                          onChange={() => setSelectedMethodId(method.id)}
                          className={`
                            mt-0.5
                            h-4
                            w-4
                            text-primary-600
                            focus:ring-primary-500
                          `}
                        />
                        <div className={`flex-1`}>
                          <div
                            className={`
                            flex
                            items-center
                            gap-2
                            text-sm
                            font-medium
                            text-slate-900
                            dark:text-white
                          `}
                          >
                            <span className={`capitalize`}>{method.brand}</span>
                            <span className={`text-slate-600 dark:text-slate-400`}>••••</span>
                            <span>{method.last4}</span>
                            {method.defaultSelected && (
                              <span
                                className={`
                                rounded-full
                                bg-green-100
                                px-2
                                py-0.5
                                text-xs
                                font-medium
                                text-green-700
                                dark:bg-green-900/30
                                dark:text-green-400
                              `}
                              >
                                Default
                              </span>
                            )}
                          </div>
                          {method.expMonth && method.expYear && (
                            <div
                              className={`
                              mt-1
                              text-xs
                              text-slate-500
                              dark:text-slate-500
                            `}
                            >
                              Expires {String(method.expMonth).padStart(2, `0`)}/{method.expYear}
                            </div>
                          )}
                          {method.billingDetails?.name && (
                            <div
                              className={`
                              mt-1
                              text-xs
                              text-slate-600
                              dark:text-slate-400
                            `}
                            >
                              {method.billingDetails.name}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`
                        text-xs
                        capitalize
                        text-slate-500
                        dark:text-slate-500
                      `}
                      >
                        {method.type.toLowerCase()}
                      </div>
                    </div>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSelectedMethodId(``)}
                  className={`group w-full rounded-lg border p-4 text-left transition-all ${
                    selectedMethodId === ``
                      ? `border-primary-500 bg-primary-50 ring-2 ring-primary-500 ring-offset-2 dark:border-primary-400 dark:bg-primary-900/20`
                      : `border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600`
                  }`}
                >
                  <div className={`flex items-center gap-3`}>
                    <input
                      type="radio"
                      checked={selectedMethodId === ``}
                      onChange={() => setSelectedMethodId(``)}
                      className={`
                        h-4
                        w-4
                        text-primary-600
                        focus:ring-primary-500
                      `}
                    />
                    <div>
                      <div
                        className={`
                        text-sm
                        font-medium
                        text-slate-900
                        dark:text-white
                      `}
                      >
                        Add new payment method
                      </div>
                      <div className={`text-xs text-slate-500 dark:text-slate-500`}>Enter new card or bank details</div>
                    </div>
                  </div>
                </button>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      <div
        className={`
        flex
        flex-col
        gap-3
        sm:flex-row
      `}
      >
        {isPending && isPayer && (
          <Button variant="primary" size="lg" onClick={handlePayNow} isLoading={paying} className={`flex-1`}>
            {paying ? `Processing payment...` : `Pay now`}
          </Button>
        )}
        {isDraft && isRequester && <SendPaymentRequestButton paymentRequestId={paymentRequestId} status={status} />}
        <Button
          variant="outline"
          size="lg"
          onClick={handleGenerateInvoice}
          isLoading={generatingInvoice}
          className={`flex-1`}
        >
          {generatingInvoice ? `Generating...` : `Generate invoice`}
        </Button>
      </div>
    </div>
  );
}
