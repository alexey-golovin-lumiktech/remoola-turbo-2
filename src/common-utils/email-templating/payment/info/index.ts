const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody>
      <tr>
        <td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Good news from Wirebill.</div>
          <div style="text-align:center; font-weight:bold;color:cyan;">Hello {{contactEmail}}.</div>
          <br/>
          <div style="color:cyan;">
            {{payerEmail}} made a payment in your name.
            <div>To get detailed information, please follow the link
              <br/>
              <a style="color:goldenrod" href="{{paymentDetailsLink}}">Click here to see the payment details</a>
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
` as const

const ReplacementsRegExpMapping = {
  contactEmail: new RegExp(`{{contactEmail}}`, `gi`),
  payerEmail: new RegExp(`{{payerEmail}}`, `gi`),
  paymentDetailsLink: new RegExp(`{{paymentDetailsLink}}`, `gi`),
} as const

export const processor = (params: { contactEmail: string; payerEmail: string; paymentDetailsLink: string }): string => {
  const { contactEmail = ``, payerEmail = ``, paymentDetailsLink = `` } = params
  return html
    .replace(ReplacementsRegExpMapping.contactEmail, contactEmail)
    .replace(ReplacementsRegExpMapping.payerEmail, payerEmail)
    .replace(ReplacementsRegExpMapping.paymentDetailsLink, paymentDetailsLink)
}
