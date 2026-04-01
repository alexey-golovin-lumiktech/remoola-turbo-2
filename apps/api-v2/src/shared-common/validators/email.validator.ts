import { type ValidationOptions, ValidateBy, type ValidationArguments } from 'class-validator';

import { isValidEmail } from '@remoola/api-types';

const VALIDATOR_NAME = `isValidEmail`;

function isValidEmailValidator(value: unknown): boolean {
  return typeof value === `string` && isValidEmail(value);
}

export function IsValidEmail(validationOptions?: ValidationOptions) {
  return ValidateBy(
    {
      name: VALIDATOR_NAME,
      constraints: [],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          void args; // Required by ValidatorInterface, not used
          return isValidEmailValidator(value);
        },
        defaultMessage(args: ValidationArguments): string {
          const message = validationOptions?.message;
          if (typeof message === `string`) return message;
          if (typeof message === `function`) return message(args);
          return `Invalid email`;
        },
      },
    },
    validationOptions,
  );
}
