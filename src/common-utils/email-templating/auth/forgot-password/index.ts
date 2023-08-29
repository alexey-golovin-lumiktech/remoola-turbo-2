const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody><tr><td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Welcome to Wirebill.</div>
          <div>&nbsp;</div>
          <div style="color:cyan;">You have initialized the password reset flow.<div>To&nbsp;continue&nbsp;<a style="color:goldenrod" href="{{forgotPasswordLink}}">Click here to continue</a></div></div>
          <div>&nbsp;</div>
          <div style="margin-left:200px;text-align:right;color:cyan">
            If it was not you and the email came to you by mistake, just ignore it.
            <div style="color:cyan;">Best&nbsp;regards&nbsp;<a style="color:goldenrod" href="mailto:support@wirebill.com">support@wirebill.com</a>.
            </div>
          </div>
        </td></tr>
    </tbody>
  </table>
`

const RegExpToKeyMapping = { forgotPasswordLink: new RegExp(`{{forgotPasswordLink}}`, `gi`) }

export const processor = (forgotPasswordLink: string) => html.replace(RegExpToKeyMapping.forgotPasswordLink, forgotPasswordLink)
