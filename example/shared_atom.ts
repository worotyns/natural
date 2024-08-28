import { temporary as molecule } from "../mod.ts";

const globalFeatures = molecule("ns://dev/global_features");
const betaFeatures = globalFeatures.boolean(false, "ui_visible_beta_features");

const john = molecule("ns://dev/users/john@doe.com").defaults({
  friends: [],
});

await john.registerActivity("create-user", { source: "web app" });

john.connect(betaFeatures);

const joe = molecule("ns://dev/users/joe@doe.com").defaults({
  friends: ["kamala@email.com"],
});

await john.registerActivity("create-user", { source: "mobile app" });

joe.connect(betaFeatures);

betaFeatures.positive();

console.log({
  john: john.toJSON({ pretty: true }),
  joe: joe.toJSON({ pretty: true }),
});

const johnFeatures = john.pick((atom) =>
  atom.identity.startsWith("ns://dev/global_features")
);
console.log(johnFeatures.map((a) => a.toJSON({ pretty: true })));

console.log(await john.scanActivities());
