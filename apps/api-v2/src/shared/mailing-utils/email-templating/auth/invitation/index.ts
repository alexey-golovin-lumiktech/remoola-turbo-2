const html = `
  <table style="padding: 20px;font-style: italic;background: #3f3f3f;color: cyan;border-radius: 20px;font-size:28px;">
    <tbody>
      <tr>
        <td>
          <div style="text-align:center; font-weight:bold;color:cyan;">Hello {{email}}.</div>
          <br/>
          <div style="color:cyan;">
            <div>We would like to invite you to a Wirebill system
              <br/>
              <a style="color:goldenrod" href="{{signupLink}}">Click here to register</a>
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
` as const;

const ReplacementsRegExpMapping = {
  email: new RegExp(`{{email}}`, `gi`),
  signupLink: new RegExp(`{{signupLink}}`, `gi`),
};

export const processor = (params: { email: string; signupLink: string }): string => {
  const { email = ``, signupLink = `` } = params;
  return html.replace(ReplacementsRegExpMapping.email, email).replace(ReplacementsRegExpMapping.signupLink, signupLink);
};
