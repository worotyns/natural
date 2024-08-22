import { RuntimeError } from "../errors.ts";
import type { IdentityInstance, IdentitySerialized } from "./identity.ts";
import { Organism } from "./organism.ts";
import { PrimitiveKind, PrimitiveValue } from "./primitive.ts";

// sortable and equalable string
export type Versionstamp = string;

// special atom collection type
export type AtomCollection = (AnyAtom & BaseAtomHelpers<unknown>)[];
// special atom record type
export type AtomMap = {
  [key: string]: AnyAtom & BaseAtomHelpers<unknown>;
};

// primitive types
export type PrimitiveObject = {
  [key: string]: Primitive | PrimitiveList;
};
export type PrimitiveList = Primitive[];
export type Primitive =
  | string
  | boolean
  | number
  | Date
  | PrimitiveObject
  | PrimitiveList;

// atom must have identity
// atom must have value
// atom must have a version stamp
export type Atom<
  ValueType,
  ValueTypeKind extends PrimitiveValue = PrimitiveValue,
> = {
  kind: PrimitiveKind.Atom;
  identity: IdentityInstance;
  value: ValueType;
  valueKind: ValueTypeKind;
  version: Versionstamp;
  // runtime: Runtime;
};

// deno-lint-ignore no-explicit-any
export type AnyAtom = Atom<any>;

export type SerializedAtomWithReferences = {
  [i: IdentitySerialized]: SerializedAtom;
};

export type SerializedAtom = {
  i: IdentitySerialized;
  k: PrimitiveValue;
  v: Primitive;
};

// base atom interface that allows mutation and persistence
type BaseAtomHelpers<V> = {
  // drop references by structured clone
  valueOf(): V;
  // ready to store in database
  serialize(
    references?: SerializedAtomWithReferences,
  ): SerializedAtomWithReferences;
  // basic primitive for updates
  mutate(value: V): void;
};

// base logic for persistence and archiving
type BaseOrganismHelpers = {
  // should be used only when persisting single instance of atom
  // in case of a molecule, should be used persist on molecule due to different transaction level
  persist(): Promise<void>;
  archive(): Promise<void>;
};

// raw atom implementation
export function atom<V, K extends PrimitiveValue, H extends BaseAtomHelpers<V>>(
  value: V,
  valueKind: K,
  identity: IdentityInstance,
  version: Versionstamp,
  helpers: H,
  organism?: Organism,
): Atom<V, K> & H & BaseOrganismHelpers {
  return {
    ...helpers,
    identity,
    kind: PrimitiveKind.Atom,
    valueKind: valueKind,
    value: value,
    version: version,
    async persist() {
      if (!organism) {
        throw new RuntimeError('Cannot persist without an organism, create atom from organism first. Then you will able to use .persist() on atom.');
      }
      const [response] = await organism.repository.persist(this);
      this.version = response.versionstamp;
    },
    async archive() {
      if (!organism) {
        throw new RuntimeError('Cannot archive without an organism, create atom from organism first. Then you will able to use .persist() on atom.');
      }
      const [response] = await organism.repository.archive(this);
      this.version = response.versionstamp;
    }
  };
}

// string atom helpers
interface StringAtomHelpers extends BaseAtomHelpers<string> {}

// interface of string atom with all helpers
export type StringAtom =
  & Atom<string, PrimitiveValue.String>
  & StringAtomHelpers;

// string atom with validation, guards and other helpers
export function string(
  value: string,
  identity: IdentityInstance,
  organism?: Organism,
): StringAtom {
  return atom<string, PrimitiveValue.String, StringAtomHelpers>(
    value,
    PrimitiveValue.String,
    identity,
    "",
    {
      mutate(this: StringAtom, newValue: string) {
        this.value = newValue;
      },
      serialize(this: StringAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf(),
          },
        };
      },
      valueOf(this: StringAtom) {
        return this.value.valueOf();
      },
    },
  );
}

// number atom helpers
export type NumberAtom =
  & Atom<number, PrimitiveValue.Number>
  & NumberAtomHelpers
  & BaseAtomHelpers<number>;

// interface of number atom with all helpers
interface NumberAtomHelpers extends BaseAtomHelpers<number> {}

// number atom with validation, guards and other helpers
export function number(
  value: number,
  identity: IdentityInstance,
  organism?: Organism,
): NumberAtom {
  return atom<number, PrimitiveValue.Number, NumberAtomHelpers>(
    value,
    PrimitiveValue.Number,
    identity,
    "",
    {
      mutate(this: NumberAtom, newValue: number) {
        this.value = newValue;
      },
      serialize(this: NumberAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf(),
          },
        };
      },
      valueOf(this: NumberAtom) {
        return this.value.valueOf();
      },
    },
  );
}

// boolean atom helpers
export type BooleanAtom =
  & Atom<boolean, PrimitiveValue.Boolean>
  & BooleanAtomHelpers
  & BaseAtomHelpers<boolean>;

// interface of boolean atom with all helpers
interface BooleanAtomHelpers extends BaseAtomHelpers<boolean> {
  toggle(): void;
  positive(): void;
  negative(): void;
}

// boolean atom with validation, guards and other helpers
export function boolean(
  value: boolean,
  identity: IdentityInstance,
  organism?: Organism,
): BooleanAtom {
  return atom<boolean, PrimitiveValue.Boolean, BooleanAtomHelpers>(
    value,
    PrimitiveValue.Boolean,
    identity,
    "",
    {
      mutate(this: BooleanAtom, newValue: boolean) {
        this.value = newValue;
      },
      serialize(this: BooleanAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf(),
          },
        };
      },
      valueOf(this: BooleanAtom) {
        return this.value.valueOf();
      },
      toggle(this: BooleanAtom) {
        this.value = !this.value;
      },
      positive(this: BooleanAtom) {
        this.value = true;
      },
      negative(this: BooleanAtom) {
        this.value = false;
      },
    },
  );
}

// date atom helpers
interface DateAtomHelpers extends BaseAtomHelpers<Date> {}

// interface of date atom with all helpers
export type DateAtom = Atom<Date, PrimitiveValue.Date> & DateAtomHelpers;

// date atom with validation, guards and other helpers
export function date(
  value: Date,
  identity: IdentityInstance,
  organism?: Organism,
): DateAtom {
  return atom<Date, PrimitiveValue.Date, DateAtomHelpers>(
    value,
    PrimitiveValue.Date,
    identity,
    "",
    {
      mutate(this: DateAtom, newValue: Date) {
        this.value = newValue;
      },
      serialize(this: DateAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf().toISOString(),
          },
        };
      },
      valueOf(this: DateAtom) {
        return new Date(this.value.getTime());
      },
    },
  );
}

// object atom helpers
interface ObjectAtomHelpers extends BaseAtomHelpers<PrimitiveObject> {}

// interface of object atom with all helpers
export type ObjectAtom =
  & Atom<PrimitiveObject, PrimitiveValue.Object>
  & ObjectAtomHelpers;

// object atom with validation, guards and other helpers
export function object(
  value: PrimitiveObject,
  identity: IdentityInstance,
  organism?: Organism,
): ObjectAtom {
  return atom<PrimitiveObject, PrimitiveValue.Object, ObjectAtomHelpers>(
    value,
    PrimitiveValue.Object,
    identity,
    "",
    {
      mutate(this: ObjectAtom, newValue: PrimitiveObject) {
        this.value = newValue;
      },
      serialize(this: ObjectAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf(),
          },
        };
      },
      valueOf(this: ObjectAtom) {
        return structuredClone(this.value);
      },
    },
  );
}

// boolean atom helpers
export type ListAtom =
  & Atom<PrimitiveList, PrimitiveValue.List>
  & ListAtomHelpers
  & BaseAtomHelpers<PrimitiveList>;

// interface of boolean atom with all helpers
interface ListAtomHelpers extends BaseAtomHelpers<PrimitiveList> {
}

// atom list, guards and other helpers
export function list(
  value: PrimitiveList,
  identity: IdentityInstance,
  organism?: Organism,
): ListAtom {
  return atom<PrimitiveList, PrimitiveValue.List, ListAtomHelpers>(
    value,
    PrimitiveValue.List,
    identity,
    "",
    {
      mutate(this: ListAtom, newValue: PrimitiveList) {
        this.value = newValue;
      },
      serialize(this: ListAtom) {
        return {
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: this.valueOf(),
          },
        };
      },
      valueOf(this: ListAtom) {
        return structuredClone(this.value.valueOf()) as PrimitiveList;
      },
    },
  );
}

// collection atom helpers
export type CollectionAtom =
  & Atom<AtomCollection, PrimitiveValue.Collection>
  & CollectionAtomHelpers
  & BaseAtomHelpers<AtomCollection>;

// interface of collection atom with all helpers
interface CollectionAtomHelpers extends BaseAtomHelpers<AtomCollection> {
}

// atom collection, guards and other helpers
export function collection(
  value: AtomCollection,
  identity: IdentityInstance,
  organism?: Organism,
): CollectionAtom {
  return atom<AtomCollection, PrimitiveValue.Collection, CollectionAtomHelpers>(
    value,
    PrimitiveValue.Collection,
    identity,
    "",
    {
      mutate(this: CollectionAtom, newValue: AtomCollection) {
        this.value = newValue;
      },
      serialize(
        this: CollectionAtom,
        references: SerializedAtomWithReferences = {},
      ) {
        for (const atom of this.value) {
          const reference = atom.identity.serialize();
          if (reference in references) {
            throw new RuntimeError(
              "Cannot serialize atoms, with same identity: " + reference,
            );
          }

          references[reference] = atom.serialize(references)[reference];
        }

        return {
          ...references,
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: Object.keys(references),
          },
        };
      },
      valueOf(this: CollectionAtom) {
        return this.value.valueOf() as AtomCollection;
      },
    },
  );
}

// map atom helpers
export type MapAtom =
  & Atom<AtomMap, PrimitiveValue.Map>
  & MapAtomHelpers
  & BaseAtomHelpers<AtomMap>;

// interface of map atom with all helpers
interface MapAtomHelpers extends BaseAtomHelpers<AtomMap> {
  has(key: string): boolean;
  set(key: string, val: AnyAtom): void;
  del(key: string): void;
  get(key: string): null | AnyAtom;
}

// atom collection, guards and other helpers
export function map(
  value: AtomMap,
  identity: IdentityInstance,
  organism?: Organism,
): MapAtom {
  return atom<AtomMap, PrimitiveValue.Map, MapAtomHelpers>(
    value,
    PrimitiveValue.Map,
    identity,
    "",
    {
      del(this: MapAtom, key: string) {
        delete this.value[key];
      },
      get(this: MapAtom, key: string) {
        return this.value[key] || null;
      },
      has(this: MapAtom, key: string) {
        return key in this.value;
      },
      set(this: MapAtom, key: string, val: AnyAtom & BaseAtomHelpers<unknown>) {
        this.value[key] = val;
      },
      mutate(this: MapAtom, newValue: AtomMap) {
        this.value = newValue;
      },
      serialize(this: MapAtom, references: SerializedAtomWithReferences = {}) {
        for (const key in this.value) {
          const atom = this.value[key];
          const reference = atom.identity.serialize();
          if (reference in references) {
            throw new RuntimeError(
              "Cannot serialize atoms, with same identity: " + reference,
            );
          }

          references[key] = atom.serialize(references)[reference];
        }

        return {
          ...Object.keys(references).reduce((res, val) => {
            res[references[val].i] = references[val];
            return res;
          }, {} as Record<string, SerializedAtom>),
          [this.identity.serialize()]: {
            i: this.identity.serialize(),
            k: this.valueKind,
            v: Object.keys(references).reduce((res, val) => {
              res[val] = references[val].i;
              return res;
            }, {} as Record<string, string>),
          },
        };
      },
      valueOf(this: MapAtom) {
        return this.value.valueOf() as AtomMap;
      },
    },
  );
}
