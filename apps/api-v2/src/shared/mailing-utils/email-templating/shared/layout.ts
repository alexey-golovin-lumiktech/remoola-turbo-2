import { escapeAttr, escapeHtml } from './sanitize';

export type EmailCta = {
  href: string;
  label: string;
};

export type EmailLayoutParams = {
  /**
   * Hidden text shown as preview snippet in some email clients.
   * This must be plain text (will be escaped).
   */
  preheader?: string;
  /** Main headline shown in the email body (will be escaped). */
  title: string;
  /** Optional smaller lead text below the title (will be escaped). */
  lead?: string;
  /**
   * HTML body contents. Any dynamic values must be escaped by the caller.
   * This is intentionally raw HTML so complex emails (invoice tables) remain possible.
   */
  bodyHtml: string;
  /** Optional call-to-action button. */
  cta?: EmailCta;
  /** Optional footer note (will be escaped). */
  footerNote?: string;
};

const COLORS = {
  pageBg: `transparent`,
  containerBg: `#0f172a`,
  border: `#243047`,
  text: `#f3f4f6`,
  muted: `#cbd5e1`,
  accent: `#f59e0b`,
  link: `#60a5fa`,
} as const;

const FONT_STACK =
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, ` +
  `"Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`;

export function renderButtonLink(params: EmailCta): string {
  const href = escapeAttr(params.href);
  const label = escapeHtml(params.label);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0 0 0;">
      <tbody>
        <tr>
          <td bgcolor="${COLORS.accent}" style="border-radius: 10px;">
            <a href="${href}"
               style="display:inline-block;padding:12px 18px;border-radius:10px;background:${COLORS.accent};color:#111827;font-weight:700;font-size:16px;line-height:20px;text-decoration:none;">
              ${label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  `.trim();
}

export function renderTextLink(params: { href: string; label: string }): string {
  const href = escapeAttr(params.href);
  const label = escapeHtml(params.label);
  return `<a href="${href}" style="color:${COLORS.link};text-decoration:underline;">${label}</a>`;
}

export function renderFallbackLinkLine(params: { href: string; label: string; prefix?: string }): string {
  const prefix = escapeHtml(params.prefix ?? `If the button doesn’t work, use this link:`);
  return `
    <div style="margin-top:10px;color:${COLORS.muted};">
      ${prefix} ${renderTextLink({ href: params.href, label: params.label })}
    </div>
  `.trim();
}

export function renderKeyValueTable(rows: Array<{ label: string; value: string }>): string {
  const renderedRows = rows
    .map(({ label, value }) => {
      return `
        <tr>
          <td style="padding:6px 0;color:${COLORS.muted};font-size:13px;line-height:18px;vertical-align:top;">
            ${escapeHtml(label)}
          </td>
          <td style="padding:6px 0;color:${COLORS.text};font-size:13px;line-height:18px;vertical-align:top;text-align:right;">
            ${escapeHtml(value)}
          </td>
        </tr>
      `.trim();
    })
    .join(`\n`);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-top:1px solid ${COLORS.border};margin-top:14px;">
      <tbody>
        ${renderedRows}
      </tbody>
    </table>
  `.trim();
}

export function renderEmailLayout(params: EmailLayoutParams): string {
  const preheader = params.preheader ? escapeHtml(params.preheader) : ``;
  const title = escapeHtml(params.title);
  const lead = params.lead ? escapeHtml(params.lead) : ``;
  const footerNote = params.footerNote ? escapeHtml(params.footerNote) : ``;

  const ctaHtml = params.cta ? renderButtonLink(params.cta) : ``;
  const leadHtml = lead
    ? `<div style="margin-top:8px;color:${COLORS.muted};font-size:14px;line-height:20px;">${lead}</div>`
    : ``;
  const footerNoteHtml = footerNote
    ? `<div style="margin-top:12px;color:${COLORS.muted};font-size:12px;line-height:18px;">${footerNote}</div>`
    : ``;

  return `
    <table data-wirebill-email="root" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background:${COLORS.pageBg};margin:0;padding:0;">
      <tbody>
        <tr>
          <td align="center" style="padding: 28px 12px;">
            <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
              ${preheader}
            </div>

            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${COLORS.containerBg};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
              <tbody>
                <tr>
                  <td style="padding: 18px 20px;border-bottom:1px solid ${COLORS.border};">
                    <div style="font-family:${FONT_STACK};font-size:14px;line-height:18px;color:${COLORS.muted};letter-spacing:0.2px;">
                      Wirebill
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 18px 20px 20px 20px;">
                    <div style="font-family:${FONT_STACK};color:${COLORS.text};">
                      <div style="font-size:20px;line-height:26px;font-weight:800;margin:0;">
                        ${title}
                      </div>
                      ${leadHtml}

                      <div style="margin-top:16px;font-size:15px;line-height:22px;">
                        ${params.bodyHtml}
                      </div>

                      ${ctaHtml}

                      <div style="margin-top: 20px;padding-top: 14px;border-top:1px solid ${COLORS.border};color:${COLORS.muted};font-size:12px;line-height:18px;">
                        If this email reached you by mistake, you can safely ignore it.
                        <div style="margin-top:6px;">
                          Need help? <a href="mailto:support@wirebill.com" style="color:${COLORS.link};text-decoration:underline;">support@wirebill.com</a>
                        </div>
                        ${footerNoteHtml}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style="font-family:${FONT_STACK};margin-top:10px;color:${COLORS.muted};font-size:11px;line-height:16px;">
              © ${new Date().getFullYear()} Wirebill
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `.trim();
}
