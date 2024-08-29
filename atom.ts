import { identity } from "./identity.ts";
import { createMonitoredObject } from "./proxy.ts";
import { createLog, measure } from "./utils.ts";

export type NamespacedIdentityItem = string;
export type NamespacedIdentity = `ns://${NamespacedIdentityItem}`;

export type Versionstamp = string;

type AcitvityType = string;
type Activity = {
  nsid: NamespacedIdentity;
  type: AcitvityType;
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
  fetch(): Promise<Atom<Schema>>;
  do<Params extends BaseSchema = Record<string, never>>(
    activityType: AcitvityType,
    ctx: (ctx: AtomContext<Schema, Params>) => Promise<void>,
    params: Params,
  ): Promise<AtomActivity>;
}

export interface AtomContext<
  Schema extends BaseSchema,
  Params extends BaseSchema,
> {
  value: Schema;
  params: Params;
  activity: ActivityContext;
  step(
    name: string,
    ctx: (value: Schema) => Voidable<Schema> | Promise<Voidable<Schema>>,
  ): Promise<Atom<Schema>>;
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
  success(type: AcitvityType, payload: Optional<object>): void;
  failure(type: AcitvityType, payload: Optional<object>): void;
}

function atomContext<
  Schema extends BaseSchema,
  Params extends BaseSchema = Record<string, never>,
>(
  fromAtom: Atom<Schema>,
  defaults: Schema,
  activityContext: ActivityContext,
  repository: Repository,
  params: Params,
): AtomContext<Schema, Params> {
  return {
    get value(): Schema {
      return fromAtom.value;
    },
    params: structuredClone(params),
    activity: activityContext,
    async step(
      name: string,
      mutator: (value: Schema) => Voidable<Schema> | Promise<Voidable<Schema>>,
    ): Promise<Atom<Schema>> {
      activityContext.log(`[step: ${name}]`, "processing");

      const temporary = structuredClone(fromAtom.value || defaults);
      
      const diff: Record<string, unknown> = {};

      const call = mutator(createMonitoredObject(temporary, (op: string, prop: string, val: unknown, old: unknown) => {
        diff[prop] = val;
        activityContext.log(`[step: ${name}]`, `${op} on ${prop}: old = ${old}, new = ${val}`);
      }));
      
      const promisedCall: Promise<Voidable<Schema>> = ("then" in (call || {}))
        ? call as Promise<Voidable<Schema>>
        : Promise.resolve(call);

      const returned = await promisedCall
        .then((value) => {
          activityContext.success(name, diff);
          return value;
        })
        .catch((error) => {
          activityContext.failure(name, {
            name: error.name,
            message: error.message,
          });
          throw error;
        });

      fromAtom.value = returned ? returned : temporary;
      activityContext.log(`[step: ${name}]`, "finished");
      return fromAtom;
    },
    atom<Schema extends BaseSchema>(
      nsid: NamespacedIdentityItem | NamespacedIdentity,
      defaults: Schema,
    ): Atom<Schema> {
      return atomFactory(
        identity(
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
    identity("ns://activity/:ulid"),
    {
      nsid,
      type: "",
      logs: [],
      results: {},
    },
    repository,
  );

  let lastLogTime = 0;

  const log = (...msg: string[]): void => {
    const current = getCurrentRunTime();
    activity.value.logs.push(
      createLog(
        `[${current.toFixed(2)}ms|${(current - lastLogTime).toFixed(2)}ms]`,
        ...msg,
      ),
    );
    lastLogTime = current;
  };

  const result = (
    type: AcitvityType,
    success: boolean,
    value: unknown,
  ): void => {
    log(`[step: ${type}]`, success ? "success" : "failure");
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
      result(type, false, structuredClone(payload));
    },
    success(type: AcitvityType, payload: object): void {
      result(type, true, structuredClone(payload));
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
    nsid: identity(nsid),
    value: structuredClone(defaults),
    version: "",
    async fetch(): Promise<Atom<Schema>> {
      const restoredValue = await repository.restore<Schema>(nsid);

      if (restoredValue) {
        this.version = restoredValue.ver;
        this.value = structuredClone(restoredValue.val) as Schema;
      }

      return this;
    },
    async do<Params extends BaseSchema = Record<string, never>>(
      activityType: AcitvityType,
      callback: (ctx: AtomContext<Schema, Params>) => Promise<void>,
      params: Params,
    ): Promise<AtomActivity> {
      const activityCtx = activityContext(nsid, repository);
      activityCtx.type(activityType);

      activityCtx.log("[atom]", "restoring...");

      const restoredValue = await repository.restore<Schema>(nsid);

      if (restoredValue) {
        activityCtx.log("[atom]", "restored success");
        this.version = restoredValue.ver;
        this.value = structuredClone(restoredValue.val);
      } else {
        activityCtx.log("[atom]", "restored failed, not found");
      }

      const atomCtx = atomContext(
        this,
        defaults,
        activityCtx,
        repository,
        params,
      );

      await callback(atomCtx)
        .then(async () => {
          activityCtx.log("[atom]", "persisting...");
          const newVersion = await repository.persist(
            this,
            activityCtx.activity,
          );
          this.version = newVersion;
          activityCtx.log("[atom]", "persisted version: " + newVersion);
        })
        .catch(async (error) => {
          // TODO: handle custom errors and map to activity?
          activityCtx.failure("error", error.message);
          await repository.persist(activityCtx.activity);
        });

      return activityCtx.activity;
    },
  };
}
