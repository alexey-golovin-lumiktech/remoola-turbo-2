import { renderEmailLayout } from '../../shared/layout';
import { escapeAttr, escapeHtml } from '../../shared/sanitize';

export const processor = (params: { email: string; signupLink: string }): string => {
  const { email = ``, signupLink = `` } = params;

  const bodyHtml = `
    <div>Hello <strong>${escapeHtml(email)}</strong>.</div>
    <div style="margin-top:10px;">
      You’ve been invited to join Wirebill. Use the button below to create your account.
    </div>
    <div style="margin-top:10px;color:#9ca3af;">
      If the button doesn’t work, use this link:
      <a href="${escapeAttr(signupLink)}" style="color:#93c5fd;text-decoration:none;">Create account</a>
    </div>
  `.trim();

  return renderEmailLayout({
    preheader: `You’re invited to Wirebill`,
    title: `You’re invited`,
    lead: `Complete registration to get started.`,
    bodyHtml,
    cta: { href: signupLink, label: `Create account` },
  });
};
