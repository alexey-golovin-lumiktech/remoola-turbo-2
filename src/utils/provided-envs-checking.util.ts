import * as dotenv from 'dotenv'
import * as fs from 'fs'

import { getEnvPath } from '@wirebill/shared-common/utils'

const customEnvironmentNames = [
  `NODE_ENV`,
  `NEST_APP_PORT`,
  `NEST_APP_HOST`,
  `NEST_APP_EXTERNAL_ORIGIN`,

  `POSTGRES_HOST`,
  `POSTGRES_PORT`,
  `POSTGRES_DATABASE`,
  `POSTGRES_USER`,
  `POSTGRES_PASSWORD`,
  `POSTGRES_DIALECT`,
  `POSTGRES_LOGGING`,

  `GOOGLE_API_KEY`,
  `GOOGLE_CLIENT_ID`,
  `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_PROJECT_ID`,
  `GOOGLE_AUTH_URI`,
  `GOOGLE_TOKEN_URI`,
  `GOOGLE_AUTH_PROVIDER_X509_CERT_URL`,

  `JWT_SECRET`,
  `JWT_ACCESS_TOKEN_EXPIRES_IN`,
  `JWT_REFRESH_TOKEN_EXPIRES_IN`,

  `NODEMAILER_SMTP_HOST`,
  `NODEMAILER_SMTP_PORT`,
  `NODEMAILER_SMTP_USER`,
  `NODEMAILER_SMTP_USER_PASS`,
  `NODEMAILER_SMTP_DEFAULT_FROM`,

  `STRIPE_PUBLISHABLE_KEY`,
  `STRIPE_SECRET_KEY`,

  `AWS_FILE_UPLOAD_MAX_SIZE_BYTES`,
  `AWS_ACCESS_KEY_ID`,
  `AWS_SECRET_ACCESS_KEY`,
  `AWS_REGION`,
  `AWS_BUCKET`,
]

export const checkProvidedEnvs = (inDirectory: typeof __dirname) => () => {
  const NBSP = `\u00A0`
  const path: string = getEnvPath(inDirectory)
  if (path && fs.existsSync(path)) dotenv.config({ path })

  const head = `\n********* CHECKING REQUIRED ENVIRONMENTS ***********`
  const tail = `********* CHECKING REQUIRED ENVIRONMENTS ***********\n`
  const status = `[!!! CHECK STATUS]`.padEnd(45, NBSP)
  const failMsg = status + `- FAILED`
  const successMsg = status + `- SUCCESS`
  const detectedEnvFilePath = `[!!! FILE] ::`.padEnd(45, NBSP) + `- ${path}`

  let collector: string[] = []
  for (const name of customEnvironmentNames) {
    if (!process.env[name]) {
      collector.push(`process.env.${name}`.padEnd(45, NBSP) + `- is not specified`)
    }
  }

  if (collector.length) collector = [head, failMsg, detectedEnvFilePath, ...collector, tail]
  else collector = [head, successMsg, detectedEnvFilePath, ...collector, tail]
  collector.forEach((msg: string) => console.log(`${msg}`))
}
