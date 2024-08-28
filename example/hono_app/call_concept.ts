// ulid jako osoby modul
// permissions jako osoby modul
// value objects jako osobny modul (context wrapper?)
// {scan, atom, handler} jako  z handlerem sie zastanwoic, ale sie przyda na pewno na async taski
// tylko tam trzeba builder ewentualnie jakis skleic na handlera
// atom  ma identity, value, version i do metode oraz swoj kontekst uruchomieniowy

import { monotonicUlid } from "@std/ulid";
import { sprintf } from "@std/fmt/printf";

const createLog: (...msg: string[]) => string = (...msg: string[]) => {
  return sprintf("[%s]: %s", new Date().toISOString(), msg.join(" "));
};

const measure: () => () => number = () => {
  const now = performance.now();
  return () => {
    return performance.now() - now;
  };
};

type NamespacedIdentityItem = string;
type NamespacedIdentity = `ns://${NamespacedIdentityItem}`;

type Versionstamp = string;

type AcitvityType = string;
type Activity = {
  nsid: NamespacedIdentity;
  type: AcitvityType;
  data: object;
  logs: string[];
};

type AtomActivity = Atom<Activity>;

type BaseSchema = object;

interface Atom<Schema extends BaseSchema> {
  nsid: NamespacedIdentity;
  value: Schema;
  version: Versionstamp;
  do(ctx: (ctx: AtomContext<Schema>) => Promise<AtomActivity>): Promise<void>;
}

interface AtomContext<Schema extends BaseSchema> {
  value: Schema;
  activity(type: AcitvityType, payload: object): AtomActivity;
  mutate(ctx: (value: Schema) => Voidable<Schema>): Atom<Schema>;
  atom<Schema extends BaseSchema>(
    nsid: NamespacedIdentityItem | NamespacedIdentity,
    defaults: Schema,
  ): Atom<Schema>;
}

interface StoredItem<Schema extends BaseSchema> {
  key: NamespacedIdentity;
  val: Schema;
  ver: Versionstamp;
}

type Optional<T> = T | null;
type Voidable<T> = void | T;

interface Repository {
  persist(...atoms: Array<Atom<object>>): Promise<Versionstamp>;
  restore<Schema extends BaseSchema>(
    nsid: NamespacedIdentity,
  ): Promise<Optional<StoredItem<Schema>>>;
  // enqueue()
  // handler()
  scan(
    prefix: NamespacedIdentity,
    start: NamespacedIdentity,
  ): Promise<Array<AtomActivity>>;
}

function compileIdentity(nsid: NamespacedIdentity): NamespacedIdentity {
  return nsid.replace(":ulid", monotonicUlid()) as NamespacedIdentity;
}

const store = new Map<NamespacedIdentity, StoredItem<object>>();

function memoryRepository(): Repository {
  return {
    async persist(...atoms: Array<Atom<object>>): Promise<Versionstamp> {
      const ver = Date.now().toString();
      for (const atom of atoms) {
        store.set(atom.nsid, {
          key: atom.nsid,
          val: atom.value,
          ver: ver,
        });
      }

      return ver;
    },
    async restore<Schema extends BaseSchema>(
      nsid: NamespacedIdentity,
    ): Promise<Optional<StoredItem<Schema>>> {
      return store.get(nsid) as StoredItem<Schema> || null;
    },
    async scan(
      prefix: NamespacedIdentity,
      start: NamespacedIdentity,
    ): Promise<Array<AtomActivity>> {
      return [];
    },
  };
}

interface DoCtx {
  measure(name: string): void;
  log(...msg: string[]): void;
}

function atomContext<Schema extends BaseSchema>(
  fromAtom: Atom<Schema>,
  defaults: Schema,
  doCtx: DoCtx,
): AtomContext<Schema> {
  return {
    get value(): Schema {
      return fromAtom.value;
    },

    activity: activityContext,
    mutate(mutator: (value: Schema) => Voidable<Schema>): Atom<Schema> {
      const temporary = structuredClone(fromAtom.value || defaults);
      const returned = mutator(temporary);
      fromAtom.value = returned ? returned : temporary;
      return fromAtom;
    },
    atom<Schema extends BaseSchema>(
      nsid: NamespacedIdentityItem | NamespacedIdentity,
      defaults: Schema,
    ): Atom<Schema> {
      return atom(
        compileIdentity(
          nsid.startsWith("ns://")
            ? nsid as NamespacedIdentity
            : [fromAtom.nsid, nsid].join("/") as NamespacedIdentity,
        ),
        defaults,
      );
    },
  };
}

function atomFactory<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
  repository: Repository,
): Atom<Schema> {
  return {
    nsid,
    value: structuredClone(defaults),
    version: "",
    async do(
      ctx: (ctx: AtomContext<Schema>) => Promise<AtomActivity>,
    ): Promise<void> {
      const restoredValue = await repository.restore<Schema>(nsid);

      if (restoredValue) {
        this.version = restoredValue.ver;
        this.value = structuredClone(restoredValue.val);
      }

      const logs: string[] = [];

      const atomCtx = atomContext(this, defaults, {
        measure(name: string) {
          const current = measure();
          return () => {
            const time = current();
            logs.push("[measure] " + name + ": " + time + "ms");
          };
        },
        log(...msg: string[]) {
          logs.push(createLog(...msg));
        },
      });

      const activity = await ctx(atomCtx);

      activity.value.logs.concat(logs);

      const newVersion = await repository.persist(this, activity);
      this.version = newVersion;
      activity.version = newVersion;
    },
  };
}

function atom<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
): Atom<Schema> {
  if (Deno.env.get("DENO_ENV")?.startsWith("prod")) {
    return atomFactory<Schema>(nsid, defaults, memoryRepository());
  } else {
    return atomFactory<Schema>(nsid, defaults, memoryRepository());
  }
}

/////////////// Example

interface User {
  name: string;
  maried: boolean;
  activated: boolean;
  age: number;
}

const user = atom<User>("ns://users/john@edu.pl", {
  name: "",
  age: 0,
  maried: false,
  activated: false,
});

await user.do(async (ctx: AtomContext<User>) => {
  // logger musi byc samoczynny z timestampami
  // logger musi sie zapisac nawet jak sie wyjebal proces
  // co kiedy process jest "oderwany?"
  if (ctx.value.activated) {
    return ctx.activity("user-already-activated", {
      name: ctx.value.name,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 10));

  ctx.mutate((value) => {
    value.activated = true;
    value.name = "John";
    value.age = 13;
  });

  return ctx.activity("user-created", {
    name: ctx.value.name,
  });
});

console.log(user);
