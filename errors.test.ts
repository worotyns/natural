import { assertEquals } from "./deps.ts";
import { InvalidStateError } from "./errors.ts";

Deno.test('error format', () => {
  const err = InvalidStateError.format('%s', 'test');
  assertEquals(err.message, 'test');
})