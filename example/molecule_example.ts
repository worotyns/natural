import { assert } from "../lib/assert.ts";
import type { ListAtom } from "../lib/atom.ts";
import { deserialize } from "../lib/identity.ts";
import { createRepository, persistent } from "../lib/mod.ts";
import { denoRuntime } from "../lib/runtime.ts";

const team = persistent("dev", "team", "xyz");
const teamUsers = team.list([], "users");

team.object({
  createdAt: Date.now(),
  deletedAt: 0,
}, "metadata");

teamUsers.add("john@email.com");

await team.persist();

// I can persist partial molecule
teamUsers.add("jane@email.com");
await teamUsers.persist();

// I can access named members
const [metadata] = team.use("metadata");

metadata.mutate({
  ...metadata.value,
  deletedAt: Date.now(),
});

await metadata.persist();
// console.log(team.toJSON());

// I can directly get from repository and persist
const repository = createRepository(denoRuntime);
const user = await repository.atoms.restore<ListAtom>(deserialize("identity::dev:team:xyz:atoms:users"));

assert(user, 'user atom exists in db');
// console.log(user.toJSON());
user.add('third@email.com');

// It's not from molecule so i cannot use .persist() method - now version mismatched
await repository.atoms.persist(user);
console.log(user.toJSON())
console.log(team.toJSON())

// Now when I try to store changes from molecule, then I will get exception due to version
// teamUsers.add('conflict@email.com')
// teamUsers.persist();
// console.log(team.toJSON());