import { type TokenPayload } from 'google-auth-library';

import { GoogleOAuthService } from './google-oauth.service';
import { envs } from '../../envs';
import { type NgrokIngressService } from '../../infrastructure/ngrok/ngrok-ingress.service';

const mockGenerateAuthUrl = jest.fn((options: { redirect_uri: string }) => {
  const url = new URL(`https://accounts.google.com/o/oauth2/v2/auth`);
  url.searchParams.set(`redirect_uri`, options.redirect_uri);
  return url.toString();
});

const mockGetToken = jest.fn();
const mockVerifyIdToken = jest.fn();

jest.mock(`google-auth-library`, () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    generateAuthUrl: mockGenerateAuthUrl,
    getToken: mockGetToken,
    verifyIdToken: mockVerifyIdToken,
  })),
}));

describe(`GoogleOAuthService`, () => {
  let service: GoogleOAuthService;
  let ngrokIngress: Pick<NgrokIngressService, `getListenerUrl`>;
  let originalEnvs: Pick<
    typeof envs,
    `GOOGLE_CLIENT_ID` | `GOOGLE_CLIENT_SECRET` | `NEST_APP_EXTERNAL_ORIGIN` | `NGROK_OAUTH_REDIRECT_ENABLED`
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnvs = {
      GOOGLE_CLIENT_ID: envs.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: envs.GOOGLE_CLIENT_SECRET,
      NEST_APP_EXTERNAL_ORIGIN: envs.NEST_APP_EXTERNAL_ORIGIN,
      NGROK_OAUTH_REDIRECT_ENABLED: envs.NGROK_OAUTH_REDIRECT_ENABLED,
    };

    envs.GOOGLE_CLIENT_ID = `google-client-id`;
    envs.GOOGLE_CLIENT_SECRET = `google-client-secret`;
    envs.NEST_APP_EXTERNAL_ORIGIN = `http://localhost:3334/api`;
    envs.NGROK_OAUTH_REDIRECT_ENABLED = false;

    ngrokIngress = {
      getListenerUrl: jest.fn().mockReturnValue(`https://example.ngrok-free.app`),
    };

    mockGetToken.mockResolvedValue({ tokens: { id_token: `google-id-token` } });
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () =>
        ({
          sub: `google-sub`,
          nonce: `oauth-nonce`,
        }) satisfies Partial<TokenPayload>,
    });

    service = new GoogleOAuthService({} as any, ngrokIngress as NgrokIngressService);
  });

  afterEach(() => {
    Object.assign(envs, originalEnvs);
  });

  it(`uses NEST_APP_EXTERNAL_ORIGIN by default even when ngrok listener exists`, () => {
    const authUrl = service.buildAuthorizationUrl(`state-token`, `code-challenge`, `oauth-nonce`);

    expect(new URL(authUrl).searchParams.get(`redirect_uri`)).toBe(
      `http://localhost:3334/api/consumer/auth/google/callback`,
    );
    expect(ngrokIngress.getListenerUrl).not.toHaveBeenCalled();
  });

  it(`uses active ngrok listener URL only when explicit opt-in is enabled`, () => {
    envs.NGROK_OAUTH_REDIRECT_ENABLED = true;

    const authUrl = service.buildAuthorizationUrl(`state-token`, `code-challenge`, `oauth-nonce`);

    expect(new URL(authUrl).searchParams.get(`redirect_uri`)).toBe(
      `https://example.ngrok-free.app/consumer/auth/google/callback`,
    );
    expect(ngrokIngress.getListenerUrl).toHaveBeenCalled();
  });

  it(`falls back to NEST_APP_EXTERNAL_ORIGIN when opt-in is enabled but listener is inactive`, async () => {
    envs.NGROK_OAUTH_REDIRECT_ENABLED = true;
    (ngrokIngress.getListenerUrl as jest.Mock).mockReturnValue(null);

    await service.exchangeCodeForPayload(`oauth-code`, `code-verifier`, `oauth-nonce`);

    expect(mockGetToken).toHaveBeenCalledWith({
      code: `oauth-code`,
      codeVerifier: `code-verifier`,
      redirect_uri: `http://localhost:3334/api/consumer/auth/google/callback`,
    });
  });
});
