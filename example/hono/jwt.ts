import { jwt } from "jsr:@hono/hono/jwt";

export const JWT_SECRET = Deno.env.get("JWT_SECRET") ||
  "my-very-very-secret-variable-used-as-jwt-secret";

export const assertIsAuthorized = jwt({
  secret: JWT_SECRET,
});
