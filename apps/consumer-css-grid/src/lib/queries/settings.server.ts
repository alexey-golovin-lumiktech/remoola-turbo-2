import 'server-only';

import { type ConsumerProfileResponse, type ConsumerSettingsResponse } from '@remoola/api-types';

import { fetchConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';

export async function getProfile(options?: ConsumerApiRequestOptions): Promise<ConsumerProfileResponse | null> {
  return fetchConsumerApi<ConsumerProfileResponse>(`/consumer/profile/me`, options);
}

export async function getSettings(options?: ConsumerApiRequestOptions): Promise<ConsumerSettingsResponse | null> {
  return fetchConsumerApi<ConsumerSettingsResponse>(`/consumer/settings`, options);
}
