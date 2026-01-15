'use client';

import { useEffect, useState } from 'react';

import { JsonView } from '../../../../components/JsonView';
import { type Consumer } from '../../../../lib/types';

export default function ConsumerDetailsPage(props: { params: Promise<{ adminId: string }> }) {
  const [consumer, setConsumer] = useState<Consumer | null>(null);

  useEffect(() => {
    async function getConsumer(consumerId: string): Promise<Consumer | null> {
      const response = await fetch(`/api/consumers/${consumerId}`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return null;
      return (await response.json()) as Consumer;
    }

    props.params.then((params) => getConsumer(params.adminId)).then(setConsumer);
  }, [props]);

  if (!consumer) return <div className="text-sm text-gray-600">Consumer not found</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500">Consumer</div>
        <h1 className="text-2xl font-semibold">{consumer.email}</h1>
        <div className="mt-1 text-sm text-gray-700">
          {consumer.accountType}
          {consumer.contractorKind ? ` / ${consumer.contractorKind}` : ``}
          {consumer.stripeCustomerId ? ` • Stripe: ${consumer.stripeCustomerId}` : ``}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Personal Details</div>
          <div className="mt-3">
            {consumer.personalDetails ? (
              <JsonView value={consumer.personalDetails} />
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Organization Details</div>
          <div className="mt-3">
            {consumer.organizationDetails ? (
              <JsonView value={consumer.organizationDetails} />
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">Address Details</div>
          <div className="mt-3">
            {consumer.addressDetails ? (
              <JsonView value={consumer.addressDetails} />
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm font-semibold">GoogleProfile Details</div>
          <div className="mt-3">
            {consumer.googleProfileDetails ? (
              <JsonView value={consumer.googleProfileDetails} />
            ) : (
              <div className="text-sm text-gray-500">—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
