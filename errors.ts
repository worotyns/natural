import { sprintf } from "./deps.ts";

class CoreError extends Error {
  name = "CoreError";

  static format(formatString: string, ...args: unknown[]) {
    return new this().format(formatString, ...args);
  }

  constructor(message?: string, opts?: ErrorOptions) {
    super(message || "Message not specified", opts);
  }

  public format(message: string, ...args: unknown[]): this {
    this.message = sprintf(message, ...args);
    return this;
  }
}

export type { CoreError };

export class UnreachableError extends CoreError {
  name = "UnreachableError";
}

export class RuntimeError extends CoreError {
  name = "RuntimeError";
}

export class AssertionError extends CoreError {
  name = "AssertionError";
}

export class InvalidStateError extends CoreError {
  name = "InvalidStateError";
}

export class NotFoundError extends CoreError {
  name = "NotFoundError";
}

export class ValidationError extends CoreError {
  name = "ValidationError";
  constructor(errors: string[]) {
    super();
    this.message = JSON.stringify(errors, null, 2);
  }
}

export class IllegalAccessError extends CoreError {
  name = "IllegalAccessError";
}

export class UnauthorizedError extends CoreError {
  name = "UnauthorizedError";
}

export class ForbiddenError extends CoreError {
  name = "ForbiddenError";
}

export class TransactionError extends CoreError {
  name = "TransactionError";
}

export class VersionError extends CoreError {
  name = "VersionError";
}
