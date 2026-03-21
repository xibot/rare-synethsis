#!/usr/bin/env node
import { parseArgs, resolveState } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2));
const index = Number(args.index || args["token-id"] || 1);
const trigger = args.trigger || "Cycle";
const blockNumber = Number(args["block-number"] || 0);
const previousState = args["previous-state"] || "None";
const previousHash = args["previous-hash"] || "genesis";

const resolved = resolveState({ index, trigger, previousState, blockNumber, previousHash });
console.log(JSON.stringify({ index, blockNumber, previousState, previousHash, ...resolved }, null, 2));
