import { type Context, Hono } from "jsr:@hono/hono";
import type { Atom, NamespacedIdentity } from "../../mod.ts";
import { flags } from "../../permission.ts";
import type { JwtVariables } from "jsr:@hono/hono/jwt";
import { assertIsAuthorized } from "./jwt.ts";
import { createOrRestoreUser, type User } from "./user.ts";
import { slug } from "../../utils.ts";
import { identity } from "../../identity.ts";

interface Meta {
  createdAt: number;
  deletedAt: number;
}

interface MemberMeta {
  state: "invited" | "joined" | "owner";
  joinedAt: number;
  invitedBy: NamespacedIdentity;
}

interface Member {
  role: number;
  email: string;
  nsid: NamespacedIdentity;
  meta: MemberMeta;
}

interface QrMeta {
  createAt: number;
  deletedAt: number;
}

interface QR {
  code: string;
  meta: QrMeta;
}

interface Team {
  name: string;
  meta: Meta;
  qr: QR[];
  members: Member[];
  invitations: NamespacedIdentity[];
}

const roles = [
  "team.owner",
  "team.member",
] as const;

export const teamRoles = flags<typeof roles>(roles);
export const app = new Hono<{ Variables: JwtVariables }>();

interface CreateTeamDto {
  name: string;
}

// anty pattern w sumie zrobilem,
// atom pwoinnien byc stworzony z kontekstu, wtedy bede mial jak robic transakcyjnosc?
export const createNewTeam = async (
  name: string,
  user: Atom<User>,
): Promise<Atom<Team>> => {
  let team: null | Atom<Team> = null;

  await user.do("create-team", async (userCtx) => {
    team = userCtx.atom<Team>(identity("ns://teams/:ulid", slug(name)), {
      members: [{
        role: teamRoles.get("team.owner")!,
        email: user.value.email,
        nsid: user.nsid,
        meta: {
          state: "owner",
          joinedAt: Date.now(),
          invitedBy: user.nsid,
        },
      }],
      invitations: [],
      qr: [],
      meta: {
        createdAt: Date.now(),
        deletedAt: 0,
      },
      name: name,
    });

    await team.do("assign-team-owner", (teamCtx) => {
      userCtx.value.teams.push({
        name: teamCtx.value.name,
        nsid: teamCtx.nsid,
        role: teamRoles.get("team.owner")!,
      });
    });
  });

  return team!;
};

app.post("/teams", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const user = await createOrRestoreUser(data);
  const payload = await c.req.json<CreateTeamDto>();
  const team = await createNewTeam(payload.name, user);
  return c.json(team.value);
});

app.get("/teams", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const _user = await createOrRestoreUser(data);

  return c.json([]);
});
