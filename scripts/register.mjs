import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./resolve-js.mjs", pathToFileURL("./scripts/"));
