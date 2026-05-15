import { type $Enums } from '@remoola/database-2';

import { type IBaseModel } from '../models';

export type WithoutDeletedAt<T> = T extends IBaseModel ? Omit<T, `deletedAt`> : T;
export type OnlyUpsertFields<T> = T extends IBaseModel & { consumerId?: string } //
  ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `consumerId` | `metadata`>
  : T extends IBaseModel
    ? Omit<T, `id` | `createdAt` | `updatedAt` | `deletedAt` | `metadata`>
    : T;

export type IGetConsumerBallanceResult = { currencyCode: $Enums.CurrencyCode; amount: number };
export type IGetConsumerBallanceParams = { consumerId: string; currencyCode?: $Enums.CurrencyCode };

export type CreditCardExpMonth = `1` | `2` | `3` | `4` | `5` | `6` | `7` | `8` | `9` | `10` | `11` | `12`;
export type CreditCardExpYear =
  `20${`2` | `3` | `4` | `5` | `6` | `7` | `8` | `9`}${`3` | `4` | `5` | `6` | `7` | `8` | `9`}`;
