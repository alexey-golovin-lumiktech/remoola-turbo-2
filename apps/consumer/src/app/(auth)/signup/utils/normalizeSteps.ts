import { type StepsMap } from './getSteps';
import { type IStepName, type NormalizedStep, type StepMeta } from '../types/step.types';

export const normalizeSteps = (stepsObj: StepsMap): NormalizedStep[] =>
  Object.entries(stepsObj).map(([name, meta], index) => {
    const typedMeta = meta as StepMeta;
    return {
      name: name as IStepName,
      label: typedMeta.label,
      submitted: typedMeta.submitted,
      index,
    };
  });
