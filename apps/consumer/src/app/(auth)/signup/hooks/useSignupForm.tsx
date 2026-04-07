'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState, createContext, useContext } from 'react';

import {
  AUTH_RATE_LIMIT_MESSAGE,
  type TAccountType,
  type TContractorKind,
  HOW_DID_HEAR_ABOUT_US,
  ORGANIZATION_SIZE,
  ACCOUNT_TYPE,
  CONTRACTOR_KIND,
  CONSUMER_ROLE,
} from '@remoola/api-types';

import {
  type ISignupFormState,
  type ISignupDetails,
  type IPersonalDetails,
  type IOrganizationDetails,
  type IAddressDetails,
} from '../../../../types';
import { parseSignupAccountType, parseSignupContractorKind, type SignupQuerySeed } from '../routing';

interface SignupFormContextValue {
  state: ISignupFormState;

  signupDetails: ISignupDetails;
  personalDetails: IPersonalDetails;
  organizationDetails: IOrganizationDetails;
  addressDetails: IAddressDetails;

  updateSignup: (patch: Partial<ISignupDetails>) => void;
  updatePersonal: (patch: Partial<IPersonalDetails>) => void;
  updateOrganization: (patch: Partial<IOrganizationDetails>) => void;
  updateAddress: (patch: Partial<IAddressDetails>) => void;
  setGoogleSignupToken: (token: string | null) => void;
  retryGoogleHydration: () => void;

  accountType: TAccountType;
  contractorKind: TContractorKind;

  isContractor: boolean;
  isBusiness: boolean;
  isContractorEntity: boolean;
  isContractorIndividual: boolean;
  googleSignupToken: string | null;
  googleHydrationLoading: boolean;
  googleHydrationError: string | null;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

const initialState: ISignupFormState = {
  signupDetails: {
    email: ``,
    password: ``,
    confirmPassword: ``,
    accountType: null,
    contractorKind: null,

    howDidHearAboutUs: HOW_DID_HEAR_ABOUT_US.GOOGLE,
    howDidHearAboutUsOther: null,
  },
  personalDetails: {
    firstName: ``,
    lastName: ``,
    citizenOf: ``,
    countryOfTaxResidence: ``,
    legalStatus: null,
    taxId: ``,
    dateOfBirth: ``,
    passportOrIdNumber: ``,
    phoneNumber: ``,
  },
  organizationDetails: {
    name: ``,
    size: ORGANIZATION_SIZE.SMALL,

    consumerRole: CONSUMER_ROLE.FOUNDER,
    consumerRoleOther: null,
  },
  addressDetails: {
    postalCode: ``,
    country: ``,
    state: ``,
    city: ``,
    street: ``,
  },
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

function createInitialState(querySeed?: SignupQuerySeed): ISignupFormState {
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
  const [state, setState] = useState<ISignupFormState>(() => createInitialState(querySeed));
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
      const nextState: ISignupFormState = {
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

  const updateSignup = useCallback((patch: Partial<ISignupDetails>) => {
    setState((prev) => {
      const nextSignupDetails = { ...prev.signupDetails, ...patch };
      if (patch.accountType === ACCOUNT_TYPE.BUSINESS) {
        nextSignupDetails.contractorKind = null;
      }
      return { ...prev, signupDetails: nextSignupDetails };
    });
  }, []);

  const updatePersonal = useCallback((patch: Partial<IPersonalDetails>) => {
    setState((prev) => ({ ...prev, personalDetails: { ...prev.personalDetails, ...patch } }));
  }, []);

  const updateOrganization = useCallback((patch: Partial<IOrganizationDetails>) => {
    setState((prev) => ({
      ...prev,
      organizationDetails: { ...prev.organizationDetails, ...patch },
    }));
  }, []);

  const updateAddress = useCallback((patch: Partial<IAddressDetails>) => {
    setState((prev) => ({
      ...prev,
      addressDetails: {
        ...prev.addressDetails,
        ...(patch.postalCode !== undefined && { postalCode: patch.postalCode?.trim() ?? `` }),
        ...(patch.country !== undefined && { country: patch.country?.trim() ?? `` }),
        ...(patch.state !== undefined && { state: patch.state?.trim() ?? `` }),
        ...(patch.city !== undefined && { city: patch.city?.trim() ?? `` }),
        ...(patch.street !== undefined && { street: patch.street?.trim() ?? `` }),
      },
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
      accountType: state.signupDetails.accountType!,
      contractorKind: state.signupDetails.contractorKind!,
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

export const useSignupForm = (): SignupFormContextValue => {
  const ctx = useContext(SignupFormContext);
  if (!ctx) throw new Error(`useSignupForm must be used within SignupFormProvider`);
  return ctx;
};
