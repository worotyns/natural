import { identity } from "../identity.ts";
import { boolean, temporary } from "../mod.ts";

const beteFeatures = boolean(false, identity("dev", "global_features", "ui_visible_beta_features"));

const john = temporary("dev", "users", "john@doe.com");
john.loose.add(beteFeatures);

const joe = temporary("dev", "users", "joe@doe.com");
joe.loose.add(beteFeatures);

beteFeatures.positive()

console.log({
  john: john.toJSON(),
  joe: joe.toJSON(),
})
