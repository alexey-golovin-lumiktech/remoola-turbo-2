import { renderEmailLayout } from '../../shared/layout';
import { escapeAttr } from '../../shared/sanitize';

export const processor = (forgotPasswordLink: string): string => {
  const href = forgotPasswordLink;

  const bodyHtml = `
    <div>We received a request to reset your Wirebill password.</div>
    <div style="margin-top:10px;color:#9ca3af;">
      If the button doesn’t work, use this link:
      <a href="${escapeAttr(href)}" style="color:#93c5fd;text-decoration:none;">Reset password</a>
    </div>
  `.trim();

  return renderEmailLayout({
    preheader: `Reset your password`,
    title: `Reset your password`,
    lead: `Use the button below to continue.`,
    bodyHtml,
    cta: { href, label: `Reset password` },
  });
};
