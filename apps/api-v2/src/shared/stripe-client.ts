import Stripe from 'stripe';

import { envs } from '../envs';

export const STRIPE_CLIENT = `STRIPE_CLIENT`;

export function createStripeClient(): Stripe {
  return new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
}
