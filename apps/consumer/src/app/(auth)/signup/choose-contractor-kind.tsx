import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';

import { useSignupContext, CONTRACTOR_KIND, type IContractorKind } from './context/signup';

export default function ChooseContractorKind() {
  const {
    state: { contractorKind },
    action: { updateContractorKind, nextStep },
  } = useSignupContext();

  const handleChangeContractorKind = (e: ChangeEvent<HTMLInputElement>) => {
    updateContractorKind(e.target.value as IContractorKind);
  };

  const submitContractorKind = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitContractorKind}
      >
        <div className="flex flex-col w-full gap-4">
          <label
            htmlFor={CONTRACTOR_KIND.ENTITY}
            className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-blue-400 transition-all"
          >
            <input
              type="radio"
              id={CONTRACTOR_KIND.ENTITY}
              name="contractorKind"
              value={CONTRACTOR_KIND.ENTITY}
              checked={contractorKind === CONTRACTOR_KIND.ENTITY}
              onChange={handleChangeContractorKind}
              className="mt-1 h-5 w-5 accent-blue-600"
            />
            <div>
              <p className="font-medium text-gray-800">I&apos;m working via an entity (LTD company)</p>
              <p className="text-sm text-gray-600">
                Your entity information will be used on invoices and tax documentation.
              </p>
            </div>
          </label>

          <label
            htmlFor={CONTRACTOR_KIND.INDIVIDUAL}
            className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-blue-400 transition-all"
          >
            <input
              type="radio"
              id={CONTRACTOR_KIND.INDIVIDUAL}
              name="contractorKind"
              value={CONTRACTOR_KIND.INDIVIDUAL}
              checked={contractorKind === CONTRACTOR_KIND.INDIVIDUAL}
              onChange={handleChangeContractorKind}
              className="mt-1 h-5 w-5 accent-blue-600"
            />
            <div>
              <p className="font-medium text-gray-800">I&apos;m an individual</p>
              <p className="text-sm text-gray-600">
                Your personal information will be used on invoices and tax documentation.
              </p>
            </div>
          </label>
        </div>

        <Button type="submit" className="w-full px-10 py-2 transition-colors mt-2">
          Next
        </Button>
      </form>
    </div>
  );
}
