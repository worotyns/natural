import { assertEquals } from "./deps.ts";
import { deserialize, serialize, combine } from "./identifier.ts";

Deno.test('identifier', () => {
  assertEquals(serialize(['a', 'b']), 'a:b', 'serialize works');
  assertEquals(deserialize('a:b'), ['a', 'b'], 'deserialize works');
  assertEquals(combine(['a', 'b'], ['c']), ['a', 'b', 'c'], 'combine works');
})