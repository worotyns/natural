import { Hono } from "jsr:@hono/hono@^4.5.9";
import { app as authApp } from "./auth.ts";
import { app as userApp } from "./user.ts";

// TODO:
// Create a team
// Invite people to a team
// People can assign to notifications
// Create QR Code
// On scan QR -> register scan action and send webhook (retry if failed, exponential 3 times)
// Send push notification to user

export const main = new Hono();

main.route("/", authApp);
main.route('/', userApp);

Deno.serve(main.fetch);
