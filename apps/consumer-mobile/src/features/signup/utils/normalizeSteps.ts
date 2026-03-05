import { STEP_DISPLAY_LABEL, type NormalizedStep, type StepMeta, type StepName } from '../stepNames';
import { type StepsMap } from './getSteps';

export function normalizeSteps(stepsObj: StepsMap): NormalizedStep[] {
  return (Object.entries(stepsObj) as [StepName, StepMeta][]).map(([name, _meta], index) => ({
    name,
    label: STEP_DISPLAY_LABEL[name] ?? name,
    submitted: _meta.submitted,
    index,
  }));
}
