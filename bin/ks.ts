import { Command } from "commander";
const program = new Command();
import * as packageJson from "../package.json";

import create from "../cli/lib/create";

program
  .version(packageJson.version, "-v, --version")
  .command("create")
  .description("Create new project")
  .alias("c")
  .action(async () => await create());

program.parse(process.argv);
