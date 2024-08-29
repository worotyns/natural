import { type Context, Hono } from "jsr:@hono/hono";
import type { JwtVariables } from "jsr:@hono/hono/jwt";
import { assertHasRole, assertIsAuthorized } from "./jwt.ts";
import { userRoles } from "./user.ts";
import { scan } from "../../mod.ts";
import { identity } from "../../identity.ts";

export const app = new Hono<{ Variables: JwtVariables }>();

app.get(
  "/admin/activity",
  assertIsAuthorized,
  assertHasRole(userRoles.get("superuser")),
  async (c: Context) => {
    return c.json(await scan(identity("activity"), identity("activity")));
  },
);
