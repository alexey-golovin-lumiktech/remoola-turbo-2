import { InternalServerErrorException } from '@nestjs/common';

import { GoogleAuthService } from './google-auth.service';
import { envs } from '../../envs';

type AuthUrlOptions = {
  state?: string;
  access_type?: string;
  scope?: string[];
  include_granted_scopes?: boolean;
  redirect_uri?: string;
};

describe(`GoogleAuthService`, () => {
  const initialExternalOrigin = envs.NEST_APP_EXTERNAL_ORIGIN;
  const initialPort = envs.PORT;

  afterEach(() => {
    (envs as { NEST_APP_EXTERNAL_ORIGIN: string }).NEST_APP_EXTERNAL_ORIGIN = initialExternalOrigin;
    (envs as { PORT: number }).PORT = initialPort;
  });

  it(`throws when oauth client is not initialized`, async () => {
    const service = new GoogleAuthService();

    await expect(service.googleOAuthNewWay({ href: `/login` })).rejects.toThrow(InternalServerErrorException);
  });

  it(`generates OAuth URL with stable openid/email/profile scope and trimmed external origin`, async () => {
    (envs as { NEST_APP_EXTERNAL_ORIGIN: string }).NEST_APP_EXTERNAL_ORIGIN = `https://api.remoola.test/api`;
    const service = new GoogleAuthService();

    const generateAuthUrl = jest.fn().mockReturnValue(`https://accounts.google.com/o/oauth2/v2/auth`);
    Object.assign(service as object, { googleapisOauth2Client: { generateAuthUrl } });

    const result = await service.googleOAuthNewWay({ href: `/dashboard` });

    expect(result).toEqual({ Location: `https://accounts.google.com/o/oauth2/v2/auth` });
    const options = generateAuthUrl.mock.calls[0][0] as AuthUrlOptions;
    expect(options.scope).toEqual([`openid`, `email`, `profile`]);
    expect(options.redirect_uri).toBe(`https://api.remoola.test/consumer/auth/google-redirect-new-way`);
    expect(options.access_type).toBe(`offline`);
    expect(options.include_granted_scopes).toBe(true);
  });

  it(`falls back to localhost origin when external origin placeholder is unset`, async () => {
    (envs as { NEST_APP_EXTERNAL_ORIGIN: string }).NEST_APP_EXTERNAL_ORIGIN = `NEST_APP_EXTERNAL_ORIGIN`;
    (envs as { PORT: number }).PORT = 4567;
    const service = new GoogleAuthService();

    const generateAuthUrl = jest.fn().mockReturnValue(`https://accounts.google.com/o/oauth2/v2/auth`);
    Object.assign(service as object, { googleapisOauth2Client: { generateAuthUrl } });

    await service.googleOAuthNewWay({ href: `/login` });

    const options = generateAuthUrl.mock.calls[0][0] as AuthUrlOptions;
    expect(options.redirect_uri).toBe(`http://localhost:4567/consumer/auth/google-redirect-new-way`);
  });
});
