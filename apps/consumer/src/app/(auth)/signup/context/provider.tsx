import { context } from './context';
import { useSignupContextProviderValue } from './hooks';

export function SignupContextProvider({ children }: { children: React.ReactNode }) {
  return <context.Provider value={useSignupContextProviderValue()}>{children}</context.Provider>;
}
