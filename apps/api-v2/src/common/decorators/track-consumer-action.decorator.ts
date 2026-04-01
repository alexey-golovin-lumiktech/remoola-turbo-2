import { SetMetadata } from '@nestjs/common';

export const TRACK_CONSUMER_ACTION = `trackConsumerAction` as const;

export type TrackConsumerActionOptions = {
  action: string;
  resource?: string;
  /** Optional result suffix (e.g. success/failure); can be overridden by interceptor from response. */
  result?: string;
};

export const TrackConsumerAction = (options: TrackConsumerActionOptions) => SetMetadata(TRACK_CONSUMER_ACTION, options);
