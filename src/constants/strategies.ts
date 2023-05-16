import { ValueOf } from 'src/shared-types'

export const strategy = { Local: `local`, JWT: `jwt`, Refresh: `refresh` } as const
export type Strategy = ValueOf<typeof strategy>
