import { renderEmailLayout, renderFallbackLinkLine } from '../../shared/layout';
import { escapeAttr } from '../../shared/sanitize';

export const processor = (emailConfirmationLink: string): string => {
  const href = emailConfirmationLink;

  const bodyHtml = `
    <div>Thanks for signing up. Please confirm your email to finish creating your account.</div>
    ${renderFallbackLinkLine({ href, label: `Confirm email` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Confirm your email`,
    title: `Confirm your email`,
    lead: `One step left to activate your account.`,
    bodyHtml,
    cta: { href, label: `Confirm email` },
  });
};
