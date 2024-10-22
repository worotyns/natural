import { ClientBuilder } from "./client_builder.ts";
import { TestBuilder } from "./client_test_builder.ts";
import { flags } from "../permission.ts";
import { atom } from "../mod.ts";
import { identity } from "../identity.ts";

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

const client = ClientBuilder
  .builder()
  .command<CreateUser, void>("register", (cmd) =>
    cmd
      .description("Register new user")
      .arguments((arg) => [
        arg.string("name"),
        arg.boolean("terms").default(false),
      ])
      .behaviour(async (command) => {
        const myAtom = await atom(identity(command.metadata.nsid), {}).fetch();
        console.log(command.payload, myAtom);
        await myAtom.do("create-new", () => {
          console.log("hihi");
        });
      }))
  .command<AdminAcceptUser, void>("admin_accept_user", (cmd) =>
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
      .behaviour(async () => {
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
