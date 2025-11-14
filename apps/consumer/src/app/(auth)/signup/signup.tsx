'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { type MouseEvent } from 'react';

import { Card } from '@remoola/ui/Card';

import AddressDetails from './address-details';
import ChooseAccountType from './choose-account-type';
import ChooseContractorKind from './choose-contractor-kind';
import { useSignupContext, ACCOUNT_TYPE } from './context/signup';
import OrganizationDetails from './organization-details';
import PersonalDetails from './personal-details';
import SignupDetails from './signup-details';
import { Stepper } from './stepper';

export default function Signup() {
  const {
    state: { step, accountType },
    action: { prevStep, manualChangeStep },
  } = useSignupContext();

  const handleBackButton = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    prevStep();
  };

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
            <div className="flex flex-row items-center justify-center mt-6 gap-40 w-full">
              {step > 0 && (
                <button type="button" onClick={handleBackButton} className="text-sm text-gray-500 hover:text-gray-700">
                  ← Prev step
                </button>
              )}
              <p className="text-center text-sm text-gray-600">
                Already have an account?{` `}
                <Link href="/login" className="text-blue-600 hover:underline">
                  Log in
                </Link>
              </p>
            </div>
            {step > 1 && <Stepper />}
          </motion.div>
        </AnimatePresence>
      </Card>
    </div>
  );
}
