import { AssertionError, type CoreError } from "./errors.ts";

export function assert(
  expr: unknown,
  coreErrorOrMsg: string | CoreError,
): asserts expr {
  if (!expr) {
    if (typeof coreErrorOrMsg === "string") {
      throw new AssertionError(coreErrorOrMsg);
    }

    throw coreErrorOrMsg;
  }
}
