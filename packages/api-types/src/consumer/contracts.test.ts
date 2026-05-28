import { describe, expect, it } from '@jest/globals';

import {
  consumerAuthLogoutResponseSchema,
  consumerCancelledScheduledConversionResponseSchema,
  consumerContactDetailsResponseSchema,
  consumerContactsResponseSchema,
  consumerContractDetailsResponseSchema,
  consumerContractsResponseSchema,
  consumerCreatePaymentRequestResponseSchema,
  consumerDashboardDataSchema,
  consumerDeletedExchangeRuleResponseSchema,
  consumerDocumentsResponseSchema,
  consumerDocumentsUploadResponseSchema,
  consumerExchangeConversionResponseSchema,
  consumerExchangeCurrenciesResponseSchema,
  consumerExchangeQuoteResponseSchema,
  consumerExchangeRatesBatchResponseSchema,
  consumerExchangeRulesResponseSchema,
  consumerForgotPasswordResponseSchema,
  consumerGoogleSignupSessionResponseSchema,
  consumerInvoiceGenerationResponseSchema,
  consumerLoginResponseSchema,
  consumerOAuthCompleteResponseSchema,
  consumerPasswordChangeResponseSchema,
  consumerPayWithSavedMethodResponseSchema,
  consumerPaymentHistoryResponseSchema,
  consumerPaymentMethodsResponseSchema,
  consumerPaymentsResponseSchema,
  consumerPaymentViewResponseSchema,
  consumerPreferredCurrencySettingsResponseSchema,
  consumerProfileResponseSchema,
  consumerScheduledConversionsResponseSchema,
  consumerSettingsResponseSchema,
  consumerSignupResponseSchema,
  consumerStartPaymentResponseSchema,
  consumerStripeCheckoutSessionResponseSchema,
  consumerStripeSetupIntentResponseSchema,
  consumerSuccessResponseSchema,
  consumerThemeSettingsResponseSchema,
  consumerTransferResponseSchema,
  consumerVerificationSessionResponseSchema,
} from '.';

describe(`consumer shared contracts`, () => {
  it(`keeps dashboard wire contract separate from frontend-derived fields`, () => {
    const parsed = consumerDashboardDataSchema.parse({
      summary: {
        balanceCents: 10500,
        balanceCurrencyCode: `USD`,
        availableBalanceCents: 10000,
        availableBalanceCurrencyCode: `USD`,
        activeRequests: 2,
        lastPaymentAt: `2026-05-27T10:00:00.000Z`,
      },
      pendingRequests: [
        {
          id: `pending-1`,
          counterpartyName: `Acme LLC`,
          amount: 120.5,
          currencyCode: `USD`,
          status: `PENDING`,
          lastActivityAt: `2026-05-27T09:00:00.000Z`,
        },
      ],
      activity: [
        {
          id: `activity-1`,
          label: `Payment received`,
          description: `Invoice paid`,
          createdAt: `2026-05-27T08:00:00.000Z`,
          kind: `payment`,
        },
      ],
      tasks: [{ id: `task-1`, label: `Complete profile`, completed: false }],
      quickDocs: [{ id: `doc-1`, name: `Invoice.pdf`, createdAt: `2026-05-26T12:00:00.000Z` }],
      verification: {
        effectiveVerified: false,
        profileComplete: true,
        status: `pending`,
        canStart: true,
        legalVerified: false,
        reviewStatus: `pending`,
        stripeStatus: `requires_input`,
        sessionId: null,
        lastErrorCode: null,
        lastErrorReason: null,
        startedAt: null,
        updatedAt: `2026-05-27T11:00:00.000Z`,
        verifiedAt: null,
      },
      pendingWithdrawals: {
        items: [],
        total: 0,
      },
    });

    expect(parsed).not.toHaveProperty(`pendingWithdrawals`);
  });

  it(`runtime-validates representative consumer read contracts`, () => {
    const schemaCases = [
      {
        name: `payments list`,
        schema: consumerPaymentsResponseSchema,
        valid: {
          items: [
            {
              id: `payment-1`,
              amount: 150.25,
              currencyCode: `USD`,
              status: `PENDING`,
              role: `payer`,
              type: `invoice`,
              description: `April invoice`,
              createdAt: `2026-05-27T09:00:00.000Z`,
              latestTransaction: {
                id: `txn-1`,
                status: `settled`,
                createdAt: `2026-05-27T09:05:00.000Z`,
              },
              counterparty: {
                id: `contact-1`,
                email: `billing@example.com`,
              },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        invalid: {
          items: [
            {
              id: `payment-1`,
              amount: `150.25`,
              currencyCode: `USD`,
              status: `PENDING`,
              role: `payer`,
              createdAt: `2026-05-27T09:00:00.000Z`,
              counterparty: {
                id: `contact-1`,
                email: `billing@example.com`,
              },
            },
          ],
          total: 1,
        },
      },
      {
        name: `payment view`,
        schema: consumerPaymentViewResponseSchema,
        valid: {
          id: `payment-1`,
          amount: 150.25,
          currencyCode: `USD`,
          status: `PENDING`,
          description: `April invoice`,
          dueDate: `2026-06-01T00:00:00.000Z`,
          sentDate: `2026-05-27T09:00:00.000Z`,
          createdAt: `2026-05-27T09:00:00.000Z`,
          updatedAt: `2026-05-27T09:05:00.000Z`,
          role: `payer`,
          payer: { id: `payer-1`, email: `payer@example.com` },
          requester: { id: `requester-1`, email: `requester@example.com` },
          ledgerEntries: [
            {
              id: `entry-1`,
              ledgerId: `ledger-1`,
              currencyCode: `USD`,
              amount: 150.25,
              direction: `INCOME`,
              status: `PENDING`,
              type: `PAYMENT`,
              createdAt: `2026-05-27T09:05:00.000Z`,
              rail: `manual`,
              counterpartyId: `contact-1`,
            },
          ],
          attachments: [
            {
              id: `doc-1`,
              name: `Invoice.pdf`,
              downloadUrl: `/api/documents/doc-1/download`,
              size: 2048,
              createdAt: `2026-05-27T09:05:00.000Z`,
            },
          ],
        },
        invalid: {
          id: `payment-1`,
          amount: 150.25,
          currencyCode: `USD`,
          status: `PENDING`,
          createdAt: `2026-05-27T09:00:00.000Z`,
          updatedAt: `2026-05-27T09:05:00.000Z`,
          role: `payer`,
          payer: null,
          requester: null,
          ledgerEntries: [
            {
              id: `entry-1`,
              ledgerId: `ledger-1`,
              currencyCode: `USD`,
              amount: `150.25`,
              direction: `INCOME`,
              status: `PENDING`,
              type: `PAYMENT`,
              createdAt: `2026-05-27T09:05:00.000Z`,
            },
          ],
          attachments: [],
        },
      },
      {
        name: `payment history`,
        schema: consumerPaymentHistoryResponseSchema,
        valid: {
          items: [
            {
              id: `history-1`,
              ledgerId: `ledger-1`,
              type: `USER_PAYOUT`,
              status: `PENDING`,
              currencyCode: `USD`,
              amount: -99.5,
              direction: `OUTCOME`,
              createdAt: `2026-05-27T10:00:00.000Z`,
              rail: `manual`,
              paymentMethodId: `pm-1`,
              paymentMethodLabel: `Bank account`,
              paymentRequestId: null,
            },
          ],
          total: 1,
          limit: 5,
          offset: 0,
        },
        invalid: {
          items: [
            {
              id: `history-1`,
              ledgerId: `ledger-1`,
              type: `USER_PAYOUT`,
              status: `PENDING`,
              currencyCode: `USD`,
              amount: -99.5,
              direction: `OUTCOME`,
              createdAt: `2026-05-27T10:00:00.000Z`,
              rail: `manual`,
              paymentMethodId: `pm-1`,
              paymentMethodLabel: `Bank account`,
              paymentRequestId: null,
            },
          ],
          total: `1`,
        },
      },
      {
        name: `contracts list`,
        schema: consumerContractsResponseSchema,
        valid: {
          items: [
            {
              id: `contract-1`,
              name: `Acme LLC`,
              email: `ops@acme.test`,
              lastRequestId: `payment-1`,
              lastStatus: `PAID`,
              lastActivity: `2026-05-27T11:00:00.000Z`,
              docs: 3,
              paymentsCount: 5,
              completedPaymentsCount: 4,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
        invalid: {
          items: [
            {
              id: `contract-1`,
              name: `Acme LLC`,
              email: `ops@acme.test`,
              lastRequestId: `payment-1`,
              lastStatus: `PAID`,
              lastActivity: `2026-05-27T11:00:00.000Z`,
              docs: `3`,
              paymentsCount: 5,
              completedPaymentsCount: 4,
            },
          ],
          total: 1,
        },
      },
      {
        name: `contract details`,
        schema: consumerContractDetailsResponseSchema,
        valid: {
          id: `contract-1`,
          name: `Acme LLC`,
          email: `ops@acme.test`,
          address: null,
          updatedAt: `2026-05-27T11:00:00.000Z`,
          summary: {
            lastStatus: `PAID`,
            lastActivity: `2026-05-27T11:00:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 3,
            paymentsCount: 5,
            completedPaymentsCount: 4,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: `150.25`,
              status: `PAID`,
              createdAt: `2026-05-27T09:00:00.000Z`,
              updatedAt: `2026-05-27T11:00:00.000Z`,
              role: `payer`,
              paymentRail: `manual`,
            },
          ],
          documents: [
            {
              id: `doc-1`,
              name: `Invoice.pdf`,
              downloadUrl: `/api/documents/doc-1/download`,
              createdAt: `2026-05-27T11:00:00.000Z`,
              tags: [`invoice`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-1`],
            },
          ],
        },
        invalid: {
          id: `contract-1`,
          name: `Acme LLC`,
          email: `ops@acme.test`,
          address: null,
          updatedAt: `2026-05-27T11:00:00.000Z`,
          summary: {
            lastStatus: `PAID`,
            lastActivity: `2026-05-27T11:00:00.000Z`,
            lastRequestId: `payment-1`,
            documentsCount: 3,
            paymentsCount: 5,
            completedPaymentsCount: 4,
            draftPaymentsCount: 1,
            pendingPaymentsCount: 0,
            waitingPaymentsCount: 0,
          },
          payments: [
            {
              id: `payment-1`,
              amount: 150.25,
              status: `PAID`,
              createdAt: `2026-05-27T09:00:00.000Z`,
              updatedAt: `2026-05-27T11:00:00.000Z`,
              role: `payer`,
              paymentRail: `manual`,
            },
          ],
          documents: [],
        },
      },
      {
        name: `contacts list`,
        schema: consumerContactsResponseSchema,
        valid: {
          items: [
            {
              id: `contact-1`,
              name: `Jane Doe`,
              email: `jane@example.com`,
              address: {
                street: `Main st`,
                city: `Riga`,
                state: null,
                postalCode: `LV-1010`,
                country: `LV`,
              },
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        invalid: {
          items: [
            {
              id: `contact-1`,
              name: `Jane Doe`,
              email: `jane@example.com`,
              address: `Main st`,
            },
          ],
          total: 1,
        },
      },
      {
        name: `contact details`,
        schema: consumerContactDetailsResponseSchema,
        valid: {
          id: `contact-1`,
          name: `Jane Doe`,
          email: `jane@example.com`,
          address: null,
          paymentRequests: [
            {
              id: `payment-1`,
              amount: `99.50`,
              status: `PENDING`,
              createdAt: `2026-05-27T09:00:00.000Z`,
            },
          ],
          documents: [
            {
              id: `doc-1`,
              name: `Passport.pdf`,
              downloadUrl: `/api/documents/doc-1/download`,
              createdAt: `2026-05-27T09:00:00.000Z`,
            },
          ],
        },
        invalid: {
          id: `contact-1`,
          name: `Jane Doe`,
          email: `jane@example.com`,
          address: null,
          paymentRequests: [
            {
              id: `payment-1`,
              amount: 99.5,
              status: `PENDING`,
              createdAt: `2026-05-27T09:00:00.000Z`,
            },
          ],
          documents: [],
        },
      },
      {
        name: `documents list`,
        schema: consumerDocumentsResponseSchema,
        valid: {
          items: [
            {
              id: `doc-1`,
              name: `Contract.pdf`,
              size: 4096,
              createdAt: `2026-05-27T09:00:00.000Z`,
              downloadUrl: `/api/documents/doc-1/download`,
              mimetype: `application/pdf`,
              kind: `contract`,
              tags: [`signed`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-1`],
            },
          ],
          total: 1,
          page: 1,
          pageSize: 20,
        },
        invalid: {
          items: [
            {
              id: `doc-1`,
              name: `Contract.pdf`,
              size: `4096`,
              createdAt: `2026-05-27T09:00:00.000Z`,
              downloadUrl: `/api/documents/doc-1/download`,
              mimetype: `application/pdf`,
              kind: `contract`,
              tags: [`signed`],
              isAttachedToDraftPaymentRequest: false,
              attachedDraftPaymentRequestIds: [],
              isAttachedToNonDraftPaymentRequest: true,
              attachedNonDraftPaymentRequestIds: [`payment-1`],
            },
          ],
          total: 1,
        },
      },
      {
        name: `payment methods`,
        schema: consumerPaymentMethodsResponseSchema,
        valid: {
          items: [
            {
              id: `pm-1`,
              type: `stripe`,
              brand: `visa`,
              last4: `4242`,
              expMonth: `12`,
              expYear: `2030`,
              defaultSelected: true,
              reusableForPayerPayments: true,
              billingDetails: {
                id: `billing-1`,
                email: `payer@example.com`,
                name: `Jane Doe`,
                phone: `+37120000000`,
              },
            },
          ],
        },
        invalid: {
          items: [
            {
              id: `pm-1`,
              type: `stripe`,
              brand: `visa`,
              last4: 4242,
              expMonth: `12`,
              expYear: `2030`,
              defaultSelected: true,
              reusableForPayerPayments: true,
              billingDetails: null,
            },
          ],
        },
      },
      {
        name: `profile`,
        schema: consumerProfileResponseSchema,
        valid: {
          id: `consumer-1`,
          accountType: `individual`,
          contractorKind: `freelancer`,
          howDidHearAboutUs: `google`,
          hasPassword: true,
          personalDetails: {
            firstName: `Jane`,
            lastName: `Doe`,
            citizenOf: `LV`,
            taxId: `123456`,
            phoneNumber: `+37120000000`,
          },
          addressDetails: {
            country: `LV`,
            city: `Riga`,
            street: `Main st`,
            postalCode: `LV-1010`,
            state: null,
          },
          organizationDetails: null,
          verification: {
            effectiveVerified: false,
            profileComplete: true,
            status: `pending`,
            canStart: true,
            legalVerified: false,
            reviewStatus: `pending`,
            stripeStatus: `requires_input`,
            sessionId: null,
            lastErrorCode: null,
            lastErrorReason: null,
            startedAt: null,
            updatedAt: `2026-05-27T11:00:00.000Z`,
            verifiedAt: null,
          },
        },
        invalid: {
          id: `consumer-1`,
          accountType: `individual`,
          hasPassword: `true`,
        },
      },
      {
        name: `settings`,
        schema: consumerSettingsResponseSchema,
        valid: {
          theme: `light`,
          preferredCurrency: `USD`,
        },
        invalid: {
          theme: true,
          preferredCurrency: `USD`,
        },
      },
    ] as const;

    for (const schemaCase of schemaCases) {
      expect(schemaCase.schema.safeParse(schemaCase.valid).success).toBe(true);
      expect(schemaCase.schema.safeParse(schemaCase.invalid).success).toBe(false);
    }
  });

  it(`runtime-validates raw exchange contracts without frontend normalization`, () => {
    const schemaCases = [
      {
        name: `exchange currencies`,
        schema: consumerExchangeCurrenciesResponseSchema,
        valid: [{ code: `USD`, symbol: `$`, name: `US Dollar` }],
        invalid: [{ code: `USD`, symbol: 1 }],
      },
      {
        name: `exchange rates batch`,
        schema: consumerExchangeRatesBatchResponseSchema,
        valid: {
          data: [
            { from: `USD`, to: `EUR`, rate: 0.92 },
            { from: `EUR`, to: `USD`, code: `RATE_STALE` },
          ],
        },
        invalid: {
          data: [{ from: `USD`, to: `EUR`, rate: `0.92` }],
        },
      },
      {
        name: `exchange rules`,
        schema: consumerExchangeRulesResponseSchema,
        valid: {
          items: [
            {
              id: `rule-1`,
              fromCurrency: `USD`,
              toCurrency: `EUR`,
              targetBalance: 500,
              maxConvertAmount: null,
              minIntervalMinutes: 60,
              enabled: true,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
        invalid: {
          items: [
            {
              id: `rule-1`,
              fromCurrency: `USD`,
              toCurrency: `EUR`,
              targetBalance: `500`,
              maxConvertAmount: null,
              minIntervalMinutes: 60,
              enabled: true,
            },
          ],
          total: 1,
        },
      },
      {
        name: `scheduled conversions`,
        schema: consumerScheduledConversionsResponseSchema,
        valid: {
          items: [
            {
              id: `scheduled-1`,
              fromCurrency: `USD`,
              toCurrency: `EUR`,
              amount: 250,
              executeAt: `2026-05-28T12:00:00.000Z`,
              status: `scheduled`,
            },
          ],
          total: 1,
          page: 1,
          pageSize: 10,
        },
        invalid: {
          items: [
            {
              id: `scheduled-1`,
              fromCurrency: `USD`,
              toCurrency: `EUR`,
              amount: `250`,
              executeAt: `2026-05-28T12:00:00.000Z`,
              status: `scheduled`,
            },
          ],
          total: 1,
        },
      },
      {
        name: `exchange quote`,
        schema: consumerExchangeQuoteResponseSchema,
        valid: {
          from: `USD`,
          to: `EUR`,
          rate: 0.92,
          sourceAmount: 100,
          targetAmount: 92,
        },
        invalid: {
          from: `USD`,
          to: `EUR`,
          rate: 0.92,
          sourceAmount: `100`,
          targetAmount: 92,
        },
      },
      {
        name: `exchange conversion`,
        schema: consumerExchangeConversionResponseSchema,
        valid: {
          ledgerId: `ledger-1`,
        },
        invalid: {
          ledgerId: 1,
        },
      },
    ] as const;

    for (const schemaCase of schemaCases) {
      expect(schemaCase.schema.safeParse(schemaCase.valid).success).toBe(true);
      expect(schemaCase.schema.safeParse(schemaCase.invalid).success).toBe(false);
    }
  });

  it(`runtime-validates consumer auth response contracts`, () => {
    const schemaCases = [
      {
        name: `login`,
        schema: consumerLoginResponseSchema,
        valid: { ok: true },
        invalid: { ok: false },
      },
      {
        name: `logout`,
        schema: consumerAuthLogoutResponseSchema,
        valid: { ok: true, message: `Logged out` },
        invalid: { ok: `true` },
      },
      {
        name: `oauth complete`,
        schema: consumerOAuthCompleteResponseSchema,
        valid: { ok: true, next: `/dashboard` },
        invalid: { ok: true, next: 1 },
      },
      {
        name: `google signup session`,
        schema: consumerGoogleSignupSessionResponseSchema,
        valid: {
          email: `jane@example.com`,
          givenName: `Jane`,
          familyName: `Doe`,
          picture: `https://example.com/avatar.png`,
          accountType: `individual`,
          contractorKind: `freelancer`,
          nextPath: `/signup`,
          signupEntryPath: `/signup/google`,
        },
        invalid: {
          email: `jane@example.com`,
          givenName: `Jane`,
          picture: false,
        },
      },
      {
        name: `signup`,
        schema: consumerSignupResponseSchema,
        valid: {
          consumer: {
            id: `consumer-1`,
            email: `jane@example.com`,
            verified: false,
            accountType: `individual`,
            contractorKind: `freelancer`,
            howDidHearAboutUs: `google`,
          },
          next: `/dashboard`,
        },
        invalid: {
          consumer: {
            id: `consumer-1`,
            email: `jane@example.com`,
            verified: `false`,
            accountType: `individual`,
          },
        },
      },
      {
        name: `forgot password`,
        schema: consumerForgotPasswordResponseSchema,
        valid: {
          message: `Check your email`,
          recoveryMode: `email`,
        },
        invalid: {
          message: `Check your email`,
        },
      },
    ] as const;

    for (const schemaCase of schemaCases) {
      expect(schemaCase.schema.safeParse(schemaCase.valid).success).toBe(true);
      expect(schemaCase.schema.safeParse(schemaCase.invalid).success).toBe(false);
    }
  });

  it(`runtime-validates consumer mutation response contracts`, () => {
    const schemaCases = [
      {
        name: `success`,
        schema: consumerSuccessResponseSchema,
        valid: { success: true },
        invalid: { success: false },
      },
      {
        name: `password change`,
        schema: consumerPasswordChangeResponseSchema,
        valid: { success: true, requiresReauth: true },
        invalid: { success: true, requiresReauth: false },
      },
      {
        name: `create payment request`,
        schema: consumerCreatePaymentRequestResponseSchema,
        valid: { paymentRequestId: `payment-1` },
        invalid: { paymentRequestId: 1 },
      },
      {
        name: `start payment`,
        schema: consumerStartPaymentResponseSchema,
        valid: { paymentRequestId: `payment-1`, ledgerId: `ledger-1` },
        invalid: { paymentRequestId: `payment-1`, ledgerId: 1 },
      },
      {
        name: `transfer`,
        schema: consumerTransferResponseSchema,
        valid: { ledgerId: `ledger-1` },
        invalid: { ledgerId: 1 },
      },
      {
        name: `invoice generation`,
        schema: consumerInvoiceGenerationResponseSchema,
        valid: {
          invoiceNumber: `INV-2026-001`,
          resourceId: `doc-1`,
          downloadUrl: `/api/documents/doc-1/download`,
        },
        invalid: {
          invoiceNumber: `INV-2026-001`,
          resourceId: `doc-1`,
          downloadUrl: 1,
        },
      },
      {
        name: `verification session`,
        schema: consumerVerificationSessionResponseSchema,
        valid: {
          clientSecret: `secret_123`,
          sessionId: `vs_123`,
          url: `https://example.com/verify`,
        },
        invalid: {
          clientSecret: `secret_123`,
          sessionId: false,
        },
      },
      {
        name: `stripe checkout session`,
        schema: consumerStripeCheckoutSessionResponseSchema,
        valid: { url: `https://checkout.stripe.com/test` },
        invalid: { url: false },
      },
      {
        name: `pay with saved method`,
        schema: consumerPayWithSavedMethodResponseSchema,
        valid: { success: true, paymentIntentId: `pi_123`, status: `succeeded`, nextAction: null },
        invalid: { success: `true` },
      },
      {
        name: `stripe setup intent`,
        schema: consumerStripeSetupIntentResponseSchema,
        valid: { clientSecret: `seti_secret_123` },
        invalid: { clientSecret: 1 },
      },
      {
        name: `documents upload`,
        schema: consumerDocumentsUploadResponseSchema,
        valid: { ids: [`doc-1`, `doc-2`] },
        invalid: { ids: [`doc-1`, 2] },
      },
      {
        name: `deleted exchange rule`,
        schema: consumerDeletedExchangeRuleResponseSchema,
        valid: { ruleId: `rule-1` },
        invalid: { ruleId: 1 },
      },
      {
        name: `cancelled scheduled conversion`,
        schema: consumerCancelledScheduledConversionResponseSchema,
        valid: { conversionId: `scheduled-1` },
        invalid: { conversionId: 1 },
      },
      {
        name: `theme settings`,
        schema: consumerThemeSettingsResponseSchema,
        valid: { theme: `dark` },
        invalid: { theme: true },
      },
      {
        name: `preferred currency settings`,
        schema: consumerPreferredCurrencySettingsResponseSchema,
        valid: { preferredCurrency: `EUR` },
        invalid: { preferredCurrency: false },
      },
    ] as const;

    for (const schemaCase of schemaCases) {
      expect(schemaCase.schema.safeParse(schemaCase.valid).success).toBe(true);
      expect(schemaCase.schema.safeParse(schemaCase.invalid).success).toBe(false);
    }
  });
});
