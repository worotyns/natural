// import { atom } from "../atom.ts";
// import { organism } from "../lib/mod.ts";
// import type { Molecule } from "../molecule.ts";
// import { testing } from "./testing.ts";

// const dev = organism(["dev"], testing);

// const team = dev.molecule(["team", "xyz"], [
//   atom("users", []),
//   atom("metadata", {
//     createdAt: Date.now(),
//     deletedAt: null,
//   }),
// ]);

// const [emptyTeamUsers] = team!.use("users");

// emptyTeamUsers.mutate([
//   ...emptyTeamUsers.value,
//   "john@email.com",
//   atom("atom@email.com", "johndoe@email.com"),
// ]);

// console.log(team.serialize());

// await dev.runtime.repository.persist(team);

// console.log(team.serialize());
// // console.log(Deno.inspect(dev.runtime.repository, { depth: 8, colors: true }));

// // I can restore partial molecule
// const namespacedIdentity = dev.identity(["team", "xyz"]);
// const restoredMoleculeWithTeam = await dev.runtime.repository.restore<Molecule>(
//   namespacedIdentity,
//   ["users"],
// );

// const [teamUsers] = restoredMoleculeWithTeam!.use("users");

// // mutate molecule splited atom
// teamUsers.mutate([
//   ...teamUsers.value,
//   "jane@email.com",
//   "joe@email.com",
// ]);

// // can be stored separately as separated atom
// await dev.runtime.repository.persist(teamUsers);

// const restoredWholeTeam = await dev.runtime.repository.restore<Molecule>(
//   namespacedIdentity,
// );

// // after save should molecule has a reference
// await dev.runtime.repository.persist(restoredWholeTeam!);

// const restoredOnlyMetadata = await dev.runtime.repository.restore<Molecule>(
//   namespacedIdentity,
//   ["metadata"],
// );

// const [metadata] = restoredOnlyMetadata!.use("metadata");

// metadata.mutate({
//   ...metadata.value,
//   deletedAt: Date.now(),
// });

// // after save should molecule has a reference
// await dev.runtime.repository.persist(restoredOnlyMetadata!);

// console.log(Deno.inspect(dev.runtime.repository, { depth: 8, colors: true }));
// //
