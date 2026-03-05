'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import { toast } from 'sonner';

interface OptimisticOptions<T> {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  revalidate?: boolean;
}

export function useOptimisticMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: OptimisticOptions<TData> = {},
) {
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const mutate = useCallback(
    async (variables: TVariables) => {
      setIsLoading(true);
      const loadingToast = options.successMessage ? toast.loading(`Processing...`) : undefined;

      try {
        const result = await mutationFn(variables);

        if (loadingToast) {
          toast.dismiss(loadingToast);
        }

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        if (options.onSuccess) {
          options.onSuccess(result);
        }

        if (options.revalidate !== false) {
          startTransition(() => {
            router.refresh();
          });
        }

        setIsLoading(false);
        return { ok: true as const, data: result };
      } catch (error) {
        if (loadingToast) {
          toast.dismiss(loadingToast);
        }

        const errorMessage = options.errorMessage ?? (error instanceof Error ? error.message : `An error occurred`);

        toast.error(errorMessage);

        if (options.onError && error instanceof Error) {
          options.onError(error);
        }

        setIsLoading(false);
        return { ok: false as const, error };
      }
    },
    [mutationFn, options, router],
  );

  return {
    mutate,
    isLoading: isLoading || isPending,
    isPending,
  };
}

export function useOptimisticState<T>(initialState: T) {
  const [optimisticState, setOptimisticState] = useState<T>(initialState);
  const [actualState, setActualState] = useState<T>(initialState);

  const setOptimistic = useCallback((newState: T | ((prev: T) => T)) => {
    setOptimisticState(newState);
  }, []);

  const commitState = useCallback((newState: T) => {
    setActualState(newState);
    setOptimisticState(newState);
  }, []);

  const rollback = useCallback(() => {
    setOptimisticState(actualState);
  }, [actualState]);

  return {
    state: optimisticState,
    setOptimistic,
    commitState,
    rollback,
  };
}
