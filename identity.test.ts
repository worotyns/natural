import { assertEquals } from "./testing.ts";
import * as id from "./identity.ts";

Deno.test("identity.identity", () => {
  const myIdentity = id.identity(
    "ns://",
    "normal",
    "identity/",
    "/with/slashes",
  );
  assertEquals(myIdentity, "ns://normal/identity/with/slashes");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("ns://normal/identity/", "/with/slashes");
  assertEquals(myIdentity, "ns://normal/identity/with/slashes");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("a", "b");
  assertEquals(myIdentity, "ns://a/b");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("a/b");
  assertEquals(myIdentity, "ns://a/b");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("ns://a/b");
  assertEquals(myIdentity, "ns://a/b");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("ns://a/b", "c");
  assertEquals(myIdentity, "ns://a/b/c");
});

Deno.test("identity.identity", () => {
  const myIdentity = id.identity("ns://a/b", "c", "/d", "/e/", "f/");
  assertEquals(myIdentity, "ns://a/b/c/d/e/f");
});

Deno.test("identity.combine", () => {
  const first = id.identity("a", "b");
  const combined = id.combine(first, "c");
  assertEquals(combined, "ns://a/b/c", "combine works");
});

Deno.test("identity.serialize", () => {
  const myIdentity = id.identity("a", "b");
  assertEquals(myIdentity, "ns://a/b", "serialize works");
});
