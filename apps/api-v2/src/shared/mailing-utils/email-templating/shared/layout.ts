import { escapeAttr, escapeHtml, safeHttpUrl } from './sanitize';

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
  pageBg: `#f8fafc`,
  containerBg: `#ffffff`,
  border: `#e2e8f0`,
  text: `#111827`,
  muted: `#475569`,
  brand: `#0f172a`,
  accent: `#f59e0b`,
  link: `#1d4ed8`,
} as const;

const FONT_STACK =
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, Helvetica, Arial, ` +
  `'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif`;

function resolveSafeHref(raw: string): string {
  return safeHttpUrl(raw) ?? `#`;
}

function renderButtonLink(params: EmailCta): string {
  const href = escapeAttr(resolveSafeHref(params.href));
  const label = escapeHtml(params.label);

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0 0 0;">
      <tbody>
        <tr>
          <td bgcolor="${COLORS.accent}" style="border-radius:12px;">
            <a href="${href}"
               style="
                 display:inline-block;
                 padding:14px 20px;
                 border-radius:12px;
                 background:${COLORS.accent};
                 color:#111827;
                 font-weight:700;
                 font-size:16px;
                 line-height:20px;
                 text-decoration:none;
               ">
              ${label}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  `.trim();
}

function renderTextLink(params: { href: string; label: string }): string {
  const href = escapeAttr(resolveSafeHref(params.href));
  const label = escapeHtml(params.label);
  return `
    <a href="${href}" style="color:${COLORS.link};font-weight:600;text-decoration:underline;">
      ${label}
    </a>
  `.trim();
}

export function renderFallbackLinkLine(params: { href: string; label: string; prefix?: string }): string {
  const prefix = escapeHtml(params.prefix ?? `If the button doesn’t work, use this link:`);
  return `
    <div style="margin-top:14px;color:${COLORS.muted};font-size:14px;line-height:20px;">
      ${prefix} ${renderTextLink({ href: params.href, label: params.label })}
    </div>
  `.trim();
}

export function renderKeyValueTable(rows: Array<{ label: string; value: string }>): string {
  const renderedRows = rows
    .map(({ label, value }) => {
      return `
        <tr>
          <td
            width="42%"
            style="padding:9px 0;color:${COLORS.muted};font-size:14px;line-height:20px;vertical-align:top;"
          >
            ${escapeHtml(label)}
          </td>
          <td
            width="58%"
            style="
              padding:9px 0;
              color:${COLORS.text};
              font-size:14px;
              line-height:20px;
              vertical-align:top;
              text-align:right;
              font-weight:600;
            "
          >
            ${escapeHtml(value)}
          </td>
        </tr>
      `.trim();
    })
    .join(`\n`);

  return `
    <table
      role="presentation"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      border="0"
      style="
        width:100%;
        border-top:1px solid ${COLORS.border};
        border-bottom:1px solid ${COLORS.border};
        margin-top:16px;
        border-collapse:collapse;
      "
    >
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
    ? `<div style="margin-top:12px;color:${COLORS.muted};font-size:13px;line-height:19px;">${footerNote}</div>`
    : ``;

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="x-apple-disable-message-reformatting">
        <title>${title}</title>
      </head>
      <body style="margin:0;padding:0;background:${COLORS.pageBg};">
        <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
          ${preheader}
        </div>

        <table
          data-wirebill-email="root"
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="width:100%;background:${COLORS.pageBg};margin:0;padding:0;"
        >
          <tbody>
            <tr>
              <td align="center" style="padding:28px 12px;">
                <table
                  role="presentation"
                  align="center"
                  width="600"
                  cellpadding="0"
                  cellspacing="0"
                  border="0"
                  style="
                    width:100%;
                    max-width:600px;
                    background:${COLORS.containerBg};
                    border:1px solid ${COLORS.border};
                    border-radius:16px;
                    overflow:hidden;
                  "
                >
              <tbody>
                <tr>
                  <td
                    style="
                      padding:20px 24px;
                      border-bottom:1px solid ${COLORS.border};
                      background:${COLORS.brand};
                    "
                  >
                    <div
                      style="
                        font-family:${FONT_STACK};
                        font-size:15px;
                        line-height:20px;
                        color:#ffffff;
                        font-weight:700;
                        letter-spacing:0.2px;
                      "
                    >
                      Wirebill
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:24px;">
                    <div style="font-family:${FONT_STACK};color:${COLORS.text};">
                      <h1
                        style="
                          margin:0;
                          color:${COLORS.text};
                          font-family:${FONT_STACK};
                          font-size:24px;
                          line-height:30px;
                          font-weight:800;
                        "
                      >
                        ${title}
                      </h1>
                      ${leadHtml}

                      <div style="margin-top:18px;color:${COLORS.text};font-size:16px;line-height:24px;">
                        ${params.bodyHtml}
                      </div>

                      ${ctaHtml}

                      <div
                        style="
                          margin-top:24px;
                          padding-top:16px;
                          border-top:1px solid ${COLORS.border};
                          color:${COLORS.muted};
                          font-size:13px;
                          line-height:19px;
                        "
                      >
                        If this email reached you by mistake, you can safely ignore it.
                        <div style="margin-top:6px;">
                          Need help?
                          <a
                            href="mailto:support@wirebill.com"
                            style="color:${COLORS.link};text-decoration:underline;"
                          >
                            support@wirebill.com
                          </a>
                        </div>
                        ${footerNoteHtml}
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
                </table>

                <div
                  style="
                    font-family:${FONT_STACK};
                    margin-top:12px;
                    color:${COLORS.muted};
                    font-size:12px;
                    line-height:18px;
                  "
                >
                  © ${new Date().getFullYear()} Wirebill
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `.trim();
}
