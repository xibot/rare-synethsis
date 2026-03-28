#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CONFIG, resolveState, zeroPad } from './lib.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const RECEIPTS_DIR = path.join(PROJECT_ROOT, 'receipts');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'output');
const STATE_DIR = path.join(PROJECT_ROOT, 'state');
const STATUS_FILE = path.join(STATE_DIR, 'agentic-status.json');
const LOG_FILE = path.join(STATE_DIR, 'agentic-last-decision.json');
const SUPER_MINT_RECEIPTS_DIR = '/home/ubuntu/superrare-mint/receipts';
const FLAT_AUTONOMOUS_STARTING_PRICE_ETH = '0.00101';

function parseArg(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  const next = process.argv[idx + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}

const BROADCAST = process.argv.includes('--broadcast');
const FORCE_TRIGGER = parseArg('--force-trigger', null);
const FORCE_BLOCK = parseArg('--force-block', null);
const DRY_LABEL = BROADCAST ? 'broadcast' : 'dry-run';

function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJSON(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2));
}

function run(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function safeRun(cmd, args) {
  try {
    return run(cmd, args);
  } catch {
    return '';
  }
}

function listFiles(dir, predicate = () => true) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .map((name) => path.join(dir, name))
    .filter((file) => fs.statSync(file).isFile() && predicate(file))
    .sort();
}

function latestFile(dir, predicate = () => true) {
  const files = listFiles(dir, predicate);
  return files.length ? files[files.length - 1] : null;
}

function normalizeAddress(value) {
  return String(value || '').trim().toLowerCase();
}

function ownerOf(contract, tokenId, rpcUrl) {
  const out = safeRun('cast', ['call', contract, 'ownerOf(uint256)(address)', String(tokenId), '--rpc-url', rpcUrl]);
  return out ? out.trim() : '';
}

function currentBlockNumber(rpcUrl) {
  if (FORCE_BLOCK) return Number(FORCE_BLOCK);
  return Number(run('cast', ['block-number', '--rpc-url', rpcUrl]));
}

function findDeployReceipt() {
  const file = latestFile(RECEIPTS_DIR, (f) => /rare-synethsis-deploy\.json$/.test(f));
  if (!file) throw new Error('Missing deploy receipt');
  return file;
}

function findLatestMintReceipt() {
  return latestFile(RECEIPTS_DIR, (f) => /rare-synethsis-.*mint\.json$/.test(f));
}

function findLatestExternalMintReceipt() {
  return latestFile(SUPER_MINT_RECEIPTS_DIR, (f) => /superrare-mint\.json$/.test(f));
}

function findSummaryPath(index) {
  const padded = zeroPad(index);
  const candidates = [
    path.join(OUTPUT_DIR, padded, 'summary.json'),
    index === 1 ? path.join(OUTPUT_DIR, 'genesis-001', 'summary.json') : null,
    index === 1 ? path.join(OUTPUT_DIR, 'test-001', 'summary.json') : null
  ].filter(Boolean);
  return candidates.find((file) => fs.existsSync(file)) || null;
}

function loadSummary(index) {
  const file = findSummaryPath(index);
  if (!file) return null;
  return readJSON(file);
}

function ensureCombinedLedger() {
  const used = new Set();
  const summaryFiles = [];
  const collect = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const summary = path.join(full, 'summary.json');
        if (fs.existsSync(summary)) summaryFiles.push(summary);
      }
    }
  };
  collect(OUTPUT_DIR);
  for (const file of summaryFiles) {
    try {
      const obj = readJSON(file);
      if (obj.compositionHash) used.add(obj.compositionHash);
    } catch {}
  }
  const ledgerFile = path.join(OUTPUT_DIR, 'ledger.json');
  writeJSON(ledgerFile, { used: [...used] });
  return ledgerFile;
}

function getMintedTokenIds(contract, rpcUrl, maxSupply) {
  const ids = [];
  for (let tokenId = 1; tokenId <= maxSupply; tokenId += 1) {
    const owner = ownerOf(contract, tokenId, rpcUrl);
    if (!owner) break;
    ids.push(tokenId);
  }
  return ids;
}

function hoursSince(isoTimestamp) {
  const ms = Date.now() - Date.parse(isoTimestamp);
  return ms / (1000 * 60 * 60);
}

function auctionContractForChain(chain) {
  switch (chain) {
    case 'mainnet':
      return '0x6D7c44773C52D396F43c2D511B81aa168E9a7a42';
    case 'sepolia':
      return '0xC8Edc7049b233641ad3723D6C60019D1c8771612';
    case 'base':
      return '0x51c36ffb05e17ed80ee5c02fa83d7677c5613de2';
    case 'base-sepolia':
      return '0x1f0c946f0ee87acb268d50ede6c9b4d010af65d2';
    default:
      return '';
  }
}

function postureAuctionSettings(posture) {
  switch (posture) {
    case 'Quiet':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 72 };
    case 'Measured':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 48 };
    case 'Pressurized':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 36 };
    case 'Assertive':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 24 };
    case 'Severe':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 72 };
    case 'Re-entry':
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 48 };
    default:
      return { startingPriceEth: FLAT_AUTONOMOUS_STARTING_PRICE_ETH, durationSeconds: 60 * 60 * 48 };
  }
}

function buildDecisionContext() {
  const deployReceiptFile = findDeployReceipt();
  const deploy = readJSON(deployReceiptFile);
  const contract = deploy.collectionAddress;
  const rpcUrl = deploy.rpcUrl;
  const artist = normalizeAddress(deploy.ownerAddress);
  const maxSupply = Number(CONFIG.maxSupply || 101);
  const mintedIds = getMintedTokenIds(contract, rpcUrl, maxSupply);
  const lastIndex = mintedIds.length;
  const latestMintReceiptFile = findLatestMintReceipt();
  if (!latestMintReceiptFile) throw new Error('Missing project mint receipt');
  const latestMintReceipt = readJSON(latestMintReceiptFile);
  const lastMintTimestamp = latestMintReceipt.timestamp;
  const lastSummary = loadSummary(lastIndex);
  if (!lastSummary) throw new Error(`Missing summary for token ${lastIndex}`);
  const lastOwner = normalizeAddress(ownerOf(contract, lastIndex, rpcUrl));
  const priorCollectors = new Set();
  for (const tokenId of mintedIds.slice(0, -1)) {
    const owner = normalizeAddress(ownerOf(contract, tokenId, rpcUrl));
    if (owner && owner !== artist) priorCollectors.add(owner);
  }
  const blockNumber = currentBlockNumber(rpcUrl);
  return {
    deployReceiptFile,
    deploy,
    contract,
    rpcUrl,
    artist,
    mintedIds,
    lastIndex,
    latestMintReceiptFile,
    lastMintTimestamp,
    lastSummary,
    lastOwner,
    priorCollectors,
    blockNumber,
    hoursSinceLastMint: hoursSince(lastMintTimestamp)
  };
}

function probePendingSettlement(ctx) {
  if (!ctx.lastIndex) {
    return { needed: false, tokenId: 0, reason: 'no_minted_tokens' };
  }

  const chain = String(ctx.deploy.chain || CONFIG.chain || 'mainnet');
  const auctionContract = auctionContractForChain(chain);
  if (!auctionContract) {
    return { needed: false, tokenId: ctx.lastIndex, reason: 'unsupported_chain', chain };
  }

  const args = [
    'estimate',
    auctionContract,
    'settleAuction(address,uint256)',
    ctx.contract,
    String(ctx.lastIndex),
    '--rpc-url',
    ctx.rpcUrl
  ];
  if (ctx.artist) {
    args.push('--from', ctx.artist);
  }

  try {
    const gasEstimate = run('cast', args);
    return {
      needed: true,
      tokenId: ctx.lastIndex,
      chain,
      auctionContract,
      gasEstimate
    };
  } catch {
    return {
      needed: false,
      tokenId: ctx.lastIndex,
      chain,
      auctionContract,
      reason: 'not_settleable'
    };
  }
}

function settlePendingAuction(ctx) {
  const beforeSettlementReceipts = listFiles(RECEIPTS_DIR, (f) => /rare-synethsis-auction-settle\.json$/.test(f));
  const settleArgs = [
    path.join(PROJECT_ROOT, 'scripts', 'settle-auction-via-bankr.sh'),
    '--token-id', String(ctx.lastIndex),
    '--deploy-receipt', ctx.deployReceiptFile,
    '--broadcast',
    '--note', `${CONFIG.collectionName} automatic auction settlement`
  ];
  const stdout = run('bash', settleArgs);
  const afterSettlementReceipts = listFiles(RECEIPTS_DIR, (f) => /rare-synethsis-auction-settle\.json$/.test(f));
  return {
    executed: true,
    stdout,
    receiptFile: newestAdded(beforeSettlementReceipts, afterSettlementReceipts) || latestFile(RECEIPTS_DIR, (f) => /rare-synethsis-auction-settle\.json$/.test(f))
  };
}

function decideTrigger(ctx) {
  if (ctx.lastIndex >= Number(CONFIG.maxSupply || 101)) {
    return { shouldMint: false, reason: 'max_supply_reached' };
  }

  const cooldownHours = Number(CONFIG.cooldownHours || 24);
  const cycleThresholdHours = Number(CONFIG.cycleThresholdHours || Math.max(cooldownHours * 3, (CONFIG.checkCadenceHours || 12) * 6));
  const silenceThresholdHours = Number(CONFIG.silenceThresholdHours || Math.max(cooldownHours * 7, (CONFIG.checkCadenceHours || 12) * 14));

  if (FORCE_TRIGGER) {
    return { shouldMint: true, trigger: FORCE_TRIGGER, reason: 'forced_trigger' };
  }

  if (ctx.hoursSinceLastMint < cooldownHours) {
    return {
      shouldMint: false,
      reason: 'cooldown',
      cooldownHours,
      hoursSinceLastMint: Number(ctx.hoursSinceLastMint.toFixed(2))
    };
  }

  if (ctx.lastOwner && ctx.lastOwner !== ctx.artist) {
    const trigger = ctx.priorCollectors.has(ctx.lastOwner) ? 'Return' : 'Sale';
    return { shouldMint: true, trigger, reason: 'ownership_changed' };
  }

  if (ctx.hoursSinceLastMint >= silenceThresholdHours) {
    return { shouldMint: true, trigger: 'Silence', reason: 'long_silence' };
  }

  if (ctx.hoursSinceLastMint >= cycleThresholdHours) {
    return { shouldMint: true, trigger: 'Cycle', reason: 'cycle_threshold' };
  }

  return {
    shouldMint: false,
    reason: 'waiting_for_signal',
    cycleThresholdHours,
    silenceThresholdHours,
    hoursSinceLastMint: Number(ctx.hoursSinceLastMint.toFixed(2))
  };
}

function newestAdded(before, after) {
  const beforeSet = new Set(before);
  const added = after.filter((file) => !beforeSet.has(file));
  return added.length ? added[added.length - 1] : (after.length ? after[after.length - 1] : null);
}

function copyMintReceipt(sourceFile, index) {
  if (!sourceFile || !fs.existsSync(sourceFile)) return null;
  const source = readJSON(sourceFile);
  const stamp = String(source.timestamp || new Date().toISOString()).replace(/:/g, '-');
  const target = path.join(RECEIPTS_DIR, `${stamp}-rare-synethsis-${zeroPad(index)}-mint.json`);
  fs.copyFileSync(sourceFile, target);
  return target;
}

function main() {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  ensureCombinedLedger();

  let ctx = buildDecisionContext();
  let settlement = probePendingSettlement(ctx);

  if (settlement.needed && !BROADCAST) {
    const status = {
      mode: DRY_LABEL,
      checkedAt: new Date().toISOString(),
      collection: CONFIG.collectionName,
      contract: ctx.contract,
      lastIndex: ctx.lastIndex,
      nextIndex: ctx.lastIndex + 1,
      lastMintTimestamp: ctx.lastMintTimestamp,
      hoursSinceLastMint: Number(ctx.hoursSinceLastMint.toFixed(2)),
      lastState: ctx.lastSummary.state,
      lastOwner: ctx.lastOwner,
      artist: ctx.artist,
      settlement,
      decision: {
        shouldMint: false,
        reason: 'pending_settlement',
        tokenId: ctx.lastIndex
      },
      preview: null
    };
    writeJSON(LOG_FILE, status);
    writeJSON(STATUS_FILE, status);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  if (settlement.needed && BROADCAST) {
    settlement = { ...settlement, ...settlePendingAuction(ctx) };
    ctx = buildDecisionContext();
  }

  const decision = decideTrigger(ctx);
  const nextIndex = ctx.lastIndex + 1;
  const preview = decision.shouldMint
    ? resolveState({
        index: nextIndex,
        trigger: decision.trigger,
        previousState: ctx.lastSummary.state,
        blockNumber: ctx.blockNumber,
        previousHash: ctx.lastSummary.compositionHash
      })
    : null;

  const status = {
    mode: DRY_LABEL,
    checkedAt: new Date().toISOString(),
    collection: CONFIG.collectionName,
    contract: ctx.contract,
    lastIndex: ctx.lastIndex,
    nextIndex,
    lastMintTimestamp: ctx.lastMintTimestamp,
    hoursSinceLastMint: Number(ctx.hoursSinceLastMint.toFixed(2)),
    lastState: ctx.lastSummary.state,
    lastOwner: ctx.lastOwner,
    artist: ctx.artist,
    settlement,
    decision,
    preview
  };

  if (!decision.shouldMint || !BROADCAST) {
    writeJSON(LOG_FILE, status);
    writeJSON(STATUS_FILE, status);
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  const beforeMintReceipts = listFiles(SUPER_MINT_RECEIPTS_DIR, (f) => /superrare-mint\.json$/.test(f));
  const mintArgs = [
    path.join(PROJECT_ROOT, 'scripts', 'mint-token.sh'),
    '--index', String(nextIndex),
    '--trigger', String(decision.trigger),
    '--block-number', String(ctx.blockNumber),
    '--previous-state', String(ctx.lastSummary.state),
    '--previous-hash', String(ctx.lastSummary.compositionHash),
    '--deploy-receipt', ctx.deployReceiptFile,
    '--broadcast'
  ];
  const mintStdout = run('bash', mintArgs);

  const afterMintReceipts = listFiles(SUPER_MINT_RECEIPTS_DIR, (f) => /superrare-mint\.json$/.test(f));
  const externalMintReceipt = newestAdded(beforeMintReceipts, afterMintReceipts) || findLatestExternalMintReceipt();
  const projectMintReceipt = copyMintReceipt(externalMintReceipt, nextIndex);
  const nextSummaryFile = path.join(OUTPUT_DIR, zeroPad(nextIndex), 'summary.json');
  const nextSummary = readJSON(nextSummaryFile);
  ensureCombinedLedger();

  const auctionSettings = postureAuctionSettings(nextSummary.posture);
  const auctionArgs = [
    path.join(PROJECT_ROOT, 'scripts', 'auction-via-bankr.sh'),
    '--token-id', String(nextIndex),
    '--starting-price', auctionSettings.startingPriceEth,
    '--duration', String(auctionSettings.durationSeconds),
    '--deploy-receipt', ctx.deployReceiptFile,
    '--broadcast',
    '--note', `${CONFIG.collectionName} autonomous ${nextSummary.posture} auction`
  ];
  const auctionStdout = run('bash', auctionArgs);
  const latestAuctionReceipt = latestFile(RECEIPTS_DIR, (f) => /rare-synethsis-auction-create\.json$/.test(f));

  const finalStatus = {
    ...status,
    executed: true,
    mint: {
      stdout: mintStdout,
      summaryFile: nextSummaryFile,
      receiptFile: projectMintReceipt,
      summary: nextSummary
    },
    auction: {
      settings: auctionSettings,
      stdout: auctionStdout,
      receiptFile: latestAuctionReceipt
    }
  };

  writeJSON(LOG_FILE, finalStatus);
  writeJSON(STATUS_FILE, finalStatus);
  console.log(JSON.stringify(finalStatus, null, 2));
}

try {
  main();
} catch (error) {
  const failure = {
    mode: DRY_LABEL,
    checkedAt: new Date().toISOString(),
    error: String(error && error.message ? error.message : error)
  };
  writeJSON(LOG_FILE, failure);
  writeJSON(STATUS_FILE, failure);
  console.error(JSON.stringify(failure, null, 2));
  process.exit(1);
}
