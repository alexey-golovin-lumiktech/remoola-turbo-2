'use client';

import { type ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { ACCOUNT_TYPE, CONTRACTOR_KIND, type TAccountType, type TContractorKind } from '@remoola/api-types';

import { createInitialSignupFormState, type SignupQuerySeed } from './defaults';
import { applyGoogleSignupSession, hasUsableGoogleSignupSession } from './google-session';
import {
  type AddressDetails,
  type EntityDetails,
  type IndividualDetails,
  type OrganizationDetails,
  type SignupDetails,
  type SignupFormState,
} from './types';

interface SignupFormContextValue {
  state: SignupFormState;
  signupDetails: SignupDetails;
  individualDetails: IndividualDetails;
  entityDetails: EntityDetails;
  organizationDetails: OrganizationDetails;
  addressDetails: AddressDetails;
  updateSignup: (patch: Partial<SignupDetails>) => void;
  updateIndividual: (patch: Partial<IndividualDetails>) => void;
  updateEntity: (patch: Partial<EntityDetails>) => void;
  updateOrganization: (patch: Partial<OrganizationDetails>) => void;
  updateAddress: (patch: Partial<AddressDetails>) => void;
  setGoogleSignupToken: (token: string | null) => void;
  retryGoogleHydration: () => void;
  accountType: TAccountType | null;
  contractorKind: TContractorKind | null;
  isBusiness: boolean;
  isContractor: boolean;
  isContractorIndividual: boolean;
  isContractorEntity: boolean;
  googleSignupToken: string | null;
  googleHydrationLoading: boolean;
  googleHydrationError: string | null;
}

const SignupFormContext = createContext<SignupFormContextValue | null>(null);

export function SignupFormProvider({ children, querySeed }: { children: ReactNode; querySeed?: SignupQuerySeed }) {
  const [state, setState] = useState<SignupFormState>(() => createInitialSignupFormState(querySeed));
  const [googleHydrationNonce, setGoogleHydrationNonce] = useState(0);

  useEffect(() => {
    setState((current) => {
      const seededState = createInitialSignupFormState(querySeed);
      const nextState: SignupFormState = {
        ...current,
        signupDetails: {
          ...current.signupDetails,
          accountType: current.signupDetails.accountType ?? seededState.signupDetails.accountType,
          contractorKind: current.signupDetails.contractorKind ?? seededState.signupDetails.contractorKind,
        },
        googleSignupToken: current.googleSignupToken ?? seededState.googleSignupToken,
      };

      return JSON.stringify(nextState) === JSON.stringify(current) ? current : nextState;
    });
  }, [querySeed]);

  useEffect(() => {
    if (!state.googleSignupToken) {
      setState((current) =>
        current.googleHydrationLoading || current.googleHydrationError || current.hydratedGoogleToken
          ? {
              ...current,
              googleHydrationLoading: false,
              googleHydrationError: null,
              hydratedGoogleToken: null,
            }
          : current,
      );
      return;
    }

    if (state.hydratedGoogleToken === state.googleSignupToken) {
      return;
    }

    const controller = new AbortController();
    const activeToken = state.googleSignupToken;
    setState((current) => ({
      ...current,
      googleHydrationLoading: true,
      googleHydrationError: null,
    }));

    void (async () => {
      try {
        const response = await fetch(
          `/api/consumer/auth/google/signup-session?token=${encodeURIComponent(activeToken)}`,
          {
            credentials: `include`,
            cache: `no-store`,
            signal: controller.signal,
          },
        );
        const data = (await response.json().catch(() => ({}))) as {
          email?: string;
          givenName?: string;
          familyName?: string;
        };

        if (!response.ok || !hasUsableGoogleSignupSession(data)) {
          throw new Error(`Could not load your Google sign-up session. Please try again.`);
        }

        setState((current) =>
          current.googleSignupToken === activeToken ? applyGoogleSignupSession(current, data, activeToken) : current,
        );
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error && error.message
            ? error.message
            : `Could not load your Google sign-up session. Please check your connection and try again.`;

        setState((current) =>
          current.googleSignupToken === activeToken
            ? {
                ...current,
                googleHydrationLoading: false,
                googleHydrationError: message,
                hydratedGoogleToken: null,
              }
            : current,
        );
      }
    })();

    return () => {
      controller.abort();
    };
  }, [state.googleSignupToken, state.hydratedGoogleToken, googleHydrationNonce]);

  const updateSignup = useCallback((patch: Partial<SignupDetails>) => {
    setState((current) => {
      const nextSignupDetails = { ...current.signupDetails, ...patch };
      if (patch.accountType === ACCOUNT_TYPE.BUSINESS) {
        nextSignupDetails.contractorKind = null;
      }
      if (
        patch.accountType === ACCOUNT_TYPE.CONTRACTOR &&
        current.signupDetails.accountType === ACCOUNT_TYPE.BUSINESS
      ) {
        nextSignupDetails.contractorKind = current.signupDetails.contractorKind;
      }
      return { ...current, signupDetails: nextSignupDetails };
    });
  }, []);

  const updateIndividual = useCallback((patch: Partial<IndividualDetails>) => {
    setState((current) => ({
      ...current,
      individualDetails: { ...current.individualDetails, ...patch },
    }));
  }, []);

  const updateEntity = useCallback((patch: Partial<EntityDetails>) => {
    setState((current) => ({
      ...current,
      entityDetails: { ...current.entityDetails, ...patch },
    }));
  }, []);

  const updateOrganization = useCallback((patch: Partial<OrganizationDetails>) => {
    setState((current) => ({
      ...current,
      organizationDetails: { ...current.organizationDetails, ...patch },
    }));
  }, []);

  const updateAddress = useCallback((patch: Partial<AddressDetails>) => {
    setState((current) => ({
      ...current,
      addressDetails: { ...current.addressDetails, ...patch },
    }));
  }, []);

  const setGoogleSignupToken = useCallback((token: string | null) => {
    setState((current) => ({
      ...current,
      googleSignupToken: token,
      hydratedGoogleToken: token === current.googleSignupToken ? current.hydratedGoogleToken : null,
      googleHydrationError: null,
    }));
  }, []);

  const retryGoogleHydration = useCallback(() => {
    setState((current) => ({
      ...current,
      googleHydrationError: null,
      hydratedGoogleToken: null,
    }));
    setGoogleHydrationNonce((current) => current + 1);
  }, []);

  const value = useMemo<SignupFormContextValue>(
    () => ({
      state,
      signupDetails: state.signupDetails,
      individualDetails: state.individualDetails,
      entityDetails: state.entityDetails,
      organizationDetails: state.organizationDetails,
      addressDetails: state.addressDetails,
      updateSignup,
      updateIndividual,
      updateEntity,
      updateOrganization,
      updateAddress,
      setGoogleSignupToken,
      retryGoogleHydration,
      accountType: state.signupDetails.accountType,
      contractorKind: state.signupDetails.contractorKind,
      isBusiness: state.signupDetails.accountType === ACCOUNT_TYPE.BUSINESS,
      isContractor: state.signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR,
      isContractorIndividual:
        state.signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR &&
        state.signupDetails.contractorKind === CONTRACTOR_KIND.INDIVIDUAL,
      isContractorEntity:
        state.signupDetails.accountType === ACCOUNT_TYPE.CONTRACTOR &&
        state.signupDetails.contractorKind === CONTRACTOR_KIND.ENTITY,
      googleSignupToken: state.googleSignupToken,
      googleHydrationLoading: state.googleHydrationLoading,
      googleHydrationError: state.googleHydrationError,
    }),
    [
      state,
      updateSignup,
      updateIndividual,
      updateEntity,
      updateOrganization,
      updateAddress,
      setGoogleSignupToken,
      retryGoogleHydration,
    ],
  );

  return <SignupFormContext.Provider value={value}>{children}</SignupFormContext.Provider>;
}

export function useSignupForm(): SignupFormContextValue {
  const context = useContext(SignupFormContext);
  if (!context) {
    throw new Error(`useSignupForm must be used within SignupFormProvider`);
  }
  return context;
}
