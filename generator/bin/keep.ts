// `pnpm keep <.generated run dir>`.

import { main } from "../keep.ts";

process.exitCode = await main(process.argv.slice(2));
