// class CommandArgument<T = unknown> {
//   constructor(
//     public readonly name: string,
//     public readonly description: string,
//     public readonly fallback: T
//   ) {

//   }
// }

// class Command {
//   constructor(
//     public readonly name: string,
//     public readonly description: string,
//     public readonly permissions: number,
//     public readonly checks: Array<() => boolean>,
//     public readonly args: CommandArgument[],
//   ) {

//   }
// }

// interface CommandArgumentBuilderStatics {
//   boolean(name: string): CommandArgumentBuilder<boolean>;
//   number(name: string): CommandArgumentBuilder<number>;
//   string(name: string): CommandArgumentBuilder<string>;
//   arrayOf<T>(name: string): CommandArgumentBuilder<T[]>;
// }

// class CommandArgumentBuilder<T> {

//   private _description: string = "";
  
//   constructor(
//     private _name: string,
//     private _fallback: null | T = null
//   ) {
//   }

//   static boolean(name: string) {
//     return new CommandArgumentBuilder<boolean>(name, false);
//   }

//   static number(name: string) {
//     return new CommandArgumentBuilder<number>(name, -1);
//   }

//   static string(name: string) {
//     return new CommandArgumentBuilder<string>(name, "");
//   }

//   static arrayOf<T>(name: string) {
//     return new CommandArgumentBuilder<T[]>(name, []);
//   }

//   public description(description: string): CommandArgumentBuilder<T> {
//     this._description = description;
//     return this;
//   }

//   public default(value: T): CommandArgumentBuilder<T> {
//     this._fallback = value;
//     return this;
//   }

//   build(): CommandArgument {
//     return new CommandArgument(
//       this._name,
//       this._description,
//       this._fallback
//     );
//   }
// }

// class CommandBuilder<T = object, R = void> {
//   private _name: string = '';
//   private _description: string = '';
//   private _permissions: number = 0;
//   private _namespace: string = '';
//   private _checks: Array<() => boolean> = [];
//   private _args: CommandArgument[] = [];
//   private _beahevior: (ctx: T) => Promise<R> = () => Promise.resolve(void 0 as R);

//   public description(description: string): CommandBuilder<T, R> {
//     this._description = description;
//     return this;
//   }

//   public permission(permissions: number): CommandBuilder<T, R> {
//     this._permissions = permissions;
//     return this;
//   }

//   public namespace(namespace: string): CommandBuilder<T, R> {
//     this._namespace = namespace;
//     return this;
//   }

//   public arguments(callback: (builder: CommandArgumentBuilderStatics) => Array<CommandArgumentBuilder<unknown>>): CommandBuilder<T, R> {
//     const builders = callback(CommandArgumentBuilder);
//     for (const builder of builders) {
//       for (const arg of this._args) {
//         if (arg.name === builder._name) {
//           throw new Error(`argument ${builder._name} already exists in command ${this._name}`);
//         }
//       }
//       this._args.push(builder.build());
//     }
//     return this;
//   }

//   public do(callback: (ctx: T) => Promise<R>): CommandBuilder<T, R> {
//     this._beahevior = callback;
//     return this;
//   }

//   build(name: string): Command {
//     return new Command(
//       name,
//       this._description,
//       this._permissions,
//       this._checks,
//       this._args
//     );
//   }
// }

// export class ClientBuilder {
//   public commands: Command[] = [];
  
//   static builder(): ClientBuilder {
//     return new ClientBuilder();
//   }

//   command<T, R>(name: string, callback: (cmd: CommandBuilder<T, R>) => CommandBuilder<T, R>) {
//     const cmdBuilder = callback(new CommandBuilder<T, R>());
    
//     for (const cmd of this.commands) {
//       if (cmd.name === name) {
//         throw new Error(`command ${name} already exists`);
//       }
//     }

//     this.commands.push(cmdBuilder.build(name));

//     return this;
//   }

// }