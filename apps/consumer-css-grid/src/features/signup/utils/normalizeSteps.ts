import { type NormalizedStep, type StepMeta, type StepName } from '../stepNames';
import { type StepsMap } from './getSteps';

export function normalizeSteps(stepsObj: StepsMap): NormalizedStep[] {
  return (Object.entries(stepsObj) as [StepName, StepMeta][]).map(([name, meta], index) => ({
    name,
    label: meta.label,
    submitted: meta.submitted,
    index,
  }));
}
