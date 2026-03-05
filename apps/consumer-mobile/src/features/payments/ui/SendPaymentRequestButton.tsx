'use client';

import { useOptimisticMutation } from '../../../shared/hooks/useOptimistic';
import { Button } from '../../../shared/ui/Button';

interface SendPaymentRequestButtonProps {
  paymentRequestId: string;
  status?: string;
}

export function SendPaymentRequestButton({ paymentRequestId, status }: SendPaymentRequestButtonProps) {
  const canSend = status === `draft` || status === `DRAFT` || !status;

  const { mutate, isLoading } = useOptimisticMutation(
    async () => {
      const res = await fetch(`/api/payment-requests/${paymentRequestId}/send`, {
        method: `POST`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string; code?: string };
        throw new Error(data.message ?? data.code ?? `Failed to send`);
      }

      return await res.json();
    },
    {
      successMessage: `Payment request sent successfully!`,
      errorMessage: `Failed to send payment request`,
      revalidate: true,
    },
  );

  if (!canSend) return null;

  return (
    <Button
      variant="primary"
      size="lg"
      onClick={() => mutate(undefined)}
      isLoading={isLoading}
      className="flex-1"
      data-testid="send-payment-request-btn"
    >
      {isLoading ? `Sending...` : `Send request`}
    </Button>
  );
}
