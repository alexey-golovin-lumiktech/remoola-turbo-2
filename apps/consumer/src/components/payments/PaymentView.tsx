'use client';

import { useEffect, useState } from 'react';

import styles from '../ui/classNames.module.css';

const {
  amountTitle,
  attachmentLink,
  attachmentName,
  attachmentRow,
  attachmentSize,
  badgeBaseStrong,
  badgeCompleted,
  badgeDefaultSm,
  badgeNeutral,
  badgePending,
  buttonDisabledCursor,
  buttonPrimaryRounded,
  cardBasePadded,
  cardHeaderRow,
  descriptionText,
  errorTextClass,
  fontMedium,
  methodRowHeader,
  methodRowLeft,
  paymentViewContainer,
  paymentViewGrid,
  paymentViewLeftCol,
  paymentViewLoading,
  paymentViewNotFound,
  paymentViewRightCol,
  paymentViewTitle,
  radioPrimary,
  selectableCardActive,
  selectableCardBase,
  selectableCardInactive,
  sectionTitle,
  spaceY3,
  textCapitalize,
  textMutedGray,
  textPrimary,
  textSm,
  textXsMuted,
  timelineDot,
  timelineItem,
  timelineMeta,
  timelineTitle,
  timestampText,
} = styles;

function formatAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(undefined, { style: `currency`, currency: currencyCode }).format(amount);
}

type PaymentViewProps = { paymentRequestId: string };

type PaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  defaultSelected: boolean;
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
};

export function PaymentView({ paymentRequestId }: PaymentViewProps) {
  const [data, setData] = useState<any>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string>(``);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      // Load payment request data
      const paymentRes = await fetch(`/api/payments/${paymentRequestId}`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });

      if (!paymentRes.ok) {
        setLoading(false);
        return;
      }

      const paymentJson = await paymentRes.json();
      setData(paymentJson);

      // Load payment methods
      const methodsRes = await fetch(`/api/payment-methods`, {
        method: `GET`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });

      if (methodsRes.ok) {
        const methodsJson = await methodsRes.json();
        setPaymentMethods(methodsJson.items || []);

        // Auto-select default payment method
        const defaultMethod = methodsJson.items?.find((m: PaymentMethod) => m.defaultSelected);
        if (defaultMethod) {
          setSelectedPaymentMethodId(defaultMethod.id);
        }
      }

      setLoading(false);
    }

    load();
  }, [paymentRequestId]);

  async function payNow() {
    setPaying(true);

    try {
      if (selectedPaymentMethodId) {
        // Pay with saved payment method
        const res = await fetch(`/api/stripe/${paymentRequestId}/pay-with-saved-method`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ paymentMethodId: selectedPaymentMethodId }),
        });

        const json = await res.json();

        if (json.success) {
          // Payment successful, reload the page to show updated status
          window.location.reload();
        } else if (json.nextAction) {
          alert(`Payment requires additional action. Please check your email or payment method for next steps.`);
        } else {
          alert(`Payment failed: ${json.message || `Unknown error`}`);
        }
      } else {
        // Pay with new payment method (checkout session)
        const res = await fetch(`/api/stripe/${paymentRequestId}/stripe-session`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
        });

        const json = await res.json();

        if (json.url) {
          window.location.href = json.url;
        } else {
          alert(`Cannot start payment`);
        }
      }
    } catch (error) {
      alert(`Payment error: ${error instanceof Error ? error.message : `Unknown error`}`);
    } finally {
      setPaying(false);
    }
  }

  async function generateInvoice() {
    const res = await fetch(`/api/payments/${paymentRequestId}/generate-invoice`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });

    const json = await res.json();
    console.log(`json`, json);
  }

  async function sendRequest() {
    setSending(true);
    try {
      const res = await fetch(`/api/payment-requests/${paymentRequestId}/send`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.message || `Failed to send request`);
        return;
      }

      window.location.reload();
    } catch (error) {
      alert(`Send error: ${error instanceof Error ? error.message : `Unknown error`}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <div className={paymentViewLoading}>Loading payment…</div>;
  }

  if (!data) {
    return (
      <div className={paymentViewNotFound}>
        <div className={errorTextClass}>Payment not found</div>
      </div>
    );
  }

  const p = data;

  // const bankDetails = {
  //   amount: p.amount,
  //   currency: p.currencyCode,
  //   reference: p.bankReferenceId,
  //   beneficiary: `WireBill Inc.`,
  //   accountNumber: `00221113334566`,
  //   swiftCode: `CHASESU11`,
  //   routingNumber: `0001124445`,
  //   address: `1033, 2nd St, San Francisco, CA 92345, USA`,
  // };

  return (
    <div className={paymentViewContainer}>
      <h1 className={paymentViewTitle}>Payment #{p.id.slice(0, 6).toUpperCase()}</h1>

      <div className={paymentViewGrid}>
        {/* Left Side: Details */}
        <div className={paymentViewLeftCol}>
          {/* Summary Card */}
          <div className={cardBasePadded}>
            <div className={cardHeaderRow}>
              <div className={amountTitle}>{formatAmount(p.amount, p.currencyCode)}</div>

              <span
                className={`${badgeBaseStrong} ${
                  p.status === `PENDING` ? badgePending : p.status === `COMPLETED` ? badgeCompleted : badgeNeutral
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className={descriptionText}>{p.description || `No description`}</div>

            <div className={timestampText}>Created: {new Date(p.createdAt).toLocaleString()}</div>
          </div>

          {/* Timeline */}
          <div className={cardBasePadded}>
            <h2 className={sectionTitle}>Timeline</h2>

            {p.ledgerEntries.map((t: any) => (
              <div key={t.id} className={timelineItem}>
                <div className={timelineDot}></div>

                <div className={timelineTitle}>
                  {t.status} ({t.type})
                </div>
                <div className={timelineMeta}>{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Attachments */}
        <div className={paymentViewRightCol}>
          <div className={cardBasePadded}>
            <h2 className={sectionTitle}>Attachments</h2>

            {p.attachments.length === 0 && <div className={textXsMuted}>No attachments</div>}

            {p.attachments.map((a: any) => (
              <div key={a.id} className={attachmentRow}>
                <div>
                  <div className={attachmentName}>{a.name}</div>
                  <div className={attachmentSize}>{(a.size / 1024).toFixed(1)} KB</div>
                </div>
                <a href={a.downloadUrl} target="_blank" rel="noopener noreferrer" className={attachmentLink}>
                  Download
                </a>
              </div>
            ))}
          </div>

          {/* Payment Method Selection */}
          {p.status === `PENDING` && p.role === `PAYER` && paymentMethods.length > 0 && (
            <div className={cardBasePadded}>
              <h3 className={sectionTitle}>Select Payment Method</h3>
              <div className={spaceY3}>
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`${selectableCardBase} ${
                      selectedPaymentMethodId === method.id ? selectableCardActive : selectableCardInactive
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedPaymentMethodId(method.id);
                    }}
                  >
                    <div className={methodRowHeader}>
                      <div className={methodRowLeft}>
                        <input
                          type="radio"
                          checked={selectedPaymentMethodId === method.id}
                          onChange={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedPaymentMethodId(method.id);
                          }}
                          className={radioPrimary}
                        />
                        <div>
                          <div className={`${fontMedium} ${textPrimary}`}>
                            {method.brand} ****{method.last4}
                            {method.defaultSelected && <span className={badgeDefaultSm}>Default</span>}
                          </div>
                          {method.expMonth && method.expYear && (
                            <div className={`${textSm} ${textMutedGray}`}>
                              Expires {String(method.expMonth).padStart(2, `0`)}/{method.expYear}
                            </div>
                          )}
                          {method.billingDetails?.name && (
                            <div className={`${textSm} ${textMutedGray}`}>{method.billingDetails.name}</div>
                          )}
                        </div>
                      </div>
                      <div className={`${textSm} ${textMutedGray} ${textCapitalize}`}>{method.type.toLowerCase()}</div>
                    </div>
                  </div>
                ))}

                <div
                  className={`${selectableCardBase} ${
                    selectedPaymentMethodId === `` ? selectableCardActive : selectableCardInactive
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedPaymentMethodId(``);
                  }}
                >
                  <div className={methodRowLeft}>
                    <input
                      type="radio"
                      checked={selectedPaymentMethodId === ``}
                      onChange={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPaymentMethodId(``);
                      }}
                      className={radioPrimary}
                    />
                    <div>
                      <div className={`${fontMedium} ${textPrimary}`}>Add New Payment Method</div>
                      <div className={`${textSm} ${textMutedGray}`}>Enter new card or bank details</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {p.status === `PENDING` && p.role === `PAYER` && (
            <button
              className={`${buttonPrimaryRounded} ${buttonDisabledCursor}`}
              onClick={payNow}
              disabled={paying} //
            >
              {paying ? `Processing...` : `Pay Now`}
            </button>
          )}

          {p.status === `DRAFT` && p.role === `REQUESTER` && (
            <button
              className={`${buttonPrimaryRounded} ${buttonDisabledCursor}`}
              onClick={sendRequest}
              disabled={sending}
            >
              {sending ? `Sending...` : `Send Request`}
            </button>
          )}

          <button className={buttonPrimaryRounded} onClick={generateInvoice}>
            Generate INVOICE
          </button>
        </div>
      </div>
    </div>
  );
}
