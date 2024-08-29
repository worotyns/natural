import { main } from "./main.ts";
import { assert, assertEquals, stub } from "../../testing.ts";
import { services } from "./services.ts";
import { userRoles } from "./user.ts";
import { store } from "../../repository.ts";

Deno.test("/auth", async () => {
  const generatedCodeStub = stub(
    services,
    "generateCode",
    () => Promise.resolve(123456),
  );

  const sendCode = await main.request("/auth/sign", {
    method: "POST",
    body: JSON.stringify({
      email: "a@a.com",
      expire_hours: 3,
    }),
  });

  const sendCodeResponse = await sendCode.json();

  assertEquals(sendCode.status, 200);
  assertEquals(sendCodeResponse.success, true);

  const tryToResendBefore60Sec = await main.request("/auth/sign/resend", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      email: "a@a.com",
    }),
  });

  const tryToResendBefore60SecResponse = await tryToResendBefore60Sec.json();

  assertEquals(tryToResendBefore60Sec.status, 200);
  assertEquals(tryToResendBefore60SecResponse.success, false);
  assertEquals(
    tryToResendBefore60SecResponse.error,
    "Cannot send code too often, wait 60 seconds",
  );

  const enterBadCode = await main.request("/auth/confirm", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      code: 666666,
    }),
  });

  const enterBadCodeResponse = await enterBadCode.json();

  assertEquals(enterBadCode.status, 200);
  assertEquals(enterBadCodeResponse.jwt, "");
  assertEquals(enterBadCodeResponse.success, false);
  assertEquals(enterBadCodeResponse.error, "given code not match");

  const enterGoodCode = await main.request("/auth/confirm", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      code: 123456,
    }),
  });

  const enterGoodCodeResponse = await enterGoodCode.json();

  assertEquals(enterGoodCode.status, 200);
  assertEquals(enterGoodCodeResponse.success, true);
  assertEquals(enterGoodCodeResponse.error, null);
  assert(enterGoodCodeResponse.jwt, "jwt exists");

  const enterGoodCodeAgain = await main.request("/auth/confirm", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      code: 123456,
    }),
  });
  const enterGoodCodeAgainResponse = await enterGoodCodeAgain.json();

  assertEquals(enterGoodCode.status, 200);
  assertEquals(enterGoodCodeAgainResponse.success, false);
  assertEquals(
    enterGoodCodeAgainResponse.error,
    "jwt already generated, can't generate again",
  );

  const checkAuth = await main.request("/auth/authorized", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${enterGoodCodeResponse.jwt}`,
    },
  });

  const checkAuthResponse = await checkAuth.json();
  assertEquals(checkAuth.status, 200);
  assert(checkAuthResponse.user);
  assertEquals(checkAuthResponse.role, userRoles.get("user"));
  assert(checkAuthResponse.iat);
  assert(checkAuthResponse.exp);
  
  generatedCodeStub.restore();
});

Deno.test("/auth as superuser", async () => {
  const generatedCodeStub = stub(
    services,
    "generateCode",
    () => Promise.resolve(123456),
  );

  const sendCode = await main.request("/auth/sign", {
    method: "POST",
    body: JSON.stringify({
      email: "mati@wdft.ovh",
      expire_hours: 3,
    }),
  });

  const sendCodeResponse = await sendCode.json();

  assertEquals(sendCode.status, 200);
  assertEquals(sendCodeResponse.success, true);

  const tryToResendBefore60Sec = await main.request("/auth/sign/resend", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      email: "mati@wdft.ovh",
    }),
  });

  const tryToResendBefore60SecResponse = await tryToResendBefore60Sec.json();

  assertEquals(tryToResendBefore60Sec.status, 200);
  assertEquals(tryToResendBefore60SecResponse.success, false);
  assertEquals(
    tryToResendBefore60SecResponse.error,
    "Cannot send code too often, wait 60 seconds",
  );

  const enterGoodCode = await main.request("/auth/confirm", {
    method: "POST",
    body: JSON.stringify({
      nsid: sendCodeResponse.nsid,
      code: 123456,
    }),
  });

  const enterGoodCodeResponse = await enterGoodCode.json();

  assertEquals(enterGoodCode.status, 200);
  assertEquals(enterGoodCodeResponse.success, true);
  assertEquals(enterGoodCodeResponse.error, null);
  assert(enterGoodCodeResponse.jwt, "jwt exists");

  const checkAuth = await main.request("/auth/authorized/admin", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${enterGoodCodeResponse.jwt}`,
    },
  });

  const checkAuthResponse = await checkAuth.json();
  assertEquals(checkAuth.status, 200);
  assert(checkAuthResponse.user);
  assertEquals(checkAuthResponse.role, userRoles.get("superuser"));

  const activities = await main.request("/admin/activity", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${enterGoodCodeResponse.jwt}`,
    },
  });

  const activitiesResponse = await activities.json();
  assertEquals(activitiesResponse.length, 11);

  console.log(store)

  generatedCodeStub.restore();
});
