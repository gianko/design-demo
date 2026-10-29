// Keeps a Mac awake for a paid run: idle sleep drops the API's open
// connections, and every rep in flight ends in error:api (#319). caffeinate
// exits with this process. A closed lid still sleeps on battery, so say so.

import { execFileSync, spawn } from "node:child_process";

export function stayAwake() {
  if (process.platform !== "darwin") return;
  spawn("caffeinate", ["-i", "-w", String(process.pid)], { stdio: "ignore" })
    .on("error", () =>
      console.log("caffeinate didn't start: keep the Mac awake")
    )
    .unref();
  try {
    const power = execFileSync("pmset", ["-g", "batt"], { encoding: "utf8" });
    if (power.includes("'Battery Power'"))
      console.log(
        "on battery: plug in, and keep the lid open, or sleep ends the run's reps in error:api"
      );
  } catch {
    // No pmset: nothing to warn about.
  }
}
