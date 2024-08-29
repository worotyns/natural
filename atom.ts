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
  time: string;
  result: {
    success: boolean;
    value: unknown;
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
  contextAtoms: Array<Atom<BaseSchema>>;
  log(...msg: string[]): void;
  type(type: AcitvityType): void;
  success(type: AcitvityType, payload: Optional<object>): void;
  failure(type: AcitvityType, payload: Optional<object>): void;
}

function atomContext<
  Schema extends BaseSchema,
  Params extends BaseSchema = Record<string, never>,
>(
  parentNsid: NamespacedIdentity,
  temporaryValue: Schema,
  activityContext: ActivityContext,
  repository: Repository,
  params: Params,
): AtomContext<Schema, Params> {
  return {
    get value(): Schema {
      return temporaryValue;
    },
    params: structuredClone(params),
    activity: activityContext,
    atom<Schema extends BaseSchema>(
      nsid: NamespacedIdentityItem | NamespacedIdentity,
      defaults: Schema,
    ): Atom<Schema> {
      const freshAtomReference = atomFactory(
        identity(
          nsid.startsWith("ns://")
            ? nsid as NamespacedIdentity
            : [parentNsid, nsid].join("/") as NamespacedIdentity,
        ),
        defaults,
        repository,
      );

      this.activity.contextAtoms.push(freshAtomReference);

      return freshAtomReference;
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
      time: new Date().toISOString(),
      logs: [],
      result: {
        success: false,
        value: "not started",
      },
    },
    repository,
  );

  let lastLogTime = 0;

  const log = (...msg: string[]): void => {
    const current = getCurrentRunTime();
    activity.value.logs.push(
      createLog(
        `${current.toFixed(2)}/${(current - lastLogTime).toFixed(2)}ms|>`,
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
    log(`[do:${type}]`, success ? "success" : "failure");
    activity.value.result = {
      success,
      value: value,
    };
  };

  return {
    activity: activity,
    contextAtoms: [],
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

      const temporary = structuredClone(this.value || defaults);
      const diff: Record<string, unknown> = {};

      const observableTemporaryValue = createMonitoredObject(temporary, (op: string, prop: string, val: unknown, old: unknown) => {
        diff[prop] = val;
        activityCtx.log(`[do:${activityType}]`, `${op} on ${prop}: old=${old}, new=${val}`);
      })
      
      const atomCtx = atomContext(
        this.nsid,
        observableTemporaryValue,
        activityCtx,
        repository,
        params,
      );

      await callback(atomCtx)
        .then(async () => {
          this.value = temporary;
          activityCtx.log("[atom]", "persisting...");
          const newVersion = await repository.persist(
            this,
            activityCtx.activity,
            ...activityCtx.contextAtoms,
          );
          this.version = newVersion;
          activityCtx.log("[atom]", "persisted version: " + newVersion);
          activityCtx.success(activityType, diff);
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
