/* eslint-disable max-len */
const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody><tr><td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Welcome to Wirebill.</div>
          <div>&nbsp;</div>
          <div style="color:cyan;">
            This account is configured to sign in with Google, so there is no password reset link to send.
          </div>
          <div>&nbsp;</div>
          <div style="color:cyan;">
            <a style="color:goldenrod" href="{{loginUrl}}">Continue to sign in</a> with Google. After you sign in, you can create a local password from Settings if you want both sign-in methods available.
          </div>
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

const replacements = {
  loginUrl: new RegExp(`{{loginUrl}}`, `gi`),
};

export const processor = (loginUrl: string) => html.replace(replacements.loginUrl, loginUrl);
