#!/usr/bin/env node
import path from "node:path";
import { parseArgs, OUTPUT_DIR, buildToken, loadLedger, saveLedger, writeTokenFiles, zeroPad } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const index = Number(args.index || args["token-id"] || 1);
const blockNumber = Number(args["block-number"] || 0);
const state = args.state || null;
const trigger = args.trigger || "Cycle";
const previousState = args["previous-state"] || "None";
const previousHash = args["previous-hash"] || "genesis";
const seedKey = args["seed-key"] || null;
const ledgerFile = args.ledger || path.join(OUTPUT_DIR, "ledger.json");
const outDir = args.out || path.join(OUTPUT_DIR, `${zeroPad(index)}`);
const writeLedger = args["no-ledger"] ? false : true;

const ledger = loadLedger(ledgerFile);
const token = buildToken({ index, state, trigger, blockNumber, previousState, previousHash, seedKey, ledger });
writeTokenFiles({ outDir, token });
if (writeLedger) {
  ledger.used = [...new Set([...(ledger.used || []), token.compositionHash])];
  saveLedger(ledgerFile, ledger);
}
console.log(JSON.stringify({
  outDir,
  title: token.metadata.name,
  state: token.resolved.state,
  trigger: token.resolved.trigger,
  posture: token.resolved.posture,
  polarity: token.polarity,
  retentionRatio: token.retentionRatio,
  dispersion: token.dispersion,
  symmetry: token.symmetry,
  compositionHash: token.compositionHash,
  seedBasis: token.metadata.aai.seedBasis
}, null, 2));
