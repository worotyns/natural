import { Hono } from 'jsr:@hono/hono@^4.5.9'
import { auth } from "./auth.ts";

// TODO:
// Login/signup with code confirmation
// Create a team
// Invite people to a team
// People can assign to notifications
// Create QR Code
// On scan QR -> register scan action and send webhook (retry if failed, exponential 3 times)
// Send push notification to user

const main = new Hono()

main.route('/', auth);
// main.route('/', health);

Deno.serve(main.fetch)
