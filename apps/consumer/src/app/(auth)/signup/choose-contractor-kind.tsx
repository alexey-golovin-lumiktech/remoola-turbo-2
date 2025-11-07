import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';
import { CONTRACTOR_KIND } from './context/types';

export default function ChooseContractorKind() {
  const {
    state: { contractorKind },
    action: { updateContractorKind, nextStep, prevStep },
  } = useSignupContext();

  return (
    <form onSubmit={(e) => (e.preventDefault(), nextStep())}>
      <Input
        type="text"
        placeholder="Country"
        value={contractorKind}
        onChange={(e) => updateContractorKind(Object.values(CONTRACTOR_KIND).find((x) => x === e.target.value)!)}
        required
      />
      <div className="flex gap-2 mt-6">
        <Button variant="primary" onClick={prevStep} className="w-1/2">
          Back
        </Button>
        <Button type="submit" className="w-1/2">
          Next
        </Button>
      </div>
    </form>
  );
}
