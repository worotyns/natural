import { type Context, Hono } from "jsr:@hono/hono";
import { Atom, atom, type NamespacedIdentity } from "../../mod.ts";
import { flags } from "../../permission.ts";
import type { JwtVariables } from "jsr:@hono/hono/jwt";
import { assertIsAuthorized } from "./jwt.ts";
import { createOrRestoreUser, User } from "./user.ts";
import { assert, slug } from "../../utils.ts";
import { identity } from "../../identity.ts";

interface Meta {
  createdAt: number;
  deletedAt: number;
}

interface MemberMeta {
  state: "invited" | "joined" | "owner"
  joinedAt: number
  invitedBy: NamespacedIdentity
}

interface Member {
  role: number;
  email: string;
  nsid: NamespacedIdentity;
  meta: MemberMeta
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
export const createNewTeam = async (name: string, user: Atom<User>): Promise<Atom<Team>> => {
  const team = atom<Team>(identity('ns://teams/:ulid', slug(name)), {
    members: [
      {
        role: teamRoles.get('team.owner')!,
        email: user.value.email,
        nsid: user.nsid,
        meta: {
          state: "owner",
          joinedAt: Date.now(),
          invitedBy: user.nsid,
        },
      }
    ],
    invitations: [],
    qr: [],
    meta: {
      createdAt: Date.now(),
      deletedAt: 0,
    },
    name: name,
  });

  // ka me ha me mocne, trzeba by step wywalic w sumie, wtedy nie potrzebuje resultsa w activity?
  // w logach bedzie git,
  // brakuje mi tylko transakcji jak sa nested wartosci, mozna by dodac depsy, jakos?
  await team.do("team-create", async (teamCtx) => {
    await teamCtx.step("assign-team-owner", async (teamData) => {
      await user.do('append-team-data', async (userCtx) => {
        await userCtx.step("append-team-data", (userData) => {
          userData.teams.push({
            name: teamCtx.params.name,
            nsid: team.nsid,
            role: teamRoles.get('team.owner')!,
          });
        });
      }, {name: teamData.name});
    });
  }, {name: name})  
  
  return team;
}

app.post("/teams", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const user = await createOrRestoreUser(data);
  const payload = await c.req.json<CreateTeamDto>();
  const team = await createNewTeam(payload.name, user);
  return c.json(team.value);
});

app.get("/teams", assertIsAuthorized, async (c: Context) => {
  const data = c.get("jwtPayload");
  const user = await createOrRestoreUser(data);

  return c.json([]);
});
