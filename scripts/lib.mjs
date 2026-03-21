import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, "..");
export const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");
export const ASSET_PATH = path.join(PROJECT_ROOT, "assets", "AAi_RARE_SYNETHSIS.svg");
export const CONFIG = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "collection.config.json"), "utf8"));

export const TRIGGERS = ["Genesis", "Silence", "Attention", "Sale", "Return", "Cycle"];
export const STATE_ORDER = [
  "Dormant",
  "Charged",
  "Compression",
  "Dense Market",
  "Threshold",
  "Fracture After Sale",
  "Dispersed Memory",
  "Echo Return",
  "Collapse Signal",
  "Reformation"
];

export const STATE_DEFS = {
  "Dormant": {
    retention: [0.20, 0.35],
    fieldFraction: [0.05, 0.15],
    dispersionRadius: [1, 3],
    symmetry: [0.82, 0.98],
    polarity: "Positive",
    posture: "Quiet",
    weights: { edge: 1.15, center: -0.20, align: 0.15 }
  },
  "Charged": {
    retention: [0.60, 0.75],
    fieldFraction: [0.02, 0.08],
    dispersionRadius: [1, 2],
    symmetry: [0.78, 0.95],
    polarity: "Positive",
    posture: "Measured",
    weights: { edge: 0.25, center: 0.80, align: 0.10 }
  },
  "Compression": {
    retention: [0.75, 0.90],
    fieldFraction: [0.03, 0.10],
    dispersionRadius: [1, 2],
    symmetry: [0.72, 0.92],
    polarity: "Positive",
    posture: "Pressurized",
    weights: { edge: -0.10, center: 1.05, align: 0.25 }
  },
  "Dense Market": {
    retention: [0.85, 1.00],
    fieldFraction: [0.10, 0.22],
    dispersionRadius: [1, 3],
    symmetry: [0.66, 0.88],
    polarity: "Inverted",
    posture: "Assertive",
    weights: { edge: 0.10, center: 0.95, align: 0.30 }
  },
  "Threshold": {
    retention: [0.50, 0.65],
    fieldFraction: [0.15, 0.30],
    dispersionRadius: [2, 5],
    symmetry: [0.45, 0.72],
    polarity: "Inverted",
    posture: "Pressurized",
    weights: { edge: 0.35, center: 0.25, align: -0.45 }
  },
  "Fracture After Sale": {
    retention: [0.35, 0.50],
    fieldFraction: [0.30, 0.55],
    dispersionRadius: [3, 7],
    symmetry: [0.20, 0.52],
    polarity: "Inverted",
    posture: "Assertive",
    weights: { edge: 0.40, center: 0.10, align: -1.10 }
  },
  "Dispersed Memory": {
    retention: [0.25, 0.40],
    fieldFraction: [0.35, 0.65],
    dispersionRadius: [4, 9],
    symmetry: [0.18, 0.45],
    polarity: "Inverted",
    posture: "Quiet",
    weights: { edge: 0.55, center: -0.15, align: -0.80 }
  },
  "Echo Return": {
    retention: [0.30, 0.55],
    fieldFraction: [0.20, 0.45],
    dispersionRadius: [2, 6],
    symmetry: [0.30, 0.62],
    polarity: "Inverted",
    posture: "Measured",
    weights: { edge: 0.20, center: 0.45, align: 0.90 }
  },
  "Collapse Signal": {
    retention: [0.10, 0.20],
    fieldFraction: [0.05, 0.12],
    dispersionRadius: [3, 8],
    symmetry: [0.10, 0.38],
    polarity: "Inverted",
    posture: "Severe",
    weights: { edge: 1.35, center: -0.85, align: -0.30 }
  },
  "Reformation": {
    retention: [0.45, 0.70],
    fieldFraction: [0.10, 0.25],
    dispersionRadius: [1, 4],
    symmetry: [0.58, 0.85],
    polarity: "Positive",
    posture: "Re-entry",
    weights: { edge: 0.12, center: 0.72, align: 0.50 }
  }
};

const TRIGGER_STATE_WEIGHTS = {
  Genesis: {
    "Fracture After Sale": 12
  },
  Silence: {
    "Dormant": 5,
    "Collapse Signal": 3,
    "Dispersed Memory": 2
  },
  Attention: {
    "Charged": 3,
    "Compression": 5,
    "Dense Market": 5,
    "Threshold": 3
  },
  Sale: {
    "Fracture After Sale": 8,
    "Dispersed Memory": 3,
    "Reformation": 2
  },
  Return: {
    "Echo Return": 8,
    "Reformation": 3,
    "Charged": 1
  },
  Cycle: {
    "Charged": 3,
    "Dormant": 3,
    "Reformation": 3
  }
};

const PHASE_BIASES = [
  { maxIndex: 20, boosts: { "Dormant": 2, "Charged": 2, "Compression": 1 } },
  { maxIndex: 50, boosts: { "Compression": 2, "Dense Market": 2, "Threshold": 1 } },
  { maxIndex: 80, boosts: { "Threshold": 1, "Fracture After Sale": 2, "Dispersed Memory": 1, "Echo Return": 1 } },
  { maxIndex: 101, boosts: { "Collapse Signal": 2, "Reformation": 2, "Echo Return": 1 } }
];

const GENESIS_COMPOSITION_SEED = "6:Fracture After Sale:Sale:19000006:genesis";

export function zeroPad(index, width = 3) {
  return String(index).padStart(width, "0");
}

export function hashText(input) {
  return crypto.createHash("sha256").update(String(input)).digest("hex");
}

export function makeRng(seedText) {
  const hash = hashText(seedText);
  let state = BigInt(`0x${hash.slice(0, 16)}`) || 1n;
  return () => {
    state ^= state << 13n;
    state ^= state >> 7n;
    state ^= state << 17n;
    const normalized = Number(state & ((1n << 53n) - 1n)) / Number((1n << 53n) - 1n);
    return normalized;
  };
}

export function readSeedSvg(seedPath = ASSET_PATH) {
  const svg = fs.readFileSync(seedPath, "utf8");
  const pathMatches = [...svg.matchAll(/<path\b([^>]*?)\/?>(?:<\/path>)?/g)];
  const points = new Map();
  let background = { fill: "#fff", width: 32, height: 32 };

  for (const match of pathMatches) {
    const attrs = match[1];
    const dMatch = attrs.match(/\bd="([^"]+)"/);
    const fillMatch = attrs.match(/\bfill="([^"]+)"/i);
    const fill = (fillMatch?.[1] || "#000").toLowerCase();
    const d = dMatch?.[1] || "";

    if (fill === "#fff" && /M0 0h32v32H0z/i.test(d)) {
      background = { fill, width: 32, height: 32 };
      continue;
    }

    const pixelRegex = /([Mm])\s*(-?\d+)\s+(-?\d+)\s*h1v1(?:h-1|H-?\d+)z/gi;
    let prevStart = null;
    let pixelMatch;
    while ((pixelMatch = pixelRegex.exec(d)) !== null) {
      const [, mode, xRaw, yRaw] = pixelMatch;
      let x = Number(xRaw);
      let y = Number(yRaw);
      if (mode === "m" && prevStart) {
        x += prevStart.x;
        y += prevStart.y;
      }
      prevStart = { x, y };
      points.set(`${x},${y}`, { x, y });
    }
  }

  const values = [...points.values()].sort((a, b) => a.y - b.y || a.x - b.x);
  const xs = values.map((p) => p.x);
  const ys = values.map((p) => p.y);
  const bounds = {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys)
  };
  const axisX = (bounds.minX + bounds.maxX) / 2;
  const axisY = (bounds.minY + bounds.maxY) / 2;

  return {
    svg,
    background,
    width: background.width,
    height: background.height,
    points: values,
    bounds,
    axisX,
    axisY
  };
}

function nearestPoint(points, targetX, targetY, used) {
  let best = null;
  let bestDist = Infinity;
  for (const point of points) {
    const key = `${point.x},${point.y}`;
    if (used.has(key)) continue;
    const dist = ((point.x - targetX) ** 2) + ((point.y - targetY) ** 2);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}

export function getAnchorKeys(seed) {
  const { bounds, axisX, axisY, points } = seed;
  const targets = [
    [axisX, bounds.minY],
    [bounds.minX + 4, bounds.minY + 3],
    [bounds.maxX - 4, bounds.minY + 3],
    [bounds.minX + 1, axisY - 1],
    [bounds.maxX - 1, axisY - 1],
    [axisX - 1, axisY],
    [axisX + 1, axisY],
    [bounds.minX + 4, bounds.maxY - 3],
    [bounds.maxX - 4, bounds.maxY - 3],
    [axisX, bounds.maxY]
  ];
  const used = new Set();
  const anchors = [];
  for (const [tx, ty] of targets) {
    const point = nearestPoint(points, tx, ty, used);
    if (point) {
      const key = `${point.x},${point.y}`;
      used.add(key);
      anchors.push(key);
    }
  }
  return [...new Set(anchors)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function chooseRange([min, max], rng) {
  return min + (max - min) * rng();
}

function angleVector(index) {
  const vectors = [
    [1, 0],
    [1, 1],
    [0, 1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
    [0, -1],
    [1, -1]
  ];
  const [dx, dy] = vectors[index % vectors.length];
  const mag = Math.hypot(dx, dy) || 1;
  return { dx: dx / mag, dy: dy / mag };
}

function pointMetrics(point, seed, drift) {
  const dx = point.x - seed.axisX;
  const dy = point.y - seed.axisY;
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.hypot(seed.bounds.maxX - seed.axisX, seed.bounds.maxY - seed.axisY) || 1;
  const edge = dist / maxDist;
  const center = 1 - edge;
  const align = ((dx * drift.dx) + (dy * drift.dy)) / (dist || 1);
  return { edge, center, align };
}

function getMirrorKey(key, seed) {
  const [xRaw, yRaw] = key.split(",").map(Number);
  const mirroredX = Math.round((seed.axisX * 2) - xRaw);
  const mirrorKey = `${mirroredX},${yRaw}`;
  const exists = seed.points.some((p) => p.x === mirroredX && p.y === yRaw);
  return exists ? mirrorKey : null;
}

function actualSymmetryRatio(keys, seed) {
  let mirrored = 0;
  for (const key of keys) {
    const mirrorKey = getMirrorKey(key, seed);
    if (mirrorKey && keys.has(mirrorKey)) mirrored += 1;
  }
  return keys.size ? mirrored / keys.size : 0;
}

function chooseRetained(seed, stateName, rng, drift, tokenId) {
  const def = STATE_DEFS[stateName];
  const anchors = new Set(getAnchorKeys(seed));
  const targetRetention = chooseRange(def.retention, rng);
  const targetCount = clamp(Math.round(seed.points.length * targetRetention), anchors.size, seed.points.length);
  const retained = new Set(anchors);
  const candidates = seed.points
    .map((point) => {
      const key = `${point.x},${point.y}`;
      if (anchors.has(key)) return null;
      const metrics = pointMetrics(point, seed, drift);
      const jitter = rng() * 0.18;
      const score = (metrics.edge * def.weights.edge) + (metrics.center * def.weights.center) + (metrics.align * def.weights.align) + jitter;
      return { key, point, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  const symmetryTarget = chooseRange(def.symmetry, rng);
  for (const candidate of candidates) {
    if (retained.size >= targetCount) break;
    if (retained.has(candidate.key)) continue;
    retained.add(candidate.key);
    const mirrorKey = getMirrorKey(candidate.key, seed);
    const addMirror = mirrorKey && !retained.has(mirrorKey) && retained.size < targetCount && (
      (symmetryTarget > 0.72) ||
      (symmetryTarget > 0.45 && rng() > 0.5)
    );
    if (addMirror) retained.add(mirrorKey);
  }

  const symmetryRatio = actualSymmetryRatio(retained, seed);
  return { retained, anchors, symmetryRatio };
}

function findOpenSpot(targetX, targetY, occupied, width, height, rng) {
  const clampX = clamp(Math.round(targetX), 0, width - 1);
  const clampY = clamp(Math.round(targetY), 0, height - 1);
  const direct = `${clampX},${clampY}`;
  if (!occupied.has(direct)) return direct;
  const offsets = [];
  for (let r = 1; r <= 10; r += 1) {
    for (let ox = -r; ox <= r; ox += 1) {
      for (let oy = -r; oy <= r; oy += 1) {
        if (Math.abs(ox) !== r && Math.abs(oy) !== r) continue;
        offsets.push([ox, oy]);
      }
    }
  }
  offsets.sort(() => rng() - 0.5);
  for (const [ox, oy] of offsets) {
    const x = clamp(clampX + ox, 0, width - 1);
    const y = clamp(clampY + oy, 0, height - 1);
    const key = `${x},${y}`;
    if (!occupied.has(key)) return key;
  }
  return direct;
}

function chooseField(seed, stateName, retained, rng, drift) {
  const def = STATE_DEFS[stateName];
  const removed = seed.points.filter((point) => !retained.has(`${point.x},${point.y}`));
  const fieldFraction = chooseRange(def.fieldFraction, rng);
  const targetFieldCount = Math.max(0, Math.min(removed.length, Math.round(removed.length * fieldFraction)));
  const scored = removed
    .map((point) => {
      const key = `${point.x},${point.y}`;
      const metrics = pointMetrics(point, seed, drift);
      const stateBias = stateName === "Dense Market"
        ? metrics.center
        : stateName === "Collapse Signal"
          ? metrics.edge
          : stateName === "Echo Return"
            ? (metrics.align + 1) / 2
            : stateName === "Fracture After Sale"
              ? 1 - ((metrics.align + 1) / 2)
              : 0.5 + (Math.abs(metrics.align) * 0.5);
      return { key, point, score: stateBias + rng() * 0.25 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, targetFieldCount);

  const occupied = new Set([...retained]);
  const field = new Set();
  const rMin = def.dispersionRadius[0];
  const rMax = def.dispersionRadius[1];
  const perpendicular = { dx: -drift.dy, dy: drift.dx };

  for (const item of scored) {
    const radius = chooseRange([rMin, rMax], rng);
    const spread = (rng() * 2) - 1;
    let tx = item.point.x + (drift.dx * radius) + (perpendicular.dx * spread * radius * 0.75);
    let ty = item.point.y + (drift.dy * radius) + (perpendicular.dy * spread * radius * 0.75);

    if (stateName === "Dense Market") {
      tx = seed.axisX + ((item.point.x - seed.axisX) * 1.05);
      ty = seed.axisY + ((item.point.y - seed.axisY) * 1.05);
    }

    const key = findOpenSpot(tx, ty, occupied, seed.width, seed.height, rng);
    occupied.add(key);
    field.add(key);
  }

  return { field, removedCount: removed.length };
}

function pointKeyToPath(key) {
  const [x, y] = key.split(",").map(Number);
  return `M${x} ${y}h1v1H${x}z`;
}

function mapDispersionLabel(def, fieldCount, removedCount) {
  const ratio = removedCount ? fieldCount / removedCount : 0;
  if (ratio < 0.12) return "Low";
  if (ratio < 0.28) return "Moderate";
  if (ratio < 0.45) return "High";
  return "Extreme";
}

function mapSymmetryLabel(ratio) {
  if (ratio > 0.75) return "High";
  if (ratio > 0.45) return "Medium";
  return "Low";
}

function choosePolarity(def, rng) {
  return rng() < 0.12 ? (def.polarity === "Positive" ? "Inverted" : "Positive") : def.polarity;
}

function titleFor(index, stateName) {
  return `${CONFIG.tokenPrefix} ${zeroPad(index)} - ${stateName}`;
}

function descriptionFor({ index, stateName, triggerName, retentionRatio }) {
  const base = `${CONFIG.collectionName} is a ${CONFIG.maxSupply}-piece fully onchain collection of deterministic state instances of the same living symbol, each uniquely shaped by token index, chain context, event trigger, and prior memory.`;
  if (index === 1 && triggerName === "Genesis") {
    return `${base}\n\nThis genesis work is the founding, human-agent-selected invocation of the ${CONFIG.collectionName} system. It enters the ${stateName} state with a ${retentionRatio}% retained body, dispersing the rest of the symbol into the field as the collection's first rupture.`;
  }
  return `${base}\n\nThis work entered the ${stateName} state through the ${triggerName} trigger, preserving a ${retentionRatio}% body while dispersing lost structure into the surrounding field.`;
}

function phaseFor(index) {
  if (index <= 20) return "Emergence";
  if (index <= 50) return "Pressure";
  if (index <= 80) return "Rupture";
  return "Renewal";
}

function triggerLabel(trigger) {
  return TRIGGERS.includes(trigger) ? trigger : "Cycle";
}

export function resolveState({ index, trigger = "Cycle", previousState = "None", blockNumber = 0, previousHash = "genesis" }) {
  const normalizedTrigger = triggerLabel(trigger);
  const weights = { ...(TRIGGER_STATE_WEIGHTS[normalizedTrigger] || TRIGGER_STATE_WEIGHTS.Cycle) };
  const phaseBoost = PHASE_BIASES.find((entry) => index <= entry.maxIndex)?.boosts || {};
  for (const [state, boost] of Object.entries(phaseBoost)) {
    weights[state] = (weights[state] || 0) + boost;
  }
  if (previousState && weights[previousState]) {
    weights[previousState] = Math.max(0.5, weights[previousState] * 0.45);
  }
  const rng = makeRng(`${index}:${normalizedTrigger}:${previousState}:${blockNumber}:${previousHash}`);
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  let roll = rng() * total;
  let chosen = STATE_ORDER[0];
  for (const [state, weight] of Object.entries(weights)) {
    roll -= weight;
    if (roll <= 0) {
      chosen = state;
      break;
    }
  }
  return {
    state: chosen,
    trigger: normalizedTrigger,
    phase: phaseFor(index),
    posture: STATE_DEFS[chosen].posture,
    defaultPolarity: STATE_DEFS[chosen].polarity
  };
}

export function buildToken({ index, state, trigger = "Cycle", blockNumber = 0, previousState = "None", previousHash = "genesis", seedKey = null, ledger = { used: [] } }) {
  const seed = readSeedSvg();
  const existing = new Set(ledger.used || []);
  const resolved = state ? {
    state,
    trigger: triggerLabel(trigger),
    phase: phaseFor(index),
    posture: STATE_DEFS[state].posture,
    defaultPolarity: STATE_DEFS[state].polarity
  } : resolveState({ index, trigger, previousState, blockNumber, previousHash });
  const generationBasis = seedKey || (
    index === 1 && resolved.state === "Fracture After Sale" && resolved.trigger === "Genesis"
      ? GENESIS_COMPOSITION_SEED
      : `${index}:${resolved.state}:${resolved.trigger}:${blockNumber}:${previousHash}`
  );

  let nonce = 0;
  while (nonce < 64) {
    const rng = makeRng(`${generationBasis}:${nonce}`);
    const drift = angleVector(Math.floor(rng() * 8));
    const { retained, anchors, symmetryRatio } = chooseRetained(seed, resolved.state, rng, drift, index);
    const { field, removedCount } = chooseField(seed, resolved.state, retained, rng, drift);
    const polarity = choosePolarity(STATE_DEFS[resolved.state], rng);
    const compositionFingerprint = hashText(JSON.stringify({
      state: resolved.state,
      polarity,
      retained: [...retained].sort(),
      field: [...field].sort()
    }));
    if (existing.has(compositionFingerprint)) {
      nonce += 1;
      continue;
    }

    const background = polarity === "Positive" ? "#fff" : "#000";
    const foreground = polarity === "Positive" ? "#000" : "#fff";
    const bodyPath = [...retained].sort().map(pointKeyToPath).join("");
    const fieldPath = [...field].sort().map(pointKeyToPath).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges"><path d="M0 0h32v32H0z" fill="${background}"/><path d="${bodyPath}${fieldPath}" fill="${foreground}"/></svg>`;
    const retentionRatio = Math.round((retained.size / seed.points.length) * 100);
    const symmetry = mapSymmetryLabel(symmetryRatio);
    const dispersion = mapDispersionLabel(STATE_DEFS[resolved.state], field.size, removedCount);
    const triggerName = resolved.trigger;
    const title = titleFor(index, resolved.state);
    const description = descriptionFor({ index, stateName: resolved.state, triggerName, retentionRatio });

    const metadata = {
      name: title,
      description,
      image: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
      attributes: [
        { trait_type: "State", value: resolved.state },
        { trait_type: "Trigger", value: triggerName },
        { trait_type: "Polarity", value: polarity },
        { trait_type: "Retention", value: `${retentionRatio}%` },
        { trait_type: "Dispersion", value: dispersion },
        { trait_type: "Symmetry", value: symmetry },
        { trait_type: "Auction Posture", value: resolved.posture },
        { trait_type: "Previous State", value: previousState },
        { trait_type: "Cycle Phase", value: resolved.phase },
        { trait_type: "Collection Index", value: `${index} / ${CONFIG.maxSupply}` },
        { trait_type: "Artist", value: CONFIG.artist },
        { display_type: "number", trait_type: "Block Context", value: Number(blockNumber) }
      ],
      aai: {
        seed: hashText(`${generationBasis}:${nonce}`),
        seedBasis: generationBasis,
        nonce,
        compositionHash: compositionFingerprint,
        anchors: anchors.size,
        retainedPixels: retained.size,
        dispersedPixels: field.size,
        previousHash,
        trigger: triggerName,
        state: resolved.state
      }
    };

    return {
      resolved,
      svg,
      metadata,
      tokenUri: `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString("base64")}`,
      compositionHash: compositionFingerprint,
      retentionRatio,
      dispersion,
      symmetry,
      polarity,
      retainedCount: retained.size,
      fieldCount: field.size,
      nonce
    };
  }
  throw new Error(`Unable to generate unique composition for token ${index}`);
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

export function loadLedger(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { used: [] };
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function saveLedger(filePath, ledger) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(ledger, null, 2));
}

export function writeTokenFiles({ outDir, token }) {
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "art.svg"), token.svg);
  fs.writeFileSync(path.join(outDir, "metadata.json"), JSON.stringify(token.metadata, null, 2));
  fs.writeFileSync(path.join(outDir, "token-uri.txt"), token.tokenUri);
  fs.writeFileSync(path.join(outDir, "summary.json"), JSON.stringify({
    state: token.resolved.state,
    trigger: token.resolved.trigger,
    posture: token.resolved.posture,
    polarity: token.polarity,
    retentionRatio: token.retentionRatio,
    dispersion: token.dispersion,
    symmetry: token.symmetry,
    retainedCount: token.retainedCount,
    fieldCount: token.fieldCount,
    compositionHash: token.compositionHash,
    title: token.metadata.name
  }, null, 2));
}
