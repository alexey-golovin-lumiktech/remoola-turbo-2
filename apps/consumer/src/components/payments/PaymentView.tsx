'use client';

import { useEffect, useState } from 'react';

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

  if (loading) {
    return <div className="p-8 text-slate-600 dark:text-slate-300">Loading payment…</div>;
  }

  if (!data) {
    return (
      <div className="p-8">
        <div className="text-red-600 dark:text-red-400">Payment not found</div>
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
    <div className="px-8 py-6 flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Payment #{p.id.slice(0, 6).toUpperCase()}</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Side: Details */}
        <div className="col-span-2 flex flex-col gap-6">
          {/* Summary Card */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-600">
            <div className="flex justify-between mb-4">
              <div className="text-xl font-semibold">
                ${p.amount.toFixed(2)} {p.currencyCode}
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  p.status === `PENDING`
                    ? `bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300`
                    : p.status === `COMPLETED`
                      ? `bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300`
                      : `bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300`
                }`}
              >
                {p.status}
              </span>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-300">{p.description || `No description`}</div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">Created: {new Date(p.createdAt).toLocaleString()}</div>
          </div>

          {/* Timeline */}
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-600">
            <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Timeline</h2>

            {p.ledgerEntries.map((t: any) => (
              <div key={t.id} className="border-l border-slate-300 dark:border-slate-600 pl-4 ml-2 mb-4 relative">
                <div className="absolute w-3 h-3 bg-blue-600 dark:bg-blue-500 rounded-full -left-1 top-1"></div>

                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t.status} ({t.type})
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">{new Date(t.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Attachments */}
        <div className="col-span-1 flex flex-col gap-6">
          <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-600">
            <h2 className="font-semibold mb-3 text-gray-900 dark:text-white">Attachments</h2>

            {p.attachments.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">No attachments</div>}

            {p.attachments.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center border-b border-slate-200 dark:border-slate-600 py-2">
                <div>
                  <div className="text-sm text-gray-900 dark:text-white">{a.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{(a.size / 1024).toFixed(1)} KB</div>
                </div>
                <a
                  href={a.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 text-sm font-medium"
                >
                  Download
                </a>
              </div>
            ))}
          </div>

          {/* Payment Method Selection */}
          {p.status === `PENDING` && paymentMethods.length > 0 && (
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border dark:border-slate-600">
              <h3 className="font-semibold mb-3 text-gray-900 dark:text-white">Select Payment Method</h3>
              <div className="space-y-3">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedPaymentMethodId === method.id
                        ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`
                        : `border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500`
                    }`}
                    onClick={() => setSelectedPaymentMethodId(method.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={selectedPaymentMethodId === method.id}
                          onChange={() => setSelectedPaymentMethodId(method.id)}
                          className="text-blue-600 dark:text-blue-400"
                        />
                        <div>
                          <div className="font-medium">
                            {method.brand} ****{method.last4}
                            {method.defaultSelected && (
                              <span className="ml-2 px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded">
                                Default
                              </span>
                            )}
                          </div>
                          {method.expMonth && method.expYear && (
                            <div className="text-sm text-gray-500">
                              Expires {String(method.expMonth).padStart(2, `0`)}/{method.expYear}
                            </div>
                          )}
                          {method.billingDetails?.name && (
                            <div className="text-sm text-gray-500">{method.billingDetails.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 capitalize">{method.type.toLowerCase()}</div>
                    </div>
                  </div>
                ))}

                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedPaymentMethodId === ``
                      ? `border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400`
                      : `border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500`
                  }`}
                  onClick={() => setSelectedPaymentMethodId(``)}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      checked={selectedPaymentMethodId === ``}
                      onChange={() => setSelectedPaymentMethodId(``)}
                      className="text-blue-600"
                    />
                    <div>
                      <div className="font-medium">Add New Payment Method</div>
                      <div className="text-sm text-gray-500">Enter new card or bank details</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {p.status === `PENDING` && (
            <button
              className="rounded-full bg-blue-600 px-6 py-3 text-sm text-white shadow
                hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={payNow}
              disabled={paying}
            >
              {paying ? `Processing...` : `Pay Now`}
            </button>
          )}

          <button
            className="rounded-full bg-blue-600 px-6 py-3 text-sm text-white shadow hover:bg-blue-700 dark:hover:bg-blue-500"
            onClick={generateInvoice}
          >
            Generate INVOICE
          </button>
        </div>
      </div>
    </div>
  );
}
