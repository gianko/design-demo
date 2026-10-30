// The pinned image every Playwright pass renders in (ADR 0009), shared by
// `pnpm gate` and the generator's render pass, so both use one renderer.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { repo } from "../repo.ts";

// Chromium's flags in the image, for every pass that renders there.
//
// --disable-partial-raster: a tile repainted after its first raster is
// otherwise rastered only where it changed, and antialiased edges there (a
// Card's rounded corners) blend one level off a full raster's. Which one a
// shot gets depends on timing, so gate 6 flaked under load.
//
// --disable-lcd-text: text is otherwise antialiased per subpixel, which
// leaves orange and blue fringes on every glyph. A person never sees those
// in a screenshot, but gate 5's judge does: on the my-invoices screen with
// its Sheet open, the scrim greyed the page and the judge read the fringes
// as berry-tinted invoice numbers (#345).
export const chromiumArgs = ["--disable-partial-raster", "--disable-lcd-text"];

// The image is pinned to the installed @playwright/test, so bumping the
// package bumps the renderer with it and the two can't drift.
export function playwrightImage() {
  const { version } = JSON.parse(
    readFileSync(
      resolve(repo, "node_modules/@playwright/test/package.json"),
      "utf8"
    )
  );
  return `mcr.microsoft.com/playwright:v${version}-noble`;
}

// `docker run` arguments for `playwright test` in the image, with the repo
// mounted at its working directory. `env` is passed into the container.
export function playwrightInImage(
  config: string,
  playwrightArgs: string[],
  env: Record<string, string | undefined>
): string[] {
  return nodeInImage(
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      `--config=${config}`,
      ...playwrightArgs,
    ],
    env
  );
}

// `docker run` arguments for `node <nodeArgs>` in the image, set up as for
// playwrightInImage.
export function nodeInImage(
  nodeArgs: string[],
  env: Record<string, string | undefined> = {}
): string[] {
  return [
    "run",
    "--rm",
    "--init",
    "--ipc=host",
    // The Mac and the CI runner are both arm64; Chromium's antialiasing can
    // differ between architectures.
    "--platform=linux/arm64",
    // Files the pass writes belong to the caller, and Chromium needs a HOME.
    `--user=${process.getuid!()}:${process.getgid!()}`,
    "--env=HOME=/tmp",
    ...Object.entries(env).flatMap(([name, value]) =>
      value === undefined ? [] : [`--env=${name}=${value}`]
    ),
    `--volume=${repo}:/work`,
    "--workdir=/work",
    playwrightImage(),
    "node",
    ...nodeArgs,
  ];
}
