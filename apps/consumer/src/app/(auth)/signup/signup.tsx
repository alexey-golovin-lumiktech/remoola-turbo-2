'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { Card } from '@remoola/ui/Card';

import AddressDetails from './address-details';
import ChooseAccountType from './choose-account-type';
import ChooseContractorKind from './choose-contractor-kind';
import { useSignupContext } from './context/hooks';
import { ACCOUNT_TYPE } from './context/types';
import OrganizationDetails from './organization-details';
import PersonalDetails from './personal-details';
import SignupDetails from './signup-details';

export default function Signup() {
  const {
    state: { step, accountType },
  } = useSignupContext();

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Card className="w-full p-8 shadow-lg flex flex-col justify-center ">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 && <ChooseAccountType />}
            {step === 1 && accountType === ACCOUNT_TYPE.CONTRACTOR && <ChooseContractorKind />}

            {accountType === ACCOUNT_TYPE.CONTRACTOR ? (
              <>
                {step === 2 && <SignupDetails />}
                {step === 3 && <PersonalDetails />}
                {step === 4 && <AddressDetails />}
              </>
            ) : (
              <>
                {step === 1 && <SignupDetails />}
                {step === 2 && <PersonalDetails />}
                {step === 3 && <OrganizationDetails />}
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
