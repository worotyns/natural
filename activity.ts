import type { Identity } from "./identifier.ts";
import { ulid } from "./utils.ts";

// deno-lint-ignore no-explicit-any
export type AnyActivity = Activity<string, Record<string, any>>;
// deno-lint-ignore no-explicit-any
export type AnyActivityData = ActivityData<string, Record<string, any>>;

export type Activity<K, P> = {
  identity: Identity;
  value: ActivityData<K, P>;
};

export type ActivityData<K, P> = {
  k: K;
  v: P;
  t: number;
};

export function activity<K = string, P = Record<string, unknown>>(
  type: K,
  payload: P,
): Activity<K, P> {
  const identity = ulid.new();
  return {
    identity: ["activity", identity],
    value: {
      k: type,
      v: payload,
      t: ulid.getTime(identity),
    },
  };
}
