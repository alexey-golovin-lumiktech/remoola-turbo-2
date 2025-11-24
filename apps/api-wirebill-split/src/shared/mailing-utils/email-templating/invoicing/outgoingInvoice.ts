/* eslint-disable max-len */

import { $Enums } from '@remoola/database';

import { envs } from '../../../../envs';
import { formatCurrency } from '../../../../shared-common';

const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;">
    <tbody><tr><td>
          <div style="text-align:center; font-weight:bold;color:cyan;">New Invoice #{{invoiceId}}</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">From {{invoiceCreatorEmail}}</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">Amount due {{invoiceSubtotal}}</div>
          <div>&nbsp;</div>
          <div style="color:cyan;">You receive new invoice #{{invoiceId}}.<div style="color:cyan;">To&nbsp;see&nbsp;more&nbsp;details&nbsp;<a style="color:goldenrod" href="{{invoiceLink}}">Click here</a></div></div>
          <div>&nbsp;</div>
          <div style="margin-left:200px;text-align:right;color:cyan">
            If it was not you and the email came to you by mistake, just ignore it.
            <div style="color:cyan;">Best&nbsp;regards&nbsp;<a style="color:goldenrod" href="mailto:support@wirebill.com">support@wirebill.com</a>.
            </div>
          </div>
        </td></tr>
    </tbody>
  </table>
`;

const ReplacementsRegExpMapping = {
  InvoiceCreatorEmail: new RegExp(`{{invoiceCreatorEmail}}`, `gi`),
  InvoiceId: new RegExp(`{{invoiceId}}`, `gi`),
  InvoiceLink: new RegExp(`{{invoiceLink}}`, `gi`),
  InvoiceSubtotal: new RegExp(`{{invoiceSubtotal}}`, `gi`),
};

export const processor = (invoice: any /* CONSUMER.InvoiceResponse */) => {
  const backendBaseURL = envs.NEST_APP_EXTERNAL_ORIGIN; //@IMPORTANT_NOTE: should be changed in future
  const invoiceLink = new URL(`consumer/payment-choices`, backendBaseURL);
  invoiceLink.searchParams.append(`invoiceId`, invoice.id);
  invoiceLink.searchParams.append(`refererEmail`, invoice.referer);

  return html
    .replace(ReplacementsRegExpMapping.InvoiceCreatorEmail, invoice.creator)
    .replace(ReplacementsRegExpMapping.InvoiceId, invoice.id)
    .replace(ReplacementsRegExpMapping.InvoiceLink, invoiceLink.toString())
    .replace(ReplacementsRegExpMapping.InvoiceSubtotal, formatCurrency(invoice.subtotal, $Enums.CurrencyCode.USD));
};
