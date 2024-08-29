import { type Context, Hono } from "jsr:@hono/hono";
import type { NamespacedIdentity } from "../../atom.ts";
import { identity } from "../../identity.ts";
import { atom } from "../../mod.ts";
import { assertIsAuthorized } from "./jwt.ts";
import type { JwtVariables } from "jsr:@hono/hono/jwt";

interface Team {
  name: string;
  nsid: NamespacedIdentity;
  role: number;
}

interface Meta {
  createdAt: number;
  lastSuccessLoginAt: number;
  lastFailLoginAt: number;
  deletedAt: number;
  activatedAt: number;
}

export interface User {
  email: string;
  name: string;
  meta: Meta;
  teams: Team[];
}

interface CreateUser {
  email: string;
}

function defaults(email: string): User {
  return {
    email: email,
    name: "",
    meta: {
      createdAt: 0,
      lastSuccessLoginAt: 0,
      lastFailLoginAt: 0,
      deletedAt: 0,
      activatedAt: 0,
    },
    teams: [],
  };
}

export const createOrRestoreUser = async (params: CreateUser) => {
  const user = await atom<User>(
    identity("users", params.email),
    defaults(params.email),
  ).fetch();

  if (user.value.meta.createdAt === 0) {
    await user.do(
      "user-created",
      async (ctx) => {
        if (!ctx.value.meta.createdAt) {
          await ctx.step("set-defaults", (value) => {
            value.meta.createdAt = Date.now();
          });
        }
      },
      params,
    );
  }

  return user;
};


export const app = new Hono<{ Variables: JwtVariables }>();

app.get("/users/me", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const user = await createOrRestoreUser(data);
  return c.json(user.value);
});

app.put("/users/me", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const user = await createOrRestoreUser(data);
  const payload = await c.req.json();
  
  await user.do('user-change-data', async (ctx) => {
    if (ctx.params.name) {
      await ctx.step('change-name', (value) => {
        value.name = ctx.params.name;
      })
    }
  }, {
    name: payload.name,
  })
  return c.json(user.value);
});