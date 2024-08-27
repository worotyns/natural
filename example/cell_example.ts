import { deserialize } from "../identity.ts";
import {
  cell,
  createRepository,
  identity,
  memoryRuntime,
  type Molecule,
  temporary,
} from "../mod.ts";
import { assert } from "../testing.ts";

async function createUser(name: string) {
  const user = temporary("dev", "users", name);
  user.list([], "friends");
  await user.persist();
}

// Write some test data
await createUser("jane@email.com");
await createUser("joe@email.com");

const repository = createRepository(memoryRuntime);

// Make friend process with acceptance from invited user
const evolution = cell(identity("make-friends"), async (ctx) => {
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
  await ctx.run(identity("send-invite-fake-email"), async (runCtx) => {
    await runCtx.set("invited.token", "1234");
    // sending e-mail fake
    console.log(
      invitingId,
      "Click to accept invitation",
      `sending email with content: ${invitingId} has invited you to join them click to https://localhost:3000/${ctx.identity.serialize()}/resolve/${
        runCtx.get("invited.token")
      }`,
    );
    runCtx.log("sent email with code");
  });

  // Sleep process, when user click process will woke up and continue
  await ctx.waitFor("email.clicked");

  // After user clicks, then will continue with args passed {'email.token', and 'invited.clicked'}
  await ctx.run(identity("check-code"), async (runCtx) => {
    const token = await runCtx.get("email.token");
    const originalToken = await runCtx.get("invited.token");

    assert(token === originalToken, "invalid token");

    runCtx.log("token is ok, try to add to friends!");
  });

  // Now we can connect two users
  await ctx.run(identity("modify-transaction"), async (runCtx) => {
    const [invitedFriends] = invited.use("friends");
    const [invitingFriends] = inviting.use("friends");

    invitedFriends.mutate([...invitedFriends.value, invitingId]);
    invitingFriends.mutate([...invitingFriends.value, invitedId]);

    await runCtx.persist(invited, inviting);
    runCtx.log(`${invitingId} and ${invitedId} are now friends`);
  });
}, repository);

// // Run process with user identifiers
const result = await evolution({
  invited: "identity::dev:users:jane@email.com",
  inviting: "identity::dev:users:joe@email.com",
});

const result2 = await evolution({
  invited: "identity::dev:users:jane@email.com",
  inviting: "identity::dev:users:joe@email.com",
}, result);

console.log(result.serialize());

// Simulate woke up with code
const afterClick = await evolution({
  "email.clicked": "identity::dev:jane@email.com",
  "email.token": "1234",
}, result2);

console.log(afterClick.serialize());

console.log(afterClick.toJSON());
