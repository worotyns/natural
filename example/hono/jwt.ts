import { HTTPException } from "jsr:@hono/hono/http-exception";
import type { Context, Next } from "jsr:@hono/hono";
import { jwt } from "jsr:@hono/hono/jwt";
import { assert } from "../../utils.ts";
import { has } from "../../permission.ts";

export const JWT_SECRET = Deno.env.get("JWT_SECRET") ||
  "my-very-very-secret-variable-used-as-jwt-secret";

export const assertIsAuthorized = jwt({
  secret: JWT_SECRET,
});

export const assertHasRole = function (role?: number) {
  assert(
    typeof role === "number",
    "role is not defined - check role in assertHasRole",
  );
  return async (context: Context, next: Next) => {
    const data = context.get("jwtPayload");

    assert(data, "jwt is not defined");
    assert(data.role, "jwt role is not defined");

    if (!has(data.role, role)) {
      throw new HTTPException(403);
    }

    await next();
  };
};