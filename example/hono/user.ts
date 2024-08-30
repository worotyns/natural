import { type Context, Hono } from "jsr:@hono/hono";
import type { NamespacedIdentity } from "../../atom.ts";
import { identity } from "../../identity.ts";
import { Atom, atom } from "../../mod.ts";
import { assertIsAuthorized } from "./jwt.ts";
import type { JwtVariables } from "jsr:@hono/hono/jwt";
import { flags } from "../../permission.ts";

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

export const userAtom = (email: string, contextAtomFactory = atom): Atom<User> => {
  return contextAtomFactory<User>(
    identity("users", email),
    defaults(email),
  );
}

export const createOrRestoreUser = async (params: CreateUser) => {
  const user = await userAtom(params.email).fetch();

  if (user.value.meta.createdAt === 0) {
    await user.do(
      "user-created",
      async (ctx) => {
        ctx.activity.registerInActivities('new-user');
        if (!ctx.value.meta.createdAt) {
          ctx.value.meta.createdAt = Date.now();
        }
      },
      params,
    );
  }

  return user;
};

const roles = [
  "superuser",
  "user",
] as const;

export const userRoles = flags<typeof roles>(roles);
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

  await user.do("user-change-data", async (ctx) => {
    if (ctx.params.name) {
      ctx.value.name = ctx.params.name;
    }
  }, {
    name: payload.name,
  });

  return c.json(user.value);
});
