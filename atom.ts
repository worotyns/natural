import { createLog, measure, ulid } from "./utils.ts";

type NamespacedIdentityItem = string;
export type NamespacedIdentity = `ns://${NamespacedIdentityItem}`;

function compileIdentity(nsid: NamespacedIdentity): NamespacedIdentity {
  return nsid.replace(":ulid", ulid()) as NamespacedIdentity;
}

export type Versionstamp = string;

type AcitvityType = string;
type Activity = {
  nsid: NamespacedIdentity;
  type: AcitvityType;
  data: object;
  logs: string[];
  results: {
    [k: string]: {
      success: boolean;
      value: unknown;
    };
  };
};

export type AtomActivity = Atom<Activity>;

export type BaseSchema = object;

export interface Atom<Schema extends BaseSchema> {
  nsid: NamespacedIdentity;
  value: Schema;
  version: Versionstamp;
  do(ctx: (ctx: AtomContext<Schema>) => Promise<void>): Promise<void>;
}

interface AtomContext<Schema extends BaseSchema> {
  value: Schema;
  activity: ActivityContext;
  mutate(ctx: (value: Schema) => Voidable<Schema>): Atom<Schema>;
  atom<Schema extends BaseSchema>(
    nsid: NamespacedIdentityItem | NamespacedIdentity,
    defaults: Schema,
  ): Atom<Schema>;
}

export interface StoredItem<Schema extends BaseSchema> {
  key: NamespacedIdentity;
  val: Schema;
  ver: Versionstamp;
}

export interface Repository {
  persist(...atoms: Array<Atom<BaseSchema>>): Promise<Versionstamp>;
  restore<Schema extends BaseSchema>(
    nsid: NamespacedIdentity,
  ): Promise<Optional<StoredItem<Schema>>>;
  scan(
    prefix: NamespacedIdentity,
    start: NamespacedIdentity,
  ): Promise<Array<AtomActivity>>;
}

export type Optional<T> = T | null;
export type Voidable<T> = void | T;

interface ActivityContext {
  activity: AtomActivity;
  log(...msg: string[]): void;
  type(type: AcitvityType): void;
  success(type: AcitvityType, payload: object): void;
  failure(type: AcitvityType, payload: object): void;
}

function atomContext<Schema extends BaseSchema>(
  fromAtom: Atom<Schema>,
  defaults: Schema,
  activityContext: ActivityContext,
  repository: Repository,
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
      return atomFactory(
        compileIdentity(
          nsid.startsWith("ns://")
            ? nsid as NamespacedIdentity
            : [fromAtom.nsid, nsid].join("/") as NamespacedIdentity,
        ),
        defaults,
        repository,
      );
    },
  };
}

function activityContext(
  nsid: NamespacedIdentity,
  repository: Repository,
): ActivityContext {
  const getCurrentRunTime = measure();

  const activity = atomFactory<Activity>(
    compileIdentity("ns://activity/:ulid"),
    {
      nsid,
      type: "",
      data: {},
      logs: [],
      results: {},
    },
    repository,
  );

  const log = (...msg: string[]): void => {
    activity.value.logs.push(
      createLog(`[${getCurrentRunTime().toFixed(2)}ms]`, ...msg),
    );
  };

  const result = (
    type: AcitvityType,
    success: boolean,
    value: unknown,
  ): void => {
    log(`[${type}]`, success ? "success" : "failure");
    activity.value.results[type] = {
      success,
      value: value,
    };
  };

  return {
    activity: activity,
    type(type: AcitvityType): void {
      activity.value.type = type;
    },
    failure(type: AcitvityType, payload: object): void {
      result(type, false, payload);
    },
    success(type: AcitvityType, payload: object): void {
      result(type, true, payload);
    },
    log,
  };
}

export function atomFactory<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
  repository: Repository,
): Atom<Schema> {
  return {
    nsid,
    value: structuredClone(defaults),
    version: "",
    async do(
      callback: (ctx: AtomContext<Schema>) => Promise<void>,
    ): Promise<void> {
      const activityCtx = activityContext(nsid, repository);
      activityCtx.log("restoring...");

      const restoredValue = await repository.restore<Schema>(nsid);

      if (restoredValue) {
        activityCtx.success("restore", restoredValue);
        this.version = restoredValue.ver;
        this.value = structuredClone(restoredValue.val);
      } else {
        activityCtx.failure("restore", {
          reason: "not found",
        });
      }

      const atomCtx = atomContext(this, defaults, activityCtx, repository);

      await callback(atomCtx)
        .then(async () => {
          activityCtx.log("persisting...");
          const newVersion = await repository.persist(
            this,
            activityCtx.activity,
          );
          this.version = newVersion;
          activityCtx.log("persisted version: " + newVersion);
        })
        .catch(async (error) => {
          // TODO: handle custom errors and map to activity?
          activityCtx.failure("error", error.message);
          await repository.persist(activityCtx.activity);
          console.error(error);
        });
    },
  };
}
