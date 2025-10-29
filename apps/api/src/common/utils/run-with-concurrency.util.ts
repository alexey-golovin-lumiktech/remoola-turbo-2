import { type Logger } from '@nestjs/common';

export const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
  logger: Logger | Console = console,
) => {
  let i = 0,
    active = 0;
  const errors: Array<{ item: T; error: unknown }> = [];

  return new Promise<void>((resolve) => {
    const kick = () => {
      while (active < limit && i < items.length) {
        const item = items[i++];
        active++;
        worker(item)
          .catch((error) => errors.push({ item, error }))
          .finally(() => {
            active--;
            if (i < items.length) kick();
            else if (active == 0) {
              if (errors.length) for (const e of errors) logger.error(e.error);
              resolve();
            }
          });
      }
      if (items.length == 0) resolve();
    };
    kick();
  });
};

export const CLEANUP_MAX_ATTEMPTS = 2;
export const DELETE_CONCURRENCY = 12;
