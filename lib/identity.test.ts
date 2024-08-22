import { assert, assertEquals } from "../deps.ts";
import * as id from "./identity.ts";
import { PrimitiveKind } from "./primitive.ts";

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("a", "b");
  assertEquals(myIdentity.kind, PrimitiveKind.Identity);
  assertEquals(myIdentity.key, ["a", "b"]);
});

Deno.test("identity.serialize", () => {
  const myIdentity = id.identity("a", "b", "c");
  assertEquals(
    myIdentity.serialize(),
    "identity::a:b:c",
    "results as expected",
  );
  assertEquals(
    id.serialize(myIdentity),
    myIdentity.serialize(),
    "instance and normal serialize results equals",
  );
});

Deno.test("identity.equals", () => {
  const first = id.identity("a", "b");
  const second = id.identity("a", "b");
  const third = id.identity("a", "c");
  assertEquals(first.equals(second), true, "ids are equals");
  assertEquals(first.equals(third), false, "ids are not equals");
});

Deno.test("identity.clone", () => {
  const first = id.identity("a", "b");
  const clonedFirst = first.clone();
  assert(first.equals(clonedFirst), "ids are not equals");
  clonedFirst.key.push("not-valid-usage");
  assert(!first.equals(clonedFirst), "ids are not equals");
});

Deno.test("identity.combine", () => {
  const first = id.identity("a", "b");
  const combined = first.child("c");
  assertEquals(combined.key, ["a", "b", "c"], "combine works");
});

Deno.test("identity.serialize", () => {
  const myIdentity = id.identity("a", "b");
  assertEquals(myIdentity.serialize(), "identity::a:b", "serialize works");
});

Deno.test("identity.deserialize", () => {
  const myIdentity = id.identity("a", "b");
  assertEquals(id.deserialize(myIdentity.serialize()), {
    kind: PrimitiveKind.Identity,
    key: ["a", "b"],
  }, "deserialize works");
});

Deno.test("identity.compact", () => {
  const myIdentity = id.identity("a", "b");
  const myChildIdentity = myIdentity.child("c", "d");
  const compacted = myIdentity.compact(myChildIdentity);
  assertEquals(compacted.serialize(), "identity::c:d", "compact works");
});
