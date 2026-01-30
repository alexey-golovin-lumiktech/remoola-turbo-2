const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody>
      <tr>
        <td>
          <div style="text-align:center; font-weight:bold;color:cyan;">You received a payment request on Wirebill.</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">Hello {{payerEmail}}.</div>
          <br/>
          <div style="color:cyan;">
            {{requesterEmail}} requested {{amount}} {{currencyCode}} from you.
            <div>{{descriptionLine}}</div>
            <div>{{dueDateLine}}</div>
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
  payerEmail: new RegExp(`{{payerEmail}}`, `gi`),
  requesterEmail: new RegExp(`{{requesterEmail}}`, `gi`),
  amount: new RegExp(`{{amount}}`, `gi`),
  currencyCode: new RegExp(`{{currencyCode}}`, `gi`),
  descriptionLine: new RegExp(`{{descriptionLine}}`, `gi`),
  dueDateLine: new RegExp(`{{dueDateLine}}`, `gi`),
  paymentRequestLink: new RegExp(`{{paymentRequestLink}}`, `gi`),
} as const;

export const processor = (params: {
  payerEmail: string;
  requesterEmail: string;
  amount: string;
  currencyCode: string;
  descriptionLine: string;
  dueDateLine: string;
  paymentRequestLink: string;
}): string => {
  const {
    payerEmail = ``,
    requesterEmail = ``,
    amount = ``,
    currencyCode = ``,
    descriptionLine = ``,
    dueDateLine = ``,
    paymentRequestLink = ``,
  } = params;

  return html
    .replace(ReplacementsRegExpMapping.payerEmail, payerEmail)
    .replace(ReplacementsRegExpMapping.requesterEmail, requesterEmail)
    .replace(ReplacementsRegExpMapping.amount, amount)
    .replace(ReplacementsRegExpMapping.currencyCode, currencyCode)
    .replace(ReplacementsRegExpMapping.descriptionLine, descriptionLine)
    .replace(ReplacementsRegExpMapping.dueDateLine, dueDateLine)
    .replace(ReplacementsRegExpMapping.paymentRequestLink, paymentRequestLink);
};
