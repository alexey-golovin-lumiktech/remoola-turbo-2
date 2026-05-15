import { UnauthorizedException } from '@nestjs/common';
import { type TokenPayload } from 'google-auth-library';

import { type ConsumerGoogleProfileQuery } from './consumer-google-profile.query';
import { type ConsumerGoogleProfileRepository } from './consumer-google-profile.repository';
import { type ConsumerIdentityRepository } from './consumer-identity.repository';
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
  let consumerIdentityRepository: {
    findGoogleLoginCandidateByEmail: jest.Mock;
    updateGoogleLoginConsumer: jest.Mock;
    createGoogleLoginConsumer: jest.Mock;
    findGoogleLoginCandidateByEmailOrThrow: jest.Mock;
  };
  let googleProfileQuery: {
    findMetadataByConsumerId: jest.Mock;
  };
  let googleProfileRepository: {
    upsertProfile: jest.Mock;
  };
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

    consumerIdentityRepository = {
      findGoogleLoginCandidateByEmail: jest.fn().mockResolvedValue({
        id: `consumer-id`,
        email: `google@example.com`,
        verified: true,
        personalDetails: {
          firstName: `Ada`,
          lastName: `Lovelace`,
        },
      }),
      updateGoogleLoginConsumer: jest.fn().mockResolvedValue({
        id: `consumer-id`,
        email: `google@example.com`,
        verified: true,
        personalDetails: {
          firstName: `Ada`,
          lastName: `Lovelace`,
        },
      }),
      createGoogleLoginConsumer: jest.fn(),
      findGoogleLoginCandidateByEmailOrThrow: jest.fn(),
    };
    googleProfileQuery = {
      findMetadataByConsumerId: jest.fn().mockResolvedValue({
        metadata: { sub: `google-sub` },
      }),
    };
    googleProfileRepository = {
      upsertProfile: jest.fn().mockResolvedValue({}),
    };
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

    service = new GoogleOAuthService(
      consumerIdentityRepository as unknown as ConsumerIdentityRepository,
      googleProfileQuery as unknown as ConsumerGoogleProfileQuery,
      googleProfileRepository as unknown as ConsumerGoogleProfileRepository,
      ngrokIngress as NgrokIngressService,
    );
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

  it(`delegates Google login persistence through onboarding collaborators`, async () => {
    const payload = {
      sub: `google-sub`,
      email: `google@example.com`,
      email_verified: true,
      given_name: `Ada`,
      family_name: `Lovelace`,
      name: `Ada Lovelace`,
      picture: `https://example.com/avatar.png`,
      hd: `example.com`,
    } as TokenPayload;

    const consumer = await service.loginWithPayload(`google@example.com`, payload);

    expect(consumerIdentityRepository.findGoogleLoginCandidateByEmail).toHaveBeenCalledWith(`google@example.com`);
    expect(consumerIdentityRepository.updateGoogleLoginConsumer).toHaveBeenCalled();
    expect(googleProfileQuery.findMetadataByConsumerId).toHaveBeenCalledWith(`consumer-id`);
    expect(googleProfileRepository.upsertProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        consumerId: `consumer-id`,
        email: `google@example.com`,
        emailVerified: true,
        organization: `example.com`,
      }),
    );
    expect(consumer).toEqual(
      expect.objectContaining({
        id: `consumer-id`,
      }),
    );
  });

  it(`rejects Google login when stored profile sub mismatches incoming account`, async () => {
    googleProfileQuery.findMetadataByConsumerId.mockResolvedValue({
      metadata: { sub: `different-google-sub` },
    });

    await expect(
      service.loginWithPayload(`google@example.com`, {
        sub: `google-sub`,
        email: `google@example.com`,
        email_verified: true,
      } as TokenPayload),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(googleProfileRepository.upsertProfile).not.toHaveBeenCalled();
  });
});
