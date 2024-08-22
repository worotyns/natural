import { deserialize, type Molecule, organism, serialize } from "../mod.ts";
import { assert } from "../deps.ts";
import { testing } from "./testing.ts";

const dev = organism(["dev"], testing);

// deno-lint-ignore no-explicit-any
await (dev.runtime.repository as any).clear();

// Write some test data
await dev.runtime.repository.persist(
  dev.molecule(["users", "jane@email.com"], [dev.atom("friends", [])]), // entity
  dev.molecule(["users", "joe@email.com"], [dev.atom("friends", [])]), // entity
);

// Make friend process with acceptance from invited user
const evolution = dev.cell(["invite-user"], async (ctx) => {
  // Log processing time
  ctx.log("starting");

  // Fetch args for inviting and invited and assert this
  const invitingId = ctx.get<string>("inviting");
  const invitedId = ctx.get<string>("invited");

  // Assert that args was declared via args
  assert(invitingId, "invited must be defined");
  assert(invitedId, "inviting must be defined");

  // Fetch invited from DB
  const invited = await ctx.restore<Molecule>(deserialize(invitedId));
  const inviting = await ctx.restore<Molecule>(deserialize(invitingId));

  // Assert that data exists
  assert(invited, "invited must be defined");
  assert(inviting, "inviting must be defined");

  // Send e-mail with code and link to click
  await ctx.run(["send-invite-fake-email"], async (runCtx) => {
    await runCtx.set("invited.token", "1234");
    await ctx.services.email(
      invitingId,
      "Click to accept invitation",
      `sending email with content: ${invitingId} has invited you to join them click to https://localhost:3000/${
        serialize(ctx.identity)
      }/resolve/${runCtx.get("invited.token")}`,
    );
    runCtx.log("sent email with code");
  });

  // Sleep process, when user click process will woke up and continue
  await ctx.waitFor("email.clicked");

  // After user clicks, then will continue with args passed {'email.token', and 'invited.clicked'}
  await ctx.run(["check-code"], async (runCtx) => {
    const token = await runCtx.get("email.token");
    const originalToken = await runCtx.get("invited.token");

    assert(token === originalToken, "invalid token");

    runCtx.log("token is ok, try to add to friends!");
  });

  // Now we can connect two users
  await ctx.run(["modify-transaction"], async (runCtx) => {
    const [invitedFriends] = invited.use("friends");
    const [invitingFriends] = inviting.use("friends");

    invitedFriends.mutate([...invitedFriends.value, invitingId]);
    invitingFriends.mutate([...invitingFriends.value, invitedId]);

    await runCtx.persist(invited, inviting);
    runCtx.log(`${invitingId} and ${invitedId} are now friends`);
  });
});

// // Run process with user identifiers
const result = await evolution({
  invited: "dev:users:jane@email.com",
  inviting: "dev:users:joe@email.com",
});

const result2 = await evolution({
  invited: "dev:users:jane@email.com",
  inviting: "dev:users:joe@email.com",
}, result);

console.log(result.serialize());

// Simulate woke up with code
const afterClick = await evolution({
  "email.clicked": "dev:jane@email.com",
  "email.token": "1234",
}, result2);

console.log(afterClick.serialize());

await (dev.runtime.repository as any).dump();
