import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';
import { $Enums } from '@remoola/database-2';

import { type GoogleSignupPayload } from './auth.service';
import { type ConsumerIdentityRepository } from './identity/consumer-identity.repository';
import { type ConsumerGoogleProfileRepository } from './oauth/consumer-google-profile.repository';
import { ConsumerAuthSignupService } from './signup/consumer-auth-signup.service';

describe(`ConsumerAuthService.signup (Google session)`, () => {
  const createsVerifiedGoogleConsumerTestName = [
    `creates a verified consumer and upserts Google profile metadata`,
    `when Google signup payload is present`,
  ].join(` `);

  let service: ConsumerAuthSignupService;
  let consumerIdentityRepository: {
    findSignupCollisionByEmail: jest.Mock;
    createSignupConsumer: jest.Mock;
  };
  let googleProfileRepository: {
    upsertProfile: jest.Mock;
  };

  const googlePayload = (email: string): GoogleSignupPayload => ({
    type: `google_signup`,
    email,
    emailVerified: true,
    name: null,
    givenName: `Ada`,
    familyName: `Lovelace`,
    picture: null,
    organization: null,
    sub: `google-sub`,
    signupEntryPath: `/signup/start`,
    nextPath: `/dashboard`,
    accountType: null,
    contractorKind: null,
    appScope: CURRENT_CONSUMER_APP_SCOPE,
  });

  beforeEach(() => {
    consumerIdentityRepository = {
      findSignupCollisionByEmail: jest.fn().mockResolvedValue(null),
      createSignupConsumer: jest.fn().mockResolvedValue({
        id: `new-consumer-id`,
        email: `g@example.com`,
        verified: true,
        accountType: $Enums.AccountType.BUSINESS,
      }),
    };
    googleProfileRepository = {
      upsertProfile: jest.fn().mockResolvedValue({}),
    };

    service = new ConsumerAuthSignupService(
      consumerIdentityRepository as unknown as ConsumerIdentityRepository,
      googleProfileRepository as unknown as ConsumerGoogleProfileRepository,
    );
  });

  it(createsVerifiedGoogleConsumerTestName, async () => {
    const dto = {
      email: `g@example.com`,
      accountType: $Enums.AccountType.BUSINESS,
      howDidHearAboutUs: null,
      howDidHearAboutUsOther: null,
      addressDetails: { postalCode: `12345`, country: `US` },
      organizationDetails: {
        name: `Acme`,
        consumerRole: `owner`,
        size: $Enums.OrganizationSize.SMALL,
      },
    };

    const gp = googlePayload(`g@example.com`);
    const consumer = await service.signup(dto as any, gp);

    expect(consumer.verified).toBe(true);
    expect(consumerIdentityRepository.createSignupConsumer).toHaveBeenCalledWith(
      expect.objectContaining({
        email: `g@example.com`,
        verified: true,
      }),
    );
    const createData = consumerIdentityRepository.createSignupConsumer.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(createData).not.toHaveProperty(`password`);
    expect(createData).not.toHaveProperty(`salt`);
    expect(googleProfileRepository.upsertProfile).toHaveBeenCalled();
  });
});
