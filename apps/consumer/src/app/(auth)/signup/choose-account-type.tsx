import { type ChangeEvent } from 'react';

import { Button } from '@remoola/ui/Button';

import { useSignupContext, ACCOUNT_TYPE, type IAccountType } from './context/signup';

export default function ChooseAccountType() {
  const {
    state: { accountType },
    action: { updateAccountType, nextStep },
  } = useSignupContext();

  const handleChangeAccountType = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    updateAccountType(e.target.value as IAccountType);
  };

  const submitAccountType = (e: React.FormEvent) => {
    e.preventDefault();
    nextStep();
  };

  const getCardClass = (isSelected: boolean) =>
    `cursor-pointer rounded-xl border-2 px-8 py-6 flex flex-col items-center gap-2 transition-all w-1/2 ${
      isSelected ? `border-blue-600 bg-blue-50 text-blue-700` : `border-gray-200 hover:border-blue-300`
    }`;

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <h1 className="font-bold text-center mb-2">Let\`s find the right account for your needs</h1>

      <form
        className="flex flex-col items-center justify-center w-1/2" //
        onSubmit={submitAccountType}
      >
        <h1 className="text-3xl font-semibold text-center">I&apos;m a</h1>

        <div className="flex gap-4 mt-4 w-full justify-evenly">
          <label htmlFor={ACCOUNT_TYPE.BUSINESS} className={getCardClass(accountType === ACCOUNT_TYPE.BUSINESS)}>
            <input
              type="radio"
              id={ACCOUNT_TYPE.BUSINESS}
              name="role"
              value={ACCOUNT_TYPE.BUSINESS}
              checked={accountType === ACCOUNT_TYPE.BUSINESS}
              onChange={handleChangeAccountType}
              className="hidden"
            />
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <rect x="4" y="3" width="16" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
              <path d="M9 9h6M9 13h6M9 17h6" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="font-semibold">BUSINESS</span>
          </label>

          <label htmlFor={ACCOUNT_TYPE.CONTRACTOR} className={getCardClass(accountType === ACCOUNT_TYPE.CONTRACTOR)}>
            <input
              type="radio"
              id={ACCOUNT_TYPE.CONTRACTOR}
              name="role"
              value={ACCOUNT_TYPE.CONTRACTOR}
              checked={accountType === ACCOUNT_TYPE.CONTRACTOR}
              onChange={handleChangeAccountType}
              className="hidden"
            />
            <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
              <path d="M3 11L12 3l9 8v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="2" />
              <rect x="8" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="font-semibold">CONTRACTOR</span>
          </label>
        </div>

        <div className="mt-6 text-start text-gray-700 w-full pt-0 pb-5">
          {accountType === ACCOUNT_TYPE.BUSINESS ? (
            <div className="w-full">
              <p className="font-medium mb-2">Sign up as a business to:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Work compliantly from 150+ countries</li>
                <li>• Automate your invoicing for every client</li>
                <li>• Avoid transfer fees with 7+ payment options</li>
                <li>• ...other business pros</li>
              </ul>
            </div>
          ) : (
            <div className="w-full">
              <p className="font-medium mb-2">Sign up as a contractor to:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Get paid faster with automated invoicing</li>
                <li>• Work with verified businesses worldwide</li>
                <li>• Manage all your clients in one place</li>
                <li>• ...and grow your freelance career</li>
              </ul>
            </div>
          )}
        </div>
        <Button type="submit" className="w-full px-10 py-2 transition-colors mt-2">
          Next
        </Button>
      </form>
    </div>
  );
}
