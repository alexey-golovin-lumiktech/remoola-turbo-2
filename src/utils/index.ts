import * as crypto from 'crypto'

export const hashPassword = (password: string, salt = ``): string => {
  if (salt.length == 0) salt = generatePasswordSalt(12)
  return crypto.createHmac(`sha512`, salt).update(password).digest(`hex`)
}

export const generatePasswordSalt = (count = 3) => {
  return Array(count).fill(null).map(() => Math.random().toString(36).slice(2)).join(``) //eslint-disable-line
}

export const verifyPassword = ({ password, dbPassword, dbSalt }): boolean => {
  const hash = crypto.createHmac(`sha512`, dbSalt).update(password).digest(`hex`).slice().trim()
  return dbPassword === hash
}
