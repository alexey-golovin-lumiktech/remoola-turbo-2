import { type StepsMap } from './getSteps';
import { type IStepName, type INormalizedStep, type IStepMeta } from '../types';

export const normalizeSteps = (stepsObj: StepsMap): INormalizedStep[] =>
  Object.entries(stepsObj).map(([name, meta], index) => {
    const typedMeta = meta as IStepMeta;
    return {
      name: name as IStepName,
      label: typedMeta.label,
      submitted: typedMeta.submitted,
      index,
    };
  });
