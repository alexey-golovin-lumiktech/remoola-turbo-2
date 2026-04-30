import * as auth from './auth';
import * as payment from './payment';

describe(`email templates common layout`, () => {
  it(`wraps auth forgot-password`, () => {
    const html = auth.forgotPassword.processor(`https://wirebill.example/reset-password?token=demo`);
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Reset your password`);
    expect(html).toContain(`href="https://wirebill.example/reset-password?token=demo"`);
  });

  it(`wraps auth signup-completion`, () => {
    const html = auth.signupCompletionToHtml.processor(`https://wirebill.example/confirm-email?token=demo`);
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`<html lang="en">`);
    expect(html).toContain(`Confirm your email`);
    expect(html).toContain(`href="https://wirebill.example/confirm-email?token=demo"`);
  });

  it(`fails closed for unsafe CTA links`, () => {
    const html = auth.forgotPassword.processor(`javascript:alert(1)`);
    expect(html).toContain(`href="#"`);
    expect(html).not.toContain(`javascript:alert(1)`);
  });

  it(`does not break style attributes with unescaped font-family quotes`, () => {
    const html = auth.forgotPassword.processor(`https://wirebill.example/reset-password?token=demo`);
    expect(html).toContain(`'Segoe UI'`);
    expect(html).not.toContain(`font-family:-apple-system, BlinkMacSystemFont, "Segoe UI"`);
  });

  it(`wraps auth google-sign-in-recovery`, () => {
    const html = auth.googleSignInRecovery.processor(`https://wirebill.example/login`);
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Continue to sign in`);
    expect(html).toContain(`href="https://wirebill.example/login"`);
  });

  it(`wraps auth invitation and escapes recipient email`, () => {
    const html = auth.invitation.processor({
      email: `<invitee@example.com>`,
      signupLink: `https://wirebill.example/signup?invite=demo`,
    });
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`You’re invited`);
    expect(html).toContain(`&lt;invitee@example.com&gt;`);
    expect(html).not.toContain(`<strong><invitee@example.com></strong>`);
    expect(html).toContain(`href="https://wirebill.example/signup?invite=demo"`);
  });

  it(`wraps payment info and escapes contact values`, () => {
    const html = payment.payToContactPaymentInfo.processor({
      contactEmail: `<recipient@example.com>`,
      payerEmail: `<payer@example.com>`,
      paymentDetailsLink: `https://wirebill.example/payment-details?id=demo`,
    });
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Payment received`);
    expect(html).toContain(`&lt;recipient@example.com&gt;`);
    expect(html).toContain(`&lt;payer@example.com&gt;`);
    expect(html).not.toContain(`<strong><payer@example.com></strong>`);
    expect(html).toContain(`href="https://wirebill.example/payment-details?id=demo"`);
  });

  it(`wraps payment request with optional detail rows`, () => {
    const html = payment.paymentRequest.processor({
      payerEmail: `payer@example.com`,
      requesterEmail: `requester@example.com`,
      amount: `125.00`,
      currencyCode: `USD`,
      descriptionLine: ``,
      dueDateLine: ``,
      paymentRequestLink: `https://wirebill.example/payment-request?id=demo`,
    });
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Payment request`);
    expect(html).toContain(`125.00 USD`);
    expect(html).not.toContain(`Description</td>`);
    expect(html).not.toContain(`Due</td>`);
    expect(html).toContain(`href="https://wirebill.example/payment-request?id=demo"`);
  });

  it(`wraps payment refund`, () => {
    const html = payment.paymentRefund.processor({
      recipientEmail: `recipient@example.com`,
      summaryLine: `Payment refunded.`,
      amount: `125.00`,
      currencyCode: `USD`,
      reasonLine: `Reason: requested by payer`,
      paymentRequestLink: `https://wirebill.example/payment-request?id=demo`,
    });
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Payment refund`);
    expect(html).toContain(`href="https://wirebill.example/payment-request?id=demo"`);
  });

  it(`wraps payment chargeback`, () => {
    const html = payment.paymentChargeback.processor({
      recipientEmail: `recipient@example.com`,
      summaryLine: `Chargeback status updated.`,
      amount: `125.00`,
      currencyCode: `USD`,
      reasonLine: `Reason: bank dispute`,
      paymentRequestLink: `https://wirebill.example/payment-request?id=demo`,
    });
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Chargeback update`);
    expect(html).toContain(`href="https://wirebill.example/payment-request?id=demo"`);
  });
});
