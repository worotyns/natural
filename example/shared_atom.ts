import { temporary } from "../mod.ts";

const globalFeatures = temporary("ns://dev/global_features");
const betaFeatures = globalFeatures.boolean(false, "ui_visible_beta_features");

const john = temporary("ns://dev/users/john@doe.com").defaults({
  friends: [],
});

john.connect(betaFeatures);

const joe = temporary("ns://dev/users/joe@doe.com").defaults({
  friends: ["kamala@email.com"],
});

joe.connect(betaFeatures);

betaFeatures.positive();

console.log({
  john: john.toJSON({ pretty: true }),
  joe: joe.toJSON({ pretty: true }),
});
