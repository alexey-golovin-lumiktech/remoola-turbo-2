'use client';

import { useRouter } from 'next/navigation';

import { CreatePaymentRequestForm, type CreatePaymentRequestFormProps } from './CreatePaymentRequestForm';
import { Panel } from '../../../shared/ui/shell-primitives';

type Props = {
  contacts: CreatePaymentRequestFormProps[`contacts`];
  currencies: CreatePaymentRequestFormProps[`currencies`];
  preferredCurrency: string;
};

export function CreatePaymentRequestPanel({ contacts, currencies, preferredCurrency }: Props) {
  const router = useRouter();

  return (
    <Panel title="Request a payment" aside="Create a new receivable">
      <CreatePaymentRequestForm
        contacts={contacts}
        currencies={currencies}
        preferredCurrency={preferredCurrency}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </Panel>
  );
}
