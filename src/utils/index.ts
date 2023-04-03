import * as crypto from 'crypto'

export const genPass = (params = { password: ``, salt: `` }): string => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  return crypto.createHmac(`sha512`, params.salt).update(params.password).digest(`hex`)
}

export const genPassSalt = (rounds = 10) => {
  return crypto
    .randomBytes(Math.ceil(rounds / 2))
    .toString(`hex`)
    .slice(0.16)
}

export const verifyPass = (params = { incomingPass: ``, password: ``, salt: `` }): boolean => {
  if (params.password.length == 0) throw new Error(`Password could not be empty`)
  if (params.salt.length == 0) throw new Error(`Salt could not be empty`)

  const hash = crypto.createHmac(`sha512`, params.salt).update(params.incomingPass).digest(`hex`)
  return params.password === hash
}
