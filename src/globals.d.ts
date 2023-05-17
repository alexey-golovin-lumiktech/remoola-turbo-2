type Nullable<T> = T | null
type Unassignable<T> = T | undefined
type Nillable<T> = Nullable<T> | Unassignable<T>
type Generic = { [key: string]: any }
type ValueOf<T> = T[keyof T]
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T
type DeepPartialGeneric<T extends Generic = Generic> = DeepPartial<T>
