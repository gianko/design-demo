// `pnpm eval:report`: see ../report.ts.

import { main } from "../report.ts";

process.exitCode = await main(process.argv.slice(2));
