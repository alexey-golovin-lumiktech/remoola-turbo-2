import * as auth from './auth';
import * as payment from './payment';

describe(`email templates common layout`, () => {
  it(`wraps auth signup-completion`, () => {
    const html = auth.signupCompletionToHtml.processor(`https://wirebill.example/confirm-email?token=demo`);
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Confirm your email`);
    expect(html).toContain(`href="https://wirebill.example/confirm-email?token=demo"`);
  });

  it(`wraps auth google-sign-in-recovery`, () => {
    const html = auth.googleSignInRecovery.processor(`https://wirebill.example/login`);
    expect(html).toContain(`data-wirebill-email="root"`);
    expect(html).toContain(`Continue to sign in`);
    expect(html).toContain(`href="https://wirebill.example/login"`);
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
