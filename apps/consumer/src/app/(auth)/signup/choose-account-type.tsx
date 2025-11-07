import { Button } from '@remoola/ui/Button';
import { Input } from '@remoola/ui/Input';

import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE } from './context/types';

export default function ChooseAccountType() {
  const {
    state: { accountType },
    action: { updateAccountType, nextStep, prevStep },
  } = useSignupContext();

  return (
    <form onSubmit={(e) => (e.preventDefault(), nextStep())}>
      <Input
        type="text"
        placeholder="Country"
        value={accountType}
        onChange={(e) => updateAccountType(Object.values(ACCOUNT_TYPE).find((x) => x === e.target.value)!)}
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
