import type { NamespacedIdentity } from "../../atom.ts";
import { identity } from "../../identity.ts";
import { type Atom, atom } from "../../mod.ts";
import { assert } from "../../utils.ts";

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
  activities: NamespacedIdentity[];
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
    activities: [],
  };
}

export const createOrRestoreUser = async (params: CreateUser) => {
  const user = atom<User>(
    identity("users", params.email),
    defaults(params.email),
  );

  await user.do(
    "user-created",
    async (ctx) => {
      if (!ctx.value.meta.createdAt) {
        await ctx.step("set-defaults", (value) => {
          value.meta.createdAt = Date.now();
          value.activities.push(ctx.activity.activity.nsid);
        });
      }

      if (ctx.value.activities.length > 50) {
        await ctx.step("cut-activities", (value) => {
          value.activities = value.activities.slice(-50);
        });
      }
    },
    params,
  );

  return user;
};
