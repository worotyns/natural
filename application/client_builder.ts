import type { NamespacedIdentity } from "../mod.ts";
import { has } from "../permission.ts";
import { assert } from "../utils.ts";

class CommandArgument<T = unknown> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly fallback: T | null,
    public readonly validateFn: (value: unknown) => boolean,
  ) {
  }

  wrap(value: T): T {
    if (this.fallback !== null) {
      return this.fallback;
    }

    return value as T;
  }

  validate(value: unknown): boolean {
    if (value === undefined) {
      if (this.fallback === null) {
        return false;
      }

      return true;
    }

    return this.validateFn(value);
  }
}

type CommandBehaviourCallback<P, R> = (
  commandPayload: { payload: P; metadata: CommandRunnerMetadata },
) => Promise<R>;

class Command<P extends object, R> {
  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly permissions: number,
    public readonly checks: Array<[string, () => boolean]>,
    public readonly args: CommandArgument[],
    public readonly _behaviour: CommandBehaviourCallback<P, R>,
  ) {
  }

  assertPermission(permission: number = 0) {
    if (this.permissions > 0) {
      assert(
        has(permission, this.permissions),
        "you does not have permission to execute this command",
      );
    }
  }

  // TODO: add any args for that? need any context for now its unussable?
  assertChecks() {
    for (const [checkName, checkLogic] of this.checks) {
      if (!checkLogic()) {
        throw new Error(`command check ${checkName} failed`);
      }
    }
  }

  assertIsValid(args: CommandArgs): P {
    const ctx = {} as P;

    for (const arg of this.args) {
      const isValid = arg.validate(args[arg.name]);
      if (!isValid) {
        throw new Error(
          `arg ${arg.name} is invalid with value: ${args[arg.name]}`,
        );
      }
      ctx[arg.name as keyof P] = arg.wrap(args[arg.name]) as P[keyof P];
    }

    return ctx;
  }

  async behaviour(
    metadata: CommandRunnerMetadata,
    args: CommandArgs,
  ): Promise<R> {
    this.assertPermission(metadata.permission);
    this.assertChecks();

    const commandPayload = this.assertIsValid(args);

    return this._behaviour({
      payload: commandPayload,
      metadata: metadata,
    });
  }
}

interface CommandArgumentBuilderStatics {
  boolean(name: string): CommandArgumentBuilder<boolean>;
  number(name: string): CommandArgumentBuilder<number>;
  string(name: string): CommandArgumentBuilder<string>;
  arrayOf<T>(
    name: string,
    type: "boolean" | "number" | "string",
  ): CommandArgumentBuilder<T[]>;
}

class CommandArgumentBuilder<T> {
  private _description: string = "";

  constructor(
    private _name: string,
    private _fallback: null | T = null,
    private _validator: (value: unknown) => boolean,
  ) {
  }

  get name() {
    return this._name;
  }

  static boolean(name: string) {
    return new CommandArgumentBuilder<boolean>(
      name,
      false,
      (val) => typeof val === "boolean",
    );
  }

  static number(name: string) {
    return new CommandArgumentBuilder<number>(
      name,
      -1,
      (val) => typeof val === "number",
    );
  }

  static string(name: string) {
    return new CommandArgumentBuilder<string>(
      name,
      "",
      (val) => typeof val === "string",
    );
  }

  static arrayOf<T>(name: string, type: "boolean" | "number" | "string") {
    return new CommandArgumentBuilder<T[]>(
      name,
      [],
      (val) =>
        Array.isArray(val) &&
        (val as unknown[]).every((v) => typeof v === type),
    );
  }

  public description(description: string): CommandArgumentBuilder<T> {
    this._description = description;
    return this;
  }

  public default(value: T): CommandArgumentBuilder<T> {
    this._fallback = value;
    return this;
  }

  build(): CommandArgument {
    return new CommandArgument(
      this._name,
      this._description,
      this._fallback,
      this._validator,
    );
  }
}

class CommandMetadataBuilder {
  private _permissions: number = 0;
  private _namespace: string = "";

  public permissions(permissions: number): CommandMetadataBuilder {
    this._permissions = permissions;
    return this;
  }

  public namespace(namespace: string): CommandMetadataBuilder {
    this._namespace = namespace;
    return this;
  }

  build() {
    return {
      permissions: this._permissions,
      namespace: this._namespace,
    };
  }
}

class CommandBuilder<T extends object, R> {
  private _name: string = "";
  private _description: string = "";
  private _permissions: number = 0;
  private _namespace: string = "";
  private _checks: Array<[string, () => boolean]> = [];
  private _args: CommandArgument[] = [];
  private _beahevior: CommandBehaviourCallback<T, R> = () =>
    Promise.resolve({} as R);

  public metadata(
    callback: (builder: CommandMetadataBuilder) => CommandMetadataBuilder,
  ): CommandBuilder<T, R> {
    const builder = callback(new CommandMetadataBuilder());
    const metadata = builder.build();
    this._permissions = metadata.permissions;
    this._namespace = metadata.namespace;
    return this;
  }

  public description(description: string): CommandBuilder<T, R> {
    this._description = description;
    return this;
  }

  public arguments(
    callback: (
      builder: CommandArgumentBuilderStatics,
    ) => Array<CommandArgumentBuilder<unknown>>,
  ): CommandBuilder<T, R> {
    const builders = callback(CommandArgumentBuilder);
    for (const builder of builders) {
      for (const arg of this._args) {
        if (arg.name === builder.name) {
          throw new Error(
            `argument ${builder.name} already exists in command ${this._name}`,
          );
        }
      }
      this._args.push(builder.build());
    }
    return this;
  }

  public behaviour(
    callback: CommandBehaviourCallback<T, R>,
  ): CommandBuilder<T, R> {
    this._beahevior = callback;
    return this;
  }

  build(name: string): Command<T, R> {
    return new Command(
      name,
      this._description,
      this._permissions,
      this._checks,
      this._args,
      this._beahevior,
    ) as Command<T, R>;
  }
}

export class ClientBuilder {
  public commands: Command<object, object>[] = [];

  static builder(): ClientBuilder {
    return new ClientBuilder();
  }

  command<T extends object, R>(
    name: string,
    callback: (cmd: CommandBuilder<T, R>) => CommandBuilder<T, R>,
  ) {
    const cmdBuilder = callback(new CommandBuilder<T, R>());

    for (const cmd of this.commands) {
      if (cmd.name === name) {
        throw new Error(`command ${name} already exists`);
      }
    }

    this.commands.push(
      cmdBuilder.build(name) as unknown as Command<object, object>,
    );

    return this;
  }

  build() {
    return new Client(this.commands);
  }
}

type CommandArgs = Record<string, unknown>;

type Metadata = {
  nsid: NamespacedIdentity;
  permission: number;
};

type CommandRunnerMetadata = {
  nsid: NamespacedIdentity;
  permission: number;
  actor: string;
  ts: number;
};

class Client {
  constructor(
    public readonly commands: Command<object, object>[],
  ) {
  }

  async run(
    command: string,
    metadata: CommandRunnerMetadata,
    args: CommandArgs,
  ): Promise<unknown> {
    const cmd = this.commands.find((c) => c.name === command);

    if (!cmd) {
      throw new Error(`command ${command} not found`);
    }

    return cmd.behaviour(metadata, args);
  }
}

export type { Client };

class Atom {
}

class Identity {
}

class InMemoryRuntime {
}

class DenoRuntime {
}

// Runtime
// Queues
// Storage (blobs, archive)
// Atoms (logs, activity)