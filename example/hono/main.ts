import { Hono } from "jsr:@hono/hono@^4.5.9";
import { app as authApp } from "./auth.ts";
import { createOrRestoreUser, app as userApp, userRoles } from "./user.ts";
import { app as adminApp } from "./admin.ts";
import { createJwtToken } from "./jwt.ts";
import { cors } from 'jsr:@hono/hono/cors'
import { dumpStorage } from "../../testing.ts";

// TODO:
// Invite people to a team
// People can assign to notifications
// Create QR Code
// On scan QR -> register scan action and send webhook (retry if failed, exponential 3 times)
// Send push notification to user

export const main = new Hono();

await createOrRestoreUser({ email: "a@a.com" });
const jwt = await createJwtToken({
  user: "ns://users/a@a.com",
  email: "a@a.com",
  role: userRoles.get("superuser")!,
  expireHours: 1,
});

console.log({jwt})

await dumpStorage();

main.use('/*', cors());

main.route("/", authApp);
main.route("/", userApp);
main.route("/", adminApp);

Deno.serve(main.fetch);
