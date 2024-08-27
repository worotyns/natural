import { identity, type NamespacedIdentity } from "./identity.ts";
import { ulid } from "./ulid.ts";

// deno-lint-ignore no-explicit-any
export type AnyActivity = Activity<string, Record<string, any>>;
// deno-lint-ignore no-explicit-any
export type AnyActivityData = ActivityData<string, Record<string, any>>;

export type Activity<K, P> = {
  identity: NamespacedIdentity;
  value: ActivityData<K, P>;
};

export type ActivityData<K, P> = {
  k: K;
  v: P;
  t: number;
};

// activity log item - for activity append log storage
export function activity<K = string, P = Record<string, unknown>>(
  type: K,
  payload: P,
): Activity<K, P> {
  const uniqueUlid = ulid.new();
  return {
    identity: identity("ns://activity", uniqueUlid),
    value: {
      k: type,
      v: payload,
      t: ulid.getTime(uniqueUlid),
    },
  };
}
