type Nullable<T> = T | null
type Unassignable<T> = T | undefined
type Nillable<T> = Nullable<T> | Unassignable<T>
type OneOfObjectKeys<T> = keyof T
type OneOfObjectValues<T> = T[keyof T]
type Generic = { [key: string]: unknown }
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: string
    NEST_APP_PORT?: string
    NEST_APP_HOST?: string
    NEST_APP_EXTERNAL_ORIGIN?: string

    POSTGRES_HOST?: string
    POSTGRES_PORT?: string
    POSTGRES_DATABASE?: string
    POSTGRES_USER?: string
    POSTGRES_PASSWORD?: string
    POSTGRES_DIALECT?: string
    POSTGRES_LOGGING?: string

    GOOGLE_API_KEY?: string
    GOOGLE_CLIENT_ID?: string
    GOOGLE_CLIENT_SECRET?: string
    GOOGLE_PROJECT_ID?: string
    GOOGLE_AUTH_URI?: string
    GOOGLE_TOKEN_URI?: string
    GOOGLE_AUTH_PROVIDER_X509_CERT_URL?: string

    JWT_SECRET?: string
    JWT_ACCESS_TOKEN_EXPIRES_IN?: string
    JWT_REFRESH_TOKEN_EXPIRES_IN?: string

    NODEMAILER_SMTP_HOST?: string
    NODEMAILER_SMTP_PORT?: string
    NODEMAILER_SMTP_USER?: string
    NODEMAILER_SMTP_USER_PASS?: string
    NODEMAILER_SMTP_DEFAULT_FROM?: string

    STRIPE_PUBLISHABLE_KEY?: string
    STRIPE_SECRET_KEY?: string

    AWS_FILE_UPLOAD_MAX_SIZE_BYTES?: string
    AWS_ACCESS_KEY_ID?: string
    AWS_SECRET_ACCESS_KEY?: string
    AWS_REGION?: string
    AWS_BUCKET?: string
  }
}
