export type ConsumerEndpointKey =
  | `dashboard`
  | `paymentsList`
  | `paymentsGet`
  | `paymentsHistory`
  | `paymentsBalance`
  | `paymentsAvailableBalance`
  | `paymentsStart`
  | `paymentsWithdraw`
  | `paymentsTransfer`
  | `paymentsGenerateInvoice`
  | `paymentRequestsCreate`
  | `paymentRequestsSend`
  | `paymentMethodsList`
  | `contactsList`
  | `contactsLookupByEmail`
  | `contactsGet`
  | `contactsDetails`
  | `contractsList`
  | `contractsDetails`
  | `documentsList`
  | `documentsAttachToPayment`
  | `documentsDetachFromPayment`
  | `settingsGet`
  | `settingsPatch`
  | `profileMe`
  | `profilePatch`
  | `profilePasswordPatch`
  | `exchangeCurrencies`
  | `exchangeRate`
  | `exchangeRatesBatch`
  | `exchangeRules`
  | `exchangeScheduled`
  | `authLogin`
  | `authGoogleStart`
  | `authGoogleSignupSession`
  | `authGoogleSignupEstablish`
  | `authOAuthComplete`
  | `authLogout`
  | `authRefresh`
  | `authLogoutAll`
  | `authSignup`
  | `authForgotPassword`
  | `authResetPassword`
  | `stripeCheckoutSession`
  | `stripeSetupIntentCreate`
  | `stripeConfirm`
  | `stripePayWithSavedMethod`
  | `verificationSessionCreate`;

export type ConsumerEndpointDefinition = {
  method: `DELETE` | `GET` | `PATCH` | `POST`;
  path: string;
  body?: string;
  query?: string;
  response?: string;
};
