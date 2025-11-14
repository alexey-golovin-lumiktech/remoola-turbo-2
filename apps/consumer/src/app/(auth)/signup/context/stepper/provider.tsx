import { useMemo } from 'react';

import { context } from './context';

export function StepperContextProvider({ children }: { children: React.ReactNode }) {
  const memoized = useMemo(() => ({ state: null, action: null }), []);
  return <context.Provider value={memoized}>{children}</context.Provider>;
}
