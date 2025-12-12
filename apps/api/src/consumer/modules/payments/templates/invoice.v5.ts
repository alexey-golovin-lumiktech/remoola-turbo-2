import { type InvoicePayment } from './types';

type CompanyInfo = {
  name: string;
  slogan?: string;
  addressLine1?: string;
  addressLine2?: string;
  registrationId?: string;
  taxId?: string;
  website?: string;
  email?: string;
  logoUrl?: string; // if you want to embed image via <img src>
};

type BuildInvoiceV5Params = {
  invoiceNumber: string;
  payment: InvoicePayment; // You can replace with Prisma type + includes
  company?: CompanyInfo;
  qrCodeUrl?: string; // Optional QR image (data URL or CDN URL)
};

export function buildInvoiceHtmlV5(params: BuildInvoiceV5Params): string {
  const { invoiceNumber, payment, qrCodeUrl } = params;

  const company: CompanyInfo = {
    name: `Remoola`,
    slogan: `Global Payments • Transfers • Finance Automation`,
    addressLine1: `123 Finance Street`,
    addressLine2: `Toronto, Canada`,
    registrationId: `Reg #RM-2025-001`,
    taxId: `TAX ID 123 456 789`,
    website: `https://remoola.app`,
    email: `support@remoola.com`,
    ...params.company,
  };

  const payer = payment.payer;
  const requester = payment.requester;
  const tx = payment.ledgerEntries?.[0] ?? null;

  const amount = Number(payment.amount ?? 0);
  const currency = payment.currencyCode;
  const fees = Number(tx?.feesAmount ?? 0);
  const txAmount = Number(tx?.amount ?? amount);
  const total = txAmount + fees;

  const isPaid = payment.status === `COMPLETED`;
  const isDraft = payment.status === `DRAFT`;
  const isFailed = [`DENIED`, `UNCOLLECTIBLE`].includes(payment.status);

  const paymentTimeline = {
    created: payment.createdAt ? new Date(payment.createdAt).toISOString().slice(0, 10) : `—`,
    expected: payment.expectationDate ? new Date(payment.expectationDate).toISOString().slice(0, 10) : `—`,
    completed: isPaid && tx?.createdAt ? new Date(tx.createdAt).toISOString().slice(0, 10) : `—`,
  };

  return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Invoice ${invoiceNumber}</title>

<style>
/* ------------------ A4 LAYOUT ------------------ */
body {
  margin: 0;
  padding: 0;
  width: 210mm;
  height: auto;
  min-height: 297mm;
  background: #ffffff;
  font-family: "Arial", "Roboto", sans-serif;
}

.page {
  width: 100%;
  min-height: 297mm;
  padding: 20mm 18mm 20mm;
  box-sizing: border-box;
  position: relative;
}

/* ------------------ WATERMARK ------------------ */
.watermark {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-30deg);
  opacity: 0.045;
  font-size: 150px;
  font-weight: 900;
  color: #1f2937;
  z-index: 0;
  pointer-events: none;
}

/* ------------------ HEADER ------------------ */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12mm;
  position: relative;
  z-index: 10;
}

.company-block {
  max-width: 55%;
}

.company-name {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
}

.company-slogan {
  font-size: 12px;
  color: #64748b;
  margin-top: 3px;
}

.company-address {
  margin-top: 8px;
  font-size: 11px;
  color: #6b7280;
}

.company-meta {
  margin-top: 4px;
  font-size: 11px;
  color: #6b7280;
}

/* RIGHT HEADER */
.invoice-meta {
  text-align: right;
}

.invoice-title {
  font-size: 24px;
  font-weight: 700;
  color: #111827;
}

.invoice-sub {
  margin-top: 6px;
  font-size: 11px;
  color: #6b7280;
}

.badge {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  color: white;
}
.badge-paid { background: #22c55e; }
.badge-draft { background: #f59e0b; }
.badge-failed { background: #dc2626; }
.badge-other { background: #3b82f6; }

/* ------------------ FIXED GRID ------------------ */
.layout {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  z-index: 2;
  position: relative;
}

.left-col {
  width: 58%;
}

.right-col {
  width: 38%;
}

/* ------------------ SECTION TITLES ------------------ */
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 4px;
}

.info-text {
  font-size: 12px;
  line-height: 1.55;
  color: #111827;
}

/* ------------------ CARDS ------------------ */
.card {
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 14px;
  margin-bottom: 10px;
}

.card-strong {
  background: #1e293b;
  color: #e2e8f0;
}

.amount-main {
  font-size: 28px;
  font-weight: 700;
  margin-top: 4px;
}

.muted {
  font-size: 11px;
  color: #6b7280;
}

/* ------------------ TABLE ------------------ */
table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 6px;
  font-size: 12px;
}

th {
  background: #1f2937;
  color: #fff;
  padding: 7px 10px;
  text-align: left;
}

td {
  padding: 7px 10px;
  border-bottom: 1px solid #e5e7eb;
}

/* ------------------ TOTALS GRID FIX ------------------ */
.meta-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.meta-item-label {
  color: #6b7280;
}

/* ------------------ TIMELINE ------------------ */
.timeline {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 14px;
  margin-top: 10px;
}

.timeline-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 11px;
}

.timeline-label {
  color: #6b7280;
  text-transform: uppercase;
  font-size: 10px;
}

.timeline-value {
  color: #111827;
  font-weight: 500;
}

/* ------------------ SIGNATURE ------------------ */
.signature-block {
  margin-top: 20mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.sig-line {
  width: 60mm;
  border-bottom: 1px solid #cbd5e1;
  margin-bottom: 3mm;
}

/* ------------------ QR CODE ------------------ */
.qr-block img {
  width: 85px;
  height: 85px;
}

.qr-caption {
  font-size: 10px;
  color: #94a3b8;
  text-align: center;
}

/* ------------------ FOOTER ------------------ */
.footer {
  color: #94a3b8;
  text-align: center;
  font-size: 10px;
  margin-top: 14mm;
}
</style>
</head>

<body>
<div class="page">

  <div class="watermark">${isPaid ? `PAID` : payment.status}</div>

  <!-- HEADER -->
  <div class="header">
    <div>
      <div class="company-name">${company.name}</div>
      <div class="company-slogan">${company.slogan}</div>
      <div class="company-address">
        ${company.addressLine1}<br />
        ${company.addressLine2}
      </div>
      <div class="company-meta">
        ${company.registrationId}<br />
        ${company.taxId}
      </div>
    </div>

    <div class="invoice-meta">
      <div class="invoice-title">Invoice</div>
      <div class="invoice-sub">
        Invoice #: <strong>${invoiceNumber}</strong><br />
        Date: <strong>${new Date().toISOString().slice(0, 10)}</strong><br />
        Currency: <strong>${currency}</strong>
      </div>

      ${isPaid
      ? `<span class="badge badge-paid">PAID</span>`
      : isDraft
        ? `<span class="badge badge-draft">DRAFT</span>`
        : isFailed
          ? `<span class="badge badge-failed">${payment.status}</span>`
          : `<span class="badge badge-other">${payment.status}</span>`
    }
    </div>
  </div>

  <!-- MAIN GRID -->
  <div class="layout">
    <!-- LEFT SIDE -->
    <div>
      <div>
        <div class="section-title">Billed To</div>
        <div class="info-text">
          ${payer.personalDetails?.firstName ?? ``} ${payer.personalDetails?.lastName ?? ``}<br />
          ${payer.email}<br />
          ${payer.addressDetails?.country ?? ``}
        </div>
      </div>

      <div style="margin-top:16px;">
        <div class="section-title">Requester</div>
        <div class="info-text">
          ${requester.personalDetails?.firstName ?? ``}
          ${requester.personalDetails?.lastName ?? ``}<br />
          ${requester.email}
        </div>
      </div>

      <!-- TIMELINE -->
      <div class="timeline">
        <div class="section-title" style="margin-bottom:4px;">Payment Timeline</div>
        <div class="timeline-row">
          <div class="timeline-label">Created</div>
          <div class="timeline-value">${paymentTimeline.created}</div>
        </div>
        <div class="timeline-row">
          <div class="timeline-label">Expected</div>
          <div class="timeline-value">${paymentTimeline.expected}</div>
        </div>
        <div class="timeline-row">
          <div class="timeline-label">Completed</div>
          <div class="timeline-value">${paymentTimeline.completed}</div>
        </div>
      </div>

    </div>

    <!-- RIGHT SIDE -->
    <div>

      <!-- AMOUNT CARD -->
      <div class="card card-strong">
        <div class="muted">Amount Due</div>
        <div class="amount-main">${amount.toFixed(2)} ${currency}</div>
        <div class="muted" style="margin-top:6px;">
          Payment Request ID: <strong>${payment.id}</strong>
        </div>
      </div>

      <!-- SUMMARY TABLE -->
      <div>
        <div class="section-title">Invoice Summary</div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${payment.description ?? `Payment Request`}</td>
              <td class="text-right">${amount.toFixed(2)} ${currency}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- TOTALS + META -->
      <div class="meta-grid">

        <div class="card">
          <div class="section-title" style="margin-bottom:4px;">Totals</div>
          <div class="meta-item">
          <span class="meta-item-label">Original Amount</span><span>${txAmount.toFixed(2)} ${currency}</span></div>
          <div class="meta-item">
          <span class="meta-item-label">Fees</span><span>${fees.toFixed(2)} ${currency}</span></div>
          <div class="meta-item">
          <span class="meta-item-label">Sub-total</span><span>${total.toFixed(2)} ${currency}</span></div>
          <div class="meta-item" style="font-weight:600;">
          <span>Total Charged</span><span>${total.toFixed(2)} ${currency}</span></div>
        </div>

        <div class="card">
          <div class="section-title" style="margin-bottom:4px;">Meta</div>
          <div class="meta-item">
            <span class="meta-item-label">Transaction Type</span>
            <span>${payment.type}</span>
          </div>
          <div class="meta-item">
            <span class="meta-item-label">Status</span>
            <span>${payment.status}</span>
          </div>
          ${tx?.stripeId
      ? `
          <div class="meta-item">
            <span class="meta-item-label">Stripe ID</span>
            <span>${tx.stripeId.slice(0, 10)}</span>
          </div>
          `
      : ``
    }
        </div>

      </div>
    </div>
  </div>

  <!-- SIGNATURE & QR -->
  <div class="signature-block">
    <div>
      <div class="muted">Authorized by</div>
      <div class="sig-line"></div>
      <div class="muted">Signature / Company Representative</div>
    </div>

    ${qrCodeUrl
      ? `
      <div class="qr-block">
        <img src="${qrCodeUrl}" />
        <div class="qr-caption">View this invoice online</div>
      </div>
    `
      : ``
    }
  </div>

  <!-- FOOTER -->
  <div class="footer">
    This invoice was generated by ${company.name}.
    ${company.website ? `Visit ${company.website}` : ``}
    ${company.email ?? ``}
  </div>

</div>
</body>
</html>
`;
}
