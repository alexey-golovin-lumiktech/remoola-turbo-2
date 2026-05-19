class AuthSessionRotationConflictError extends Error {
  constructor(scope: `Admin` | `Consumer`) {
    super(`${scope} auth session rotation lost the compare-and-swap guard`);
    this.name = `${scope}AuthSessionRotationConflictError`;
  }
}

export class AdminAuthSessionRotationConflictError extends AuthSessionRotationConflictError {
  constructor() {
    super(`Admin`);
  }
}

export class ConsumerAuthSessionRotationConflictError extends AuthSessionRotationConflictError {
  constructor() {
    super(`Consumer`);
  }
}
