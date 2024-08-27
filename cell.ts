import { InvalidStateError } from "./errors.ts";
import { createLog, measure } from "./utils.ts";
import type { AnyAtom } from "./atom.ts";
import { type Molecule, molecule } from "./molecule.ts";
import type { Repository } from "./repository.ts";
import { ulid } from "./ulid.ts";
import {
  combine,
  type NamespacedIdentity,
  type NamespacedIdentityItem,
} from "./identity.ts";

export type CellState = Molecule;

enum CellResultState {
  Success = "success",
  Failure = "failure",
  Waiting = "waiting",
}

type WaitForKey = string;

export interface CellCtx {
  identity: NamespacedIdentity;
  repository: Repository;
  log(msg: string): Promise<void>;
  waitFor<T = unknown>(key: WaitForKey): Promise<T>;
  persist(...items: Array<AnyAtom | Molecule>): Promise<void>;
  restore<T = unknown>(identity: NamespacedIdentity): Promise<T | null>;
  set<T = unknown>(key: string, val: T): Promise<void>;
  get<T = unknown>(key: string): T | null;
  cancel(msg: string): Promise<void>;
  run: (
    identity: NamespacedIdentityItem,
    callback: (ctx: CellCtx) => Promise<unknown>,
  ) => Promise<unknown>;
}

enum CellStatus {
  Waiting = "waiting",
  Running = "running",
  Canceled = "canceled",
  Finished = "finished",
}

const createState = (
  identity: NamespacedIdentity,
  repository: Repository,
  stateMolecule?: Molecule,
): CellState => {
  if (stateMolecule) {
    return stateMolecule;
  }

  const state = molecule(repository, combine(identity, ulid.new()));

  state.string(CellStatus.Running, "status");
  state.list([], "logs");
  state.object({}, "results");
  state.object({}, "kv");

  return state;
};

const createContext = (
  state: CellState,
  repository: Repository,
): CellCtx => {
  const [status, kv, logs, results] = state.use(
    "status",
    "kv",
    "logs",
    "results",
  );

  let shouldSuspend = false;

  const ctx: CellCtx = {
    identity: state.identity,
    repository: repository,
    persist: (...items: Array<AnyAtom | Molecule>): Promise<void> => {
      repository.atoms.persist(...items);
      return Promise.resolve();
    },
    restore: <T = unknown>(identity: NamespacedIdentity): Promise<T | null> => {
      return Promise.resolve(repository.atoms.restore(identity) as T | null);
    },
    set: <T = unknown>(key: string, val: unknown) => {
      kv.mutate({ ...kv.value, [key]: val });
      return Promise.resolve(val) as Promise<T>;
    },
    get: <T = unknown>(key: string) => {
      return kv.value[key] as T || null;
    },
    log: (msg: string) => {
      logs.mutate([...logs.value, createLog(msg)]);
      return Promise.resolve();
    },
    waitFor: (key: WaitForKey) => {
      const currentValue = kv.value[key] || false;

      if (currentValue) {
        return Promise.resolve(currentValue);
      } else {
        shouldSuspend = true;
        logs.mutate([...logs.value, createLog("waiting for", key)]);
        status.mutate(CellStatus.Waiting);
        kv.mutate({ ...kv.value, [key]: false });
        return Promise.resolve(null);
      }
    },
    cancel: (msg: string) => {
      logs.mutate([...logs.value, createLog("canceled with reason: ", msg)]);
      status.mutate(CellStatus.Canceled);
      return Promise.resolve();
    },
    run: async (
      identity: NamespacedIdentityItem,
      callback: (ctx: CellCtx) => Promise<unknown>,
    ): Promise<unknown> => {
      const key = identity;
      const cached = results.value[key];

      if (cached && cached.state === CellResultState.Success) {
        logs.mutate([...logs.value, createLog("get cached:", key)]);
        return cached;
      }

      if (shouldSuspend) {
        return;
      }

      const stop = measure();

      await callback(ctx)
        .then((res) => {
          results.mutate({
            ...results.value,
            [key]: {
              time: stop(),
              state: CellResultState.Success,
              result: res,
            },
          });
          return true;
        })
        .catch((err) => {
          shouldSuspend = true;
          results.mutate({
            ...results.value,
            [key]: {
              time: stop(),
              state: CellResultState.Failure,
              result: err.message,
            },
          });
          return false;
        });
    },
  };

  return ctx;
};

export type Cell = (
  keyValueContextToExtend: Record<string, unknown>,
  resumedState?: CellState,
) => Promise<CellState>;

export const cell = (
  identity: NamespacedIdentity,
  runner: (ctx: CellCtx) => Promise<void>,
  repository: Repository,
): Cell => {
  return async (
    keyValueContextToExtend: Record<string, unknown> = {},
    resumedState?: CellState,
  ) => {
    const state = createState(identity, repository, resumedState);

    const [status, kv] = state.use("status", "kv");

    if (status.value === CellStatus.Canceled) {
      // TODO: to przekminic? bo w suie to mozna zrobic dedykowane bledy pod listenera? zeby nie odjebywal na koncu procesu
      throw InvalidStateError.format(
        "Cannot run cancelled workflow: %s",
        state.identity,
      );
    }

    kv.mutate({ ...kv.value, ...keyValueContextToExtend });
    status.mutate(CellStatus.Running);

    await runner(createContext(state, repository));

    if (status.value !== CellStatus.Waiting) {
      // TODO: koniec procesu? jest ok, mozna dodac ewntualnie statusow
      status.mutate(CellStatus.Finished);
    }

    await state.persist();
    return state;
  };
};
