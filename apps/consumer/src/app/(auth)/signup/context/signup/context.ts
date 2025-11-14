import { createContext } from 'react';

import { type ISignupContext } from './types';

export const context = createContext<ISignupContext | null>(null);
