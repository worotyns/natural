import { ApplicationBuilder } from "./application_builder.ts";
import { TestBuilder } from "./application_test_builder.ts";
import { flags } from "../permission.ts";

const roles = [
  "superuser",
  "user",
] as const;

export const userRoles = flags<typeof roles>(roles);

interface User {
  created_at: number;
  name: string;
  accepted: boolean;
}

interface CreateUser {
  name: string;
}

interface AdminAcceptUser {
  name: string;
  who: string;
}

const client = ApplicationBuilder
  .builder()
  // .module(UserModule)
  // .module(AdminModule)
  // .service('email', emailService)
  // .factory('user', userFactory)
  .command<CreateUser, User>("register", (cmd) =>
    cmd
      .description("Register new user")
      .arguments((arg) => [
        arg.string("name"),
        arg.boolean("terms").default(false),
      ])
      .behaviour(async (command, atom) => {
        atom.activity.log("User created");
        atom.value.created_at = Date.now();
        atom.value.name = command.name;
      }))
  .command<AdminAcceptUser, User>("admin_accept_user", (cmd) =>
    cmd
      .description("Manual accepts client")
      .metadata((meta) =>
        meta
          .namespace("ns://users/:ulid")
          .permissions(userRoles.get("superuser")!) // hm? second arg can be optional
      )
      .arguments((arg) => [
        arg
          .boolean("accept")
          .description("Check if you accept this account")
          .default(false),
      ])
      .behaviour(async (command, atom) => {
        atom.activity.log(`Admin ${command.who} accepts user ${command.name}`);
        atom.value.accepted = true;
      }));

const test = TestBuilder.create(client);

Deno.test("client_builder", async () => {
  await test.run(async (client) => {
    await client.run("register", {
      actor: "jacek",
      ts: Date.now(),
      nsid: "ns://users/xxx",
      permission: 0,
    }, {});
  });
});
