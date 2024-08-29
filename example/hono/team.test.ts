import { assertEquals } from "../../testing.ts";
import { createJwtToken } from "./jwt.ts";
import { app } from "./team.ts";
import { createNewTeam } from "./team.ts";
import { createOrRestoreUser, userRoles } from "./user.ts";

Deno.test("team", async () => {
  const testUser = await createOrRestoreUser({
    email: "mati@wp.pl",
  });

  const team = await createNewTeam("test", testUser);
  
  assertEquals(team.value.members.length, 1);
  assertEquals(testUser.value.teams.length, 1);

  const [member] = team.value.members;
  const [owner] = testUser.value.teams;

  assertEquals(member.role, owner.role);
  assertEquals(member.meta.invitedBy, testUser.nsid);
  assertEquals(team.nsid, owner.nsid);
});

Deno.test('/teams create a team', async () => {
  await createOrRestoreUser({email: 'a@a.com'});

  const jwt = await createJwtToken({
    user: "ns://users/a@a.com",
    email: "a@a.com",
    role: userRoles.get('user')!,
    expireHours: 1,
  });

  const createTeam = await app.request("/teams", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${jwt}`,
    },
    body: JSON.stringify({
      name: "My Team"
    })
  });

  const createTeamResponse = await createTeam.json();
  console.log(createTeamResponse);  
  assertEquals(createTeam.status, 200);

})