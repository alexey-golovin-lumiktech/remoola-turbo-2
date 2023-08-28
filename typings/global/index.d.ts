type Nullable<T> = T | null
type Unassignable<T> = T | undefined
type Nillable<T> = Nullable<T> | Unassignable<T>
type OneOfObjectKeys<T> = keyof T
type OneOfObjectValues<T> = T[keyof T]
type Generic = { [key: string]: unknown }
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: any
    NEST_APP_PORT: any
    NEST_APP_HOST: any
    NEST_APP_EXTERNAL_ORIGIN: any

    POSTGRES_HOST: any
    POSTGRES_PORT: any
    POSTGRES_DATABASE: any
    POSTGRES_USER: any
    POSTGRES_PASSWORD: any
    POSTGRES_DIALECT: any
    POSTGRES_LOGGING: any

    GOOGLE_API_KEY: any
    GOOGLE_CLIENT_ID: any
    GOOGLE_CLIENT_SECRET: any
    GOOGLE_PROJECT_ID: any
    GOOGLE_AUTH_URI: any
    GOOGLE_TOKEN_URI: any
    GOOGLE_AUTH_PROVIDER_X509_CERT_URL: any

    JWT_SECRET: any
    JWT_ACCESS_TOKEN_EXPIRES_IN: any
    JWT_REFRESH_TOKEN_EXPIRES_IN: any

    NODEMAILER_SMTP_HOST: any
    NODEMAILER_SMTP_PORT: any
    NODEMAILER_SMTP_USER: any
    NODEMAILER_SMTP_USER_PASS: any
    NODEMAILER_SMTP_DEFAULT_FROM: any

    STRIPE_PUBLISHABLE_KEY: any
    STRIPE_SECRET_KEY: any

    AWS_FILE_UPLOAD_MAX_SIZE_BYTES: any
    AWS_ACCESS_KEY_ID: any
    AWS_SECRET_ACCESS_KEY: any
    AWS_REGION: any
    AWS_BUCKET: any
  }
}
