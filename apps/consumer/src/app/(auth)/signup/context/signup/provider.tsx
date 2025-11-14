import { useMemo } from 'react';

import { context } from './context';
import { useSignupContextProviderValue } from './hooks';

export function SignupContextProvider({ children }: { children: React.ReactNode }) {
  const { state, action } = useSignupContextProviderValue();
  const memoized = useMemo(() => ({ state, action }), [state, action]);
  return <context.Provider value={memoized}>{children}</context.Provider>;
}
