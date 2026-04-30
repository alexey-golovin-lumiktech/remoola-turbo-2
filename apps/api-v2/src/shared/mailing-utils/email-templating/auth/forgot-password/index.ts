import { renderEmailLayout, renderFallbackLinkLine } from '../../shared/layout';

export const processor = (forgotPasswordLink: string): string => {
  const href = forgotPasswordLink;

  const bodyHtml = `
    <div>We received a request to reset your Wirebill password.</div>
    ${renderFallbackLinkLine({ href, label: `Reset password` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Reset your password`,
    title: `Reset your password`,
    lead: `Use the button below to continue.`,
    bodyHtml,
    cta: { href, label: `Reset password` },
  });
};
