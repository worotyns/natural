import { RuntimeError } from "./errors.ts";
import type { Identity, IdentityItem } from "./identifier.ts";

export type Atom<T = unknown> = {
  name: IdentityItem;
  value: T;
  version: string;
  identity: Identity;
  wasPersisted: boolean;
  wasModified(): boolean;
  mutate(newValue: T): void;
};

// deno-lint-ignore no-explicit-any
export type AnyAtom = Atom<any>;

// basic primitive
export const atom = <T = unknown>(
  name: IdentityItem | Identity,
  value: T,
  version = "",
): AnyAtom => {
  const prevValues: T[] = [];
  const [key, identity] = Array.isArray(name)
    ? [name[name.length - 1], name]
    : [name, [name]];
  return {
    name: key,
    value,
    version,
    identity: identity,
    wasPersisted: false,
    wasModified() {
      return prevValues.length > 0 && !prevValues.includes(value);
    },
    mutate(newVal: T): void {
      if (this.wasPersisted) {
        throw new RuntimeError(
          "Cannot persist once persisted atom, restore first and then persist again",
        );
      }
      prevValues.push(newVal);
      this.value = newVal;
    },
  };
};
export const isAtom = (item: unknown): item is AnyAtom => {
  return typeof item === "object" && item !== null && "name" in item &&
    "value" in item;
};
