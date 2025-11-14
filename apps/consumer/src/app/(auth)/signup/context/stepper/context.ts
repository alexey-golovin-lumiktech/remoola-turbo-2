import { createContext } from 'react';

import { type IStepperContext } from './types';

export const context = createContext<IStepperContext | null>(null);
