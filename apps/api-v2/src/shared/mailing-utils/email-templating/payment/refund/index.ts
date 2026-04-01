const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody>
      <tr>
        <td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Wirebill payment refund</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">Hello {{recipientEmail}}.</div>
          <br/>
          <div style="color:cyan;">
            {{summaryLine}}
            <div>Amount: {{amount}} {{currencyCode}}</div>
            <div>{{reasonLine}}</div>
            <div>
              <a style="color:goldenrod" href="{{paymentRequestLink}}">View payment request</a>
            </div>
          </div>
          <br/>
          <div style="margin-left:200px;text-align:right;color:cyan">
            If the email came to you by mistake, just ignore it.
            <div style="color:cyan;">Best regards
              <a style="color:goldenrod" href="mailto:support@wirebill.com">support@wirebill.com</a>.
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
`;

const ReplacementsRegExpMapping = {
  recipientEmail: new RegExp(`{{recipientEmail}}`, `gi`),
  summaryLine: new RegExp(`{{summaryLine}}`, `gi`),
  amount: new RegExp(`{{amount}}`, `gi`),
  currencyCode: new RegExp(`{{currencyCode}}`, `gi`),
  reasonLine: new RegExp(`{{reasonLine}}`, `gi`),
  paymentRequestLink: new RegExp(`{{paymentRequestLink}}`, `gi`),
} as const;

export const processor = (params: {
  recipientEmail: string;
  summaryLine: string;
  amount: string;
  currencyCode: string;
  reasonLine: string;
  paymentRequestLink: string;
}): string => {
  const {
    recipientEmail = ``,
    summaryLine = ``,
    amount = ``,
    currencyCode = ``,
    reasonLine = ``,
    paymentRequestLink = ``,
  } = params;

  return html
    .replace(ReplacementsRegExpMapping.recipientEmail, recipientEmail)
    .replace(ReplacementsRegExpMapping.summaryLine, summaryLine)
    .replace(ReplacementsRegExpMapping.amount, amount)
    .replace(ReplacementsRegExpMapping.currencyCode, currencyCode)
    .replace(ReplacementsRegExpMapping.reasonLine, reasonLine)
    .replace(ReplacementsRegExpMapping.paymentRequestLink, paymentRequestLink);
};
