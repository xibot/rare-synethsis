#!/usr/bin/env node
import path from "node:path";
import fs from "node:fs";
import { OUTPUT_DIR, STATE_ORDER } from "./lib.mjs";
import { spawnSync } from "node:child_process";

const previewDir = path.join(OUTPUT_DIR, "preview-states");
fs.rmSync(previewDir, { recursive: true, force: true });
fs.mkdirSync(previewDir, { recursive: true });
const triggerMap = {
  "Dormant": "Silence",
  "Charged": "Cycle",
  "Compression": "Attention",
  "Dense Market": "Attention",
  "Threshold": "Attention",
  "Fracture After Sale": "Sale",
  "Dispersed Memory": "Silence",
  "Echo Return": "Return",
  "Collapse Signal": "Silence",
  "Reformation": "Cycle"
};

STATE_ORDER.forEach((state, idx) => {
  const index = idx + 1;
  const out = path.join(previewDir, `${String(index).padStart(3, "0")}-${state.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`);
  const result = spawnSync("node", [
    path.join(path.dirname(new URL(import.meta.url).pathname), "generate-token.mjs"),
    "--index", String(index),
    "--state", state,
    "--trigger", triggerMap[state],
    "--block-number", String(19000000 + index),
    "--out", out,
    "--ledger", path.join(previewDir, "ledger.json")
  ], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
});

console.log(`Preview files written to ${previewDir}`);
