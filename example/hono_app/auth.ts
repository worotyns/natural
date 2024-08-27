import { Hono } from "jsr:@hono/hono@^4.5.9";
// local import normaly from jsr:@worotyns/normal;
import { persistent } from "../../mod.ts"

export const auth = new Hono()

auth.get('/auth', (c) => {
  return c.text('Hello Hono! - auth')
})