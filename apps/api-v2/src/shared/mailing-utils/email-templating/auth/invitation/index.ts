import { renderEmailLayout, renderFallbackLinkLine } from '../../shared/layout';
import { escapeHtml } from '../../shared/sanitize';

export const processor = (params: { email: string; signupLink: string }): string => {
  const { email = ``, signupLink = `` } = params;

  const bodyHtml = `
    <div>Hello <strong>${escapeHtml(email)}</strong>.</div>
    <div style="margin-top:10px;">
      You’ve been invited to join Wirebill. Use the button below to create your account.
    </div>
    ${renderFallbackLinkLine({ href: signupLink, label: `Create account` })}
  `.trim();

  return renderEmailLayout({
    preheader: `You’re invited to Wirebill`,
    title: `You’re invited`,
    lead: `Complete registration to get started.`,
    bodyHtml,
    cta: { href: signupLink, label: `Create account` },
  });
};
