const code = {
  NO_REFRESH_TOKEN: `NO_REFRESH_TOKEN`,
  INVALID_CREDENTIALS: `INVALID_CREDENTIALS`,
  FAIL_CREATE_CONTRACT: `FAIL_CREATE_CONTRACT`,
  PAYMENTS_PROCESSOR_FAILURE: `PAYMENTS_PROCESSOR_FAILURE`,
} as const;
export type ICode = (typeof code)[keyof typeof code];

const codeMessage = {
  [code.NO_REFRESH_TOKEN]: `No refresh token`,
  [code.INVALID_CREDENTIALS]: `Invalid credentials`,
  [code.FAIL_CREATE_CONTRACT]: `Something went wrong for create contract`,
  [code.PAYMENTS_PROCESSOR_FAILURE]: `Payments processor temporary failure`,
} as const;
export type IMessage = (typeof codeMessage)[keyof typeof codeMessage];

const NO_REFRESH_TOKEN = {
  code: code.NO_REFRESH_TOKEN,
  message: codeMessage[code.NO_REFRESH_TOKEN],
} as const;

const FAIL_CREATE_CONTRACT = {
  code: code.FAIL_CREATE_CONTRACT,
  message: codeMessage[code.FAIL_CREATE_CONTRACT],
};

const PAYMENTS_PROCESSOR_FAILURE = {
  code: code.PAYMENTS_PROCESSOR_FAILURE,
  message: codeMessage[code.PAYMENTS_PROCESSOR_FAILURE],
};

const INVALID_CREDENTIALS = {
  code: code.INVALID_CREDENTIALS,
  message: codeMessage[code.INVALID_CREDENTIALS],
} as const;

export const errors = {
  NO_REFRESH_TOKEN,
  INVALID_CREDENTIALS,
  FAIL_CREATE_CONTRACT,
  PAYMENTS_PROCESSOR_FAILURE,
} as const;

export const errorCodeMessageLookup = Object.fromEntries(
  Object.values(errors)
    .filter((val) => typeof val == `object`)
    .map((val) => [val.message, val.code]),
);
