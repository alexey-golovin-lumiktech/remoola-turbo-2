type Nullable<T> = T | null
type Unassignable<T> = T | undefined
type Nillable<T> = Nullable<T> | Unassignable<T>
type OneOfObjectKeys<T> = keyof T
type OneOfObjectValues<T> = T[keyof T]
type Generic = { [key: string]: unknown }
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T
