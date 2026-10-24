// `pnpm keep <.generated rep dir>`.

import { main } from "../keep.ts";

process.exitCode = await main(process.argv.slice(2));
