import { KnexCount } from '@wirebill/shared-common/types'

export const dbQuerying = {
  makeSqlIn: (arr: (string | number)[]): string => arr.map(x => `'${x}'`).join(`,`),
  getKnexCount: ([knexCount]: KnexCount[]): number => (knexCount?.count ? Number(knexCount.count) : 0),
}
