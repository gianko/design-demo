// `pnpm eval:readme`: see ../readme.ts.

import { main } from "../readme.ts";

process.exitCode = await main(process.argv.slice(2));
