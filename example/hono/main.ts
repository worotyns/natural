import { Hono } from "jsr:@hono/hono@^4.5.9";
import { app as authApp } from "./auth.ts";
import { app as userApp } from "./user.ts";
import { app as adminApp } from "./admin.ts";

// TODO ATOMS:
// Przekminic czy jeden atom nie powinnien miec "sztywnego" activity pod katem zmian i logow?
// A dodatkowo robic wpisy w ns://acitivity/:ulid/{type} -> ns://users/sample@user.com/activity <- jest wpis i przywrocic w logach date :D 
// Po czasie bym krecil sobie logami po prostu i je jakos czyscil albo archiwizowal? (team / user) jest problemem, reszta jest git bo to procesowe podejscia,
// Albo robic "dzienne/tgodniowe/miesieczne/roczne/singleton" wpisy po prostu w zaleznosci od potrzeby?
// Na atomie zrobic po prostu {activity: {nsid, pattern, current}}, tak zeby rotacja zadzialałała


// TODO:
// Prepare admin "scan" activites endpoint
// Create a team
// Invite people to a team
// People can assign to notifications
// Create QR Code
// On scan QR -> register scan action and send webhook (retry if failed, exponential 3 times)
// Send push notification to user

export const main = new Hono();

main.route("/", authApp);
main.route("/", userApp);
main.route("/", adminApp);

Deno.serve(main.fetch);
