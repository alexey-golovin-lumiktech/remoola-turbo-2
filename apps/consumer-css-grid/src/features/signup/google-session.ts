import { HOW_DID_HEAR_ABOUT_US } from '@remoola/api-types';

import { type SignupFormState } from './types';

interface GoogleSignupSessionPayload {
  email?: string;
  givenName?: string;
  familyName?: string;
}

export function hasUsableGoogleSignupSession(
  payload: GoogleSignupSessionPayload,
): payload is GoogleSignupSessionPayload & {
  email: string;
} {
  return typeof payload.email === `string` && payload.email.trim().length > 0;
}

export function applyGoogleSignupSession(
  state: SignupFormState,
  payload: GoogleSignupSessionPayload,
  hydratedGoogleToken: string,
): SignupFormState {
  const nextEmail = state.signupDetails.email.trim()
    ? state.signupDetails.email
    : (payload.email ?? state.signupDetails.email);
  const nextFirstName = state.individualDetails.firstName.trim()
    ? state.individualDetails.firstName
    : (payload.givenName ?? state.individualDetails.firstName);
  const nextLastName = state.individualDetails.lastName.trim()
    ? state.individualDetails.lastName
    : (payload.familyName ?? state.individualDetails.lastName);

  return {
    ...state,
    signupDetails: {
      ...state.signupDetails,
      email: nextEmail,
      howDidHearAboutUs: state.signupDetails.howDidHearAboutUs ?? HOW_DID_HEAR_ABOUT_US.GOOGLE,
    },
    individualDetails: {
      ...state.individualDetails,
      firstName: nextFirstName,
      lastName: nextLastName,
    },
    googleHydrationLoading: false,
    googleHydrationError: null,
    hydratedGoogleToken,
  };
}
