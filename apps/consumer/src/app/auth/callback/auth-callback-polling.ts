export const AUTH_CALLBACK_MAX_SESSION_POLLS = 20;
export const AUTH_CALLBACK_SESSION_POLL_DELAY_MS = 500;

type PollForAuthCallbackSessionOptions = {
  poll: () => Promise<boolean>;
  sleep?: (delayMs: number) => Promise<void>;
  maxPolls?: number;
  isCancelled?: () => boolean;
};

function defaultSleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export function getAuthCallbackSessionPollDelayMs(attempt: number): number {
  void attempt;
  return AUTH_CALLBACK_SESSION_POLL_DELAY_MS;
}

export async function pollForAuthCallbackSession({
  poll,
  sleep = defaultSleep,
  maxPolls = AUTH_CALLBACK_MAX_SESSION_POLLS,
  isCancelled,
}: PollForAuthCallbackSessionOptions): Promise<boolean> {
  const safeMaxPolls = Math.max(1, Math.floor(maxPolls));

  for (let attempt = 0; attempt < safeMaxPolls; attempt++) {
    if (isCancelled?.()) return false;
    if (await poll()) return true;
    if (attempt >= safeMaxPolls - 1) return false;
    await sleep(getAuthCallbackSessionPollDelayMs(attempt));
  }

  return false;
}
