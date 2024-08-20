import { InvalidStateError } from "./errors.ts";
import { createLog, measure, ulid } from "./utils.ts";
import { type AnyAtom, atom } from "./atom.ts";
import { combine, type Identity, serialize } from "./identifier.ts";
import { type Molecule, molecule } from "./molecule.ts";
import type { Runtime } from "./runtime.ts";

export type CellState = Molecule;

enum CellResultState {
  success = "success",
  failure = "failure",
  waiting = "waiting",
}

type WaitForKey = string;

export interface CellCtx<S> {
  identity: Identity;
  services: S;
  log(msg: string): Promise<void>;
  waitFor<T = unknown>(key: WaitForKey): Promise<T>;
  persist(...items: Array<AnyAtom | Molecule>): Promise<void>;
  restore<T = unknown>(identity: Identity): Promise<T | null>;
  set<T = unknown>(key: string, val: T): Promise<void>;
  get<T = unknown>(key: string): T | null;
  cancel(msg: string): Promise<void>;
  run: (
    identity: Identity,
    callback: (ctx: CellCtx<S>) => Promise<void>,
  ) => Promise<void>;
}

enum CellStatus {
  waiting = "waiting",
  running = "running",
  canceled = "canceled",
  finished = "finished",
}

const createState = (
  identity: Identity,
  stateMolecule?: Molecule,
): CellState => {
  if (stateMolecule) {
    return stateMolecule;
  }

  return molecule(combine(identity, ulid.new()), [
    atom("status", CellStatus.running),
    atom("logs", []),
    atom("results", {}),
    atom("kv", {}),
  ]);
};

const createContext = <S>(
  state: CellState,
  runtime: Runtime<S>,
): CellCtx<S> => {
  const [status, kv, logs, results] = state.use(
    "status",
    "kv",
    "logs",
    "results",
  );

  let shouldSuspend = false;

  const ctx: CellCtx<S> = {
    identity: state.identity,
    services: runtime.services,
    persist: (...items: Array<AnyAtom | Molecule>): Promise<void> => {
      runtime.repository.persist(...items.filter((i) => i.wasModified()));
      return Promise.resolve();
    },
    restore: <T = unknown>(identity: Identity): Promise<T | null> => {
      return Promise.resolve(runtime.repository.restore(identity) as T | null);
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
        status.mutate(CellStatus.waiting);
        kv.mutate({ ...kv.value, [key]: false });
        return Promise.resolve(null);
      }
    },
    cancel: (msg: string) => {
      logs.mutate([...logs.value, createLog("canceled with reason: ", msg)]);
      status.mutate(CellStatus.canceled);
      return Promise.resolve();
    },
    run: async (
      identity: Identity,
      callback: (ctx: CellCtx<S>) => Promise<void>,
    ): Promise<void> => {
      const key = serialize(identity);
      const cached = results.value[key];

      if (cached && cached.state === CellResultState.success) {
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
              state: CellResultState.success,
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
              state: CellResultState.failure,
              result: err.message,
            },
          });
          return false;
        });
    },
  };

  return ctx;
};

export const cell = <S>(
  identity: Identity,
  runner: (ctx: CellCtx<S>) => Promise<void>,
  runtime: Runtime<S>,
) => {
  return async (
    keyValueContextToExtend: Record<string, unknown> = {},
    resumedState?: CellState,
  ) => {
    const state = createState(identity, resumedState);

    const [status, kv] = state.use("status", "kv");

    if (status.value === CellStatus.canceled) {
      // TODO: to przekminic? bo w suie to mozna zrobic dedykowane bledy pod listenera? zeby nie odjebywal na koncu procesu
      throw InvalidStateError.format(
        "Cannot run cancelled workflow: %s",
        serialize(combine(state.identity)),
      );
    }

    kv.mutate({ ...kv.value, ...keyValueContextToExtend });
    status.mutate(CellStatus.running);

    await runner(createContext(state, runtime));

    if (status.value !== CellStatus.waiting) {
      // TODO: koniec procesu? jest ok, mozna dodac ewntualnie statusow
      status.mutate(CellStatus.finished);
    }

    await runtime.repository.persist(state);

    return state;
  };
};
