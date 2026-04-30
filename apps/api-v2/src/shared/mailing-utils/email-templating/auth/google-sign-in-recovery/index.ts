import { renderEmailLayout, renderFallbackLinkLine } from '../../shared/layout';
import { escapeAttr } from '../../shared/sanitize';

export const processor = (loginUrl: string): string => {
  const href = loginUrl;

  const bodyHtml = `
    <div>This account is configured to sign in with Google, so there is no password reset link to send.</div>
    <div style="margin-top:10px;">
      Continue to sign in with Google. After you sign in, you can create a local password from Settings if you want both sign-in methods available.
    </div>
    ${renderFallbackLinkLine({ href, label: `Continue to sign in` })}
  `.trim();

  return renderEmailLayout({
    preheader: `Continue to sign in with Google`,
    title: `Continue to sign in`,
    lead: `Use Google to access your account.`,
    bodyHtml,
    cta: { href, label: `Continue to sign in` },
  });
};
