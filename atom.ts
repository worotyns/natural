import { identity } from "./identity.ts";
import { atom } from "./mod.ts";
import { createMonitoredObject } from "./proxy.ts";
import { measure, slug } from "./utils.ts";

export type NamespacedIdentityItem = string;
export type NamespacedIdentity = `ns://${NamespacedIdentityItem}`;

export type Versionstamp = string;

type AcitvityType = string;
type Activity = {
  nsid: NamespacedIdentity;
  type: AcitvityType;
  logs: string[];
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
    ctx: (ctx: AtomContext<Schema, Params>) => void | Promise<void>,
    params?: Params,
  ): Promise<AtomActivity>;
}

export interface AtomContext<
  Schema extends BaseSchema,
  Params extends BaseSchema,
> {
  nsid: NamespacedIdentity;
  value: Schema;
  params: Params;
  activity: ActivityContext;
  referenceAtoms: Set<Atom<BaseSchema>>;
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
  registerInActivities(name: string): void;
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
  referenceAtoms: Set<Atom<BaseSchema>> = new Set(),
): AtomContext<Schema, Params> {
  return {
    nsid: parentNsid,
    get value(): Schema {
      return temporaryValue;
    },
    params: structuredClone(params),
    activity: activityContext,
    referenceAtoms: referenceAtoms,
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
        { isInTransactionScope: true, references: referenceAtoms },
      );

      referenceAtoms.add(freshAtomReference);

      return freshAtomReference;
    },
  };
}

interface ActivityReference {
  ref: NamespacedIdentity;
  act: NamespacedIdentity;
}

function activityContext(
  nsid: NamespacedIdentity,
  repository: Repository,
  referenceAtoms: Set<Atom<BaseSchema>>,
): ActivityContext {
  const getCurrentRunTime = measure();

  const activity = atomFactory<Activity>(
    identity(nsid, "__activity"),
    {
      nsid,
      type: "",
      logs: [],
      result: {
        success: false,
        value: "not started",
      },
    },
    repository,
    { isInTransactionScope: true, references: referenceAtoms },
  );

  let lastLogTime = 0;

  const log = (...msg: string[]): void => {
    const current = getCurrentRunTime();
    activity.value.logs.push([
      `[${new Date().toISOString()}]`,
      `<${current.toFixed(2)}/${(current - lastLogTime).toFixed(2)}>`,
      ...msg,
    ].join(" "));
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
    registerInActivities(name: string): void {
      referenceAtoms.add(
        atom<ActivityReference>(
          identity("ns://activities/:ulid/", slug(name)),
          {
            ref: nsid,
            act: activity.nsid,
          },
        ),
      );
    },
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

interface AtomOpts {
  isInTransactionScope: boolean;
  references: Set<Atom<BaseSchema>>;
}

export function atomFactory<Schema extends BaseSchema>(
  nsid: NamespacedIdentity,
  defaults: Schema,
  repository: Repository,
  opts: AtomOpts,
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
      callback: (ctx: AtomContext<Schema, Params>) => void | Promise<void>,
      params: Params = {} as Params,
    ): Promise<AtomActivity> {
      const activityCtx = activityContext(nsid, repository, opts.references);
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

      const observableTemporaryValue = createMonitoredObject(
        temporary,
        (op: string, prop: string, val: unknown, old: unknown) => {
          diff[prop] = val;
          activityCtx.log(
            `[do:${activityType}]`,
            `${op} on ${prop}: old=${JSON.stringify(old)}, new=${
              JSON.stringify(val)
            }`,
          );
        },
      );

      const atomCtx = atomContext(
        this.nsid,
        observableTemporaryValue,
        activityCtx,
        repository,
        params,
        opts.references,
      );

      atomCtx.referenceAtoms.add(activityCtx.activity);

      const call = callback(atomCtx);
      const promisiedCall = (call && "then" in call)
        ? call
        : Promise.resolve(call);

      await promisiedCall
        .then(async () => {
          this.value = temporary;
          if (!opts.isInTransactionScope) {
            activityCtx.log("[atom]", "persisting...");

            const toPersist = [
              this,
              ...atomCtx.referenceAtoms,
            ];

            toPersist.forEach((item) =>
              activityCtx.log(`[ref:${item.nsid}] persisting...`)
            );

            const newVersion = await repository.persist(...toPersist);
            toPersist.forEach((item) => item.version = newVersion);

            activityCtx.log("[atom]", "persisted version: " + newVersion);
            activityCtx.success(activityType, diff);
          } else {
            atomCtx.referenceAtoms.forEach((item) =>
              activityCtx.log(
                `[ref:${item.nsid}] skip persisting... due to transaction scope`,
              )
            );
            activityCtx.log(
              "[atom]",
              "skip persisting... due to transaction scope",
            );
          }
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
