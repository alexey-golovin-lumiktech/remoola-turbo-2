const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody><tr><td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Welcome to Wirebill.</div>
          <div>&nbsp;</div>
          <div style="color:cyan;">You have initialized the signup flow with Google OAuth.</div>
          <div style="color:cyan;">Your temporary generated strong password: <strong>{{temporaryGeneratedStrongPassword}}</strong></div>
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

const RegExpToKeyMapping = { temporaryGeneratedStrongPassword: new RegExp(`{{temporaryGeneratedStrongPassword}}`, `gi`) }

export const processor = (temporaryGeneratedStrongPassword: string) => {
  return html.replace(RegExpToKeyMapping.temporaryGeneratedStrongPassword, temporaryGeneratedStrongPassword)
}
