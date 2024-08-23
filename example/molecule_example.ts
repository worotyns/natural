import { temporary } from "../lib/mod.ts";

const team = temporary("dev", "team", "xyz");
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

console.log(team.toJSON());

console.log(team.serialize());
