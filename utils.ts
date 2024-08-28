import { sprintf } from "@std/fmt/printf";
import { monotonicUlid } from "@std/ulid";
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

export const createLog: (...msg: string[]) => string = (...msg: string[]) => {
  return sprintf("[%s]: %s", new Date().toISOString(), msg.join(" "));
};

export const measure: () => () => number = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

export { sprintf };

export const ulid = monotonicUlid;
