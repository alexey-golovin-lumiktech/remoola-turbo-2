export type Nullable<T> = T | null
export type Unassignable<T> = T | undefined
export type Nillable<T> = Nullable<T> | Unassignable<T>
export type Generic = { [key: string]: any }
export type ValueOf<T> = T[keyof T]
export type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T
export type DeepPartialGeneric<T extends Generic = Generic> = DeepPartial<T>
