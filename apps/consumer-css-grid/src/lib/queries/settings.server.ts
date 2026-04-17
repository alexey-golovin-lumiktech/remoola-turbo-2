import 'server-only';

import { fetchConsumerApi, type ConsumerApiRequestOptions } from '../consumer-api-fetch.server';
import { type ProfileResponse, type SettingsResponse } from '../consumer-api.types';

export async function getProfile(options?: ConsumerApiRequestOptions): Promise<ProfileResponse | null> {
  return fetchConsumerApi<ProfileResponse>(`/consumer/profile/me`, options);
}

export async function getSettings(options?: ConsumerApiRequestOptions): Promise<SettingsResponse | null> {
  return fetchConsumerApi<SettingsResponse>(`/consumer/settings`, options);
}
