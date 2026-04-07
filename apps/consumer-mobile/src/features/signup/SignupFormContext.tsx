'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  AUTH_RATE_LIMIT_MESSAGE,
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  CONSUMER_ROLE,
  HOW_DID_HEAR_ABOUT_US,
  ORGANIZATION_SIZE,
  type TAccountType,
  type TContractorKind,
  type THowDidHearAboutUs,
  type TLegalStatus,
} from '@remoola/api-types';

import { parseSignupAccountType, parseSignupContractorKind, type SignupQuerySeed } from './routing';

export interface SignupDetails {
  email: string;
  password: string;
  confirmPassword: string;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  howDidHearAboutUs: THowDidHearAboutUs | null;
  howDidHearAboutUsOther: string | null;
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  citizenOf: string;
  countryOfTaxResidence: string;
  legalStatus: TLegalStatus | null;
  taxId: string;
  dateOfBirth: string;
  passportOrIdNumber: string;
  phoneNumber: string;
}

export interface OrganizationDetails {
  name: string;
  size: (typeof ORGANIZATION_SIZE)[keyof typeof ORGANIZATION_SIZE];
  consumerRole: (typeof CONSUMER_ROLE)[keyof typeof CONSUMER_ROLE];
  consumerRoleOther: string | null;
}

export interface AddressDetails {
  postalCode: string;
  country: string;
  state: string;
  city: string;
  street: string;
}

export interface SignupFormState {
  signupDetails: SignupDetails;
  personalDetails: PersonalDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  googleSignupToken: string | null;
}

const initialSignupDetails: SignupDetails = {
  email: ``,
  password: ``,
  confirmPassword: ``,
  accountType: null,
  contractorKind: null,
  howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
  howDidHearAboutUsOther: null,
};

const initialPersonal: PersonalDetails = {
  firstName: ``,
  lastName: ``,
  citizenOf: ``,
  countryOfTaxResidence: ``,
  legalStatus: null,
  taxId: ``,
  dateOfBirth: ``,
  passportOrIdNumber: ``,
  phoneNumber: ``,
};

const initialOrg: OrganizationDetails = {
  name: ``,
  size: ORGANIZATION_SIZE.SMALL,
  consumerRole: CONSUMER_ROLE.FOUNDER,
  consumerRoleOther: null,
};

const initialAddress: AddressDetails = {
  postalCode: ``,
  country: ``,
  state: ``,
  city: ``,
  street: ``,
};

interface SignupFormContextValue {
  state: SignupFormState;
  signupDetails: SignupDetails;
  personalDetails: PersonalDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  updateSignup: (patch: Partial<SignupDetails>) => void;
  updatePersonal: (patch: Partial<PersonalDetails>) => void;
  updateOrganization: (patch: Partial<OrganizationDetails>) => void;
  updateAddress: (patch: Partial<AddressDetails>) => void;
  setGoogleSignupToken: (token: string | null) => void;
  retryGoogleHydration: () => void;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  isContractor: boolean;
  isBusiness: boolean;
  isContractorEntity: boolean;
  isContractorIndividual: boolean;
  googleSignupToken: string | null;
  googleHydrationLoading: boolean;
  googleHydrationError: string | null;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: SignupFormState = {
  signupDetails: initialSignupDetails,
  personalDetails: initialPersonal,
  organizationDetails: initialOrg,
  addressDetails: initialAddress,
  googleSignupToken: null,
};

interface GoogleSignupSessionPayload {
  email?: string;
  givenName?: string;
  familyName?: string;
}

function hasUsableGoogleSignupSession(payload: GoogleSignupSessionPayload): payload is GoogleSignupSessionPayload & {
  email: string;
} {
  return typeof payload.email === `string` && payload.email.trim().length > 0;
}

export function mergeSignupDetails(current: SignupDetails, patch: Partial<SignupDetails>): SignupDetails {
  const nextSignupDetails = { ...current, ...patch };
  if (patch.accountType === ACCOUNT_TYPE.BUSINESS) {
    nextSignupDetails.contractorKind = null;
  }
  return nextSignupDetails;
}

function createInitialState(querySeed?: SignupQuerySeed): SignupFormState {
  const seededAccountType = parseSignupAccountType(querySeed?.accountTypeParam ?? null);
  const seededContractorKind =
    seededAccountType === ACCOUNT_TYPE.CONTRACTOR
      ? parseSignupContractorKind(querySeed?.contractorKindParam ?? null)
      : null;
  return {
    ...initialState,
    signupDetails: {
      ...initialState.signupDetails,
      accountType: seededAccountType,
      contractorKind: seededContractorKind,
    },
    googleSignupToken: querySeed?.googleSignupToken ?? (querySeed?.googleSignupHandoff ? `cookie-session` : null),
  };
}

export function SignupFormProvider({ children, querySeed }: { children: ReactNode; querySeed?: SignupQuerySeed }) {
  const [state, setState] = useState<SignupFormState>(() => createInitialState(querySeed));
  const [googleHydrationLoading, setGoogleHydrationLoading] = useState(false);
  const [googleHydrationError, setGoogleHydrationError] = useState<string | null>(null);
  const [hydratedGoogleToken, setHydratedGoogleToken] = useState<string | null>(null);
  const [googleHydrationNonce, setGoogleHydrationNonce] = useState(0);
  const googleSignupHandoff = querySeed?.googleSignupHandoff ?? null;

  useEffect(() => {
    if (!querySeed) return;

    const seededAccountType = parseSignupAccountType(querySeed.accountTypeParam);
    const seededContractorKind =
      seededAccountType === ACCOUNT_TYPE.CONTRACTOR ? parseSignupContractorKind(querySeed.contractorKindParam) : null;
    const seededGoogleSignupToken = querySeed.googleSignupToken;

    setState((prev) => {
      const effectiveAccountType = prev.signupDetails.accountType ?? seededAccountType;
      const nextState: SignupFormState = {
        ...prev,
        signupDetails: {
          ...prev.signupDetails,
          accountType: effectiveAccountType,
          contractorKind:
            effectiveAccountType === ACCOUNT_TYPE.CONTRACTOR
              ? (prev.signupDetails.contractorKind ?? seededContractorKind)
              : null,
        },
        googleSignupToken: prev.googleSignupToken ?? seededGoogleSignupToken,
      };

      return JSON.stringify(nextState) === JSON.stringify(prev) ? prev : nextState;
    });
  }, [querySeed]);

  useEffect(() => {
    if (state.googleSignupToken) return;
    setGoogleHydrationLoading(false);
    setGoogleHydrationError(null);
    setHydratedGoogleToken(null);
  }, [state.googleSignupToken]);

  useEffect(() => {
    if (!state.googleSignupToken || hydratedGoogleToken === state.googleSignupToken || googleSignupHandoff) {
      return;
    }

    const controller = new AbortController();
    const activeToken = state.googleSignupToken;
    setGoogleHydrationLoading(true);
    setGoogleHydrationError(null);

    void (async () => {
      try {
        const response = await fetch(`/api/consumer/auth/google/signup-session`, {
          credentials: `include`,
          cache: `no-store`,
          signal: controller.signal,
        });
        const data = (await response.json().catch(() => ({}))) as GoogleSignupSessionPayload;
        if (response.status === 429) {
          throw new Error(AUTH_RATE_LIMIT_MESSAGE);
        }
        if (!response.ok || !hasUsableGoogleSignupSession(data)) {
          throw new Error(`Could not load your Google signup session. Please try again.`);
        }
        setState((prev) =>
          prev.googleSignupToken === activeToken
            ? {
                ...prev,
                signupDetails: {
                  ...prev.signupDetails,
                  email: prev.signupDetails.email || data.email || prev.signupDetails.email,
                },
                personalDetails: {
                  ...prev.personalDetails,
                  firstName: prev.personalDetails.firstName || data.givenName || prev.personalDetails.firstName,
                  lastName: prev.personalDetails.lastName || data.familyName || prev.personalDetails.lastName,
                },
              }
            : prev,
        );
        setHydratedGoogleToken(activeToken);
        setGoogleHydrationLoading(false);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setGoogleHydrationLoading(false);
        setHydratedGoogleToken(null);
        setGoogleHydrationError(
          error instanceof Error && error.message
            ? error.message
            : `Could not load your Google signup session. Please check your connection and try again.`,
        );
      }
    })();

    return () => {
      controller.abort();
    };
  }, [googleSignupHandoff, googleHydrationNonce, hydratedGoogleToken, state.googleSignupToken]);

  useEffect(() => {
    if (!googleSignupHandoff) return;

    const controller = new AbortController();
    setGoogleHydrationLoading(true);
    setGoogleHydrationError(null);
    setHydratedGoogleToken(null);
    setState((prev) => ({ ...prev, googleSignupToken: prev.googleSignupToken ?? `cookie-session` }));

    void (async () => {
      try {
        const response = await fetch(`/api/consumer/auth/google/signup-session/establish`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          cache: `no-store`,
          signal: controller.signal,
          body: JSON.stringify({ handoffToken: googleSignupHandoff }),
        });
        const data = (await response.json().catch(() => ({}))) as GoogleSignupSessionPayload;
        if (response.status === 429) {
          throw new Error(AUTH_RATE_LIMIT_MESSAGE);
        }
        if (!response.ok || !hasUsableGoogleSignupSession(data)) {
          throw new Error(`Could not load your Google signup session. Please try again.`);
        }
        setState((prev) => ({
          ...prev,
          googleSignupToken: `cookie-session`,
          signupDetails: {
            ...prev.signupDetails,
            email: prev.signupDetails.email || data.email || prev.signupDetails.email,
          },
          personalDetails: {
            ...prev.personalDetails,
            firstName: prev.personalDetails.firstName || data.givenName || prev.personalDetails.firstName,
            lastName: prev.personalDetails.lastName || data.familyName || prev.personalDetails.lastName,
          },
        }));
        setHydratedGoogleToken(`cookie-session`);
        setGoogleHydrationLoading(false);

        const url = new URL(window.location.href);
        url.searchParams.delete(`googleSignupHandoff`);
        url.searchParams.set(`googleSignup`, `1`);
        window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setGoogleHydrationLoading(false);
        setHydratedGoogleToken(null);
        setGoogleHydrationError(
          error instanceof Error && error.message
            ? error.message
            : `Could not load your Google signup session. Please check your connection and try again.`,
        );
      }
    })();

    return () => {
      controller.abort();
    };
  }, [googleSignupHandoff, googleHydrationNonce]);

  const updateSignup = useCallback((patch: Partial<SignupDetails>) => {
    setState((prev) => ({
      ...prev,
      signupDetails: mergeSignupDetails(prev.signupDetails, patch),
    }));
  }, []);

  const updatePersonal = useCallback((patch: Partial<PersonalDetails>) => {
    setState((prev) => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, ...patch },
    }));
  }, []);

  const updateOrganization = useCallback((patch: Partial<OrganizationDetails>) => {
    setState((prev) => ({
      ...prev,
      organizationDetails: { ...prev.organizationDetails, ...patch },
    }));
  }, []);

  const updateAddress = useCallback((patch: Partial<AddressDetails>) => {
    setState((prev) => ({
      ...prev,
      addressDetails: { ...prev.addressDetails, ...patch },
    }));
  }, []);

  const setGoogleSignupToken = useCallback(
    (token: string | null) => {
      setState((prev) => ({ ...prev, googleSignupToken: token }));
      setHydratedGoogleToken((prev) => (token === state.googleSignupToken ? prev : null));
      setGoogleHydrationError(null);
    },
    [state.googleSignupToken],
  );

  const retryGoogleHydration = useCallback(() => {
    setGoogleHydrationError(null);
    setHydratedGoogleToken(null);
    setGoogleHydrationNonce((prev) => prev + 1);
  }, []);

  const value = useMemo<SignupFormContextValue>(
    () => ({
      state,
      signupDetails: state.signupDetails,
      personalDetails: state.personalDetails,
      organizationDetails: state.organizationDetails,
      addressDetails: state.addressDetails,
      updateSignup,
      updatePersonal,
      updateOrganization,
      updateAddress,
      setGoogleSignupToken,
      retryGoogleHydration,
      accountType: state.signupDetails.accountType,
      contractorKind: state.signupDetails.contractorKind,
      isContractor: state.signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR,
      isBusiness: state.signupDetails.accountType === ACCOUNT_TYPE.BUSINESS,
      isContractorEntity: state.signupDetails.contractorKind === CONTRACTOR_KIND.ENTITY,
      isContractorIndividual: state.signupDetails.contractorKind === CONTRACTOR_KIND.INDIVIDUAL,
      googleSignupToken: state.googleSignupToken,
      googleHydrationLoading,
      googleHydrationError,
    }),
    [
      googleHydrationError,
      googleHydrationLoading,
      retryGoogleHydration,
      setGoogleSignupToken,
      state,
      updateAddress,
      updateOrganization,
      updatePersonal,
      updateSignup,
    ],
  );

  return <SignupFormContext.Provider value={value}>{children}</SignupFormContext.Provider>;
}

export function useSignupForm(): SignupFormContextValue {
  const ctx = useContext(SignupFormContext);
  if (!ctx) throw new Error(`useSignupForm must be used within SignupFormProvider`);
  return ctx;
}
