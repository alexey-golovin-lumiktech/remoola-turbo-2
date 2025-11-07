`use client`;

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { Card } from '@remoola/ui/Card';

import AddressDetails from './address-details';
import ChooseAccountType from './choose-account-type';
import ChooseContractorKind from './choose-contractor-kind';
import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE, type IAccountType } from './context/types';
import PersonalDetails from './personal-details';
import SignupDetails from './signup-details';

export default function Signup() {
  const {
    state: { step, accountType },
  } = useSignupContext();

  const accountTypeSteps = (accountType: IAccountType) => {
    if (accountType === ACCOUNT_TYPE.CONTRACTOR) {
      return {
        2: `Sign up as a contractor`,
        3: `Personal details`,
        4: `Address`,
      };
    }
    return {
      2: `Sign up as a contractor`,
      3: `Personal details`,
      4: `Organization details`,
    };
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-2">
          {step === 0
            ? `Let\`s find the right account for your needs`
            : step === 1
              ? ``
              : accountTypeSteps(accountType)[step]}
        </h1>
        <p className="text-sm text-center text-gray-600 mb-6">Step {step}</p>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && <ChooseAccountType />}

            {accountType === ACCOUNT_TYPE.CONTRACTOR ? (
              <>
                {step === 1 && <ChooseContractorKind />}
                {step === 2 && <SignupDetails />}
                {step === 3 && <PersonalDetails />}
                {step === 4 && <AddressDetails />}
              </>
            ) : (
              <>
                {step === 1 && <SignupDetails />}
                {step === 2 && <PersonalDetails />}
                {step === 3 && <AddressDetails />}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{` `}
          <Link href="/login" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </Card>
    </div>
  );
}
