import * as crypto from 'crypto'

const hashPassword = (params = { password: ``, salt: `` }): string => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  return crypto.createHmac(`sha512`, params.salt).update(params.password).digest(`hex`)
}

const getHashingSalt = (rounds = 10) => {
  return crypto.randomBytes(Math.ceil(rounds / 2)).toString(`hex`)
}

const validatePassword = (params = { incomingPass: ``, password: ``, salt: `` }): boolean => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  const hash = crypto.createHmac(`sha512`, params.salt).update(params.incomingPass).digest(`hex`)
  return params.password === hash
}

const getConsumerFullName = (consumer: IConsumerModel): Nullable<string> => {
  if (!consumer.firstName && !consumer.lastName) return null
  return `${consumer.firstName} ${consumer.lastName}`.trim()
}

import { IConsumerModel } from '@wirebill/shared-common/models'

import { ChainedQB } from './chained-query-builder'
import { dbQuerying } from './db-querying'
import { deepDiff } from './deepDiff'
import { downloadFile } from './download-file'
import * as emailTemplating from './email-templating'
import { formatToCurrency } from './format-to-currency'
import { generateStrongPassword } from './generate-strong-password'
import { convertPlainToClassInstance } from './plainToInstance'
import { checkProvidedEnvs } from './provided-envs-checking.util'
import { removeTestObjectsFromS3 } from './remove-test-objects-from-s3'

export const commonUtils = {
  dbQuerying,
  emailTemplating,

  ChainedQB,

  checkProvidedEnvs,
  convertPlainToClassInstance,
  hashPassword,
  getHashingSalt,
  validatePassword,
  generateStrongPassword,
  removeTestObjectsFromS3,
  deepDiff,
  formatToCurrency,
  downloadFile,
  getConsumerFullName,
}
