#!/usr/bin/env node
import madge from "madge";
import { writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "frontend/src");
const TSCONFIG = resolve(ROOT, "frontend/tsconfig.json");
const OUTPUT = resolve(ROOT, "docs/diagrams/actual-dependency-map.mmd");

const LAYER_RULES = [
  { test: /^App\.tsx$/,          id: "UI",   label: "components" },
  { test: /^main\.tsx$/,         id: "UI",   label: "components" },
  { test: /^components\//,       id: "UI",   label: "components" },
  { test: /^hooks\//,            id: "H",    label: "hooks" },
  { test: /^application\/usecases\//, id: "A", label: "application/usecases" },
  { test: /^application\/auth\//,     id: "AA", label: "application/auth" },
  { test: /^application\/account\//,  id: "AACC", label: "application/account" },
  { test: /^application\/locale\//,   id: "ALOC", label: "application/locale" },
  { test: /^application\//,           id: "A",    label: "application" },
  { test: /^ports\//,                  id: "P", label: "ports" },
  { test: /^domain\//,                 id: "D", label: "domain" },
  { test: /^adapters\/nostr\//,        id: "AD", label: "adapters/nostr" },
  { test: /^adapters\/auth\//,         id: "AAUTH", label: "adapters/auth" },
  { test: /^nostr\/client/,            id: "N",  label: "nostr/client" },
  { test: /^nostr\/kinds/,             id: "NK", label: "nostr/kinds" },
  { test: /^nostr\//,                  id: "N",  label: "nostr" },
  { test: /^types\//,                  id: "T",  label: "types/nostr" },
  { test: /^utils\//,                 id: "U",  label: "utils" },
  { test: /^i18n\//,                  id: "I",  label: "i18n" },
  { test: /^locales\//,               id: "L",  label: "locales" },
];

function detectLayer(file) {
  for (const r of LAYER_RULES) {
    if (r.test.test(file)) return r;
  }
  return null;
}

const ALLOWED = new Set([
  "UI→H", "UI→I", "UI→U",
  "H→A", "H→AA", "H→AACC", "H→P", "H→D", "H→U", "H→I",
  "A→P", "A→D", "A→U",
  "A→AACC",
  "AA→P", "AA→D", "AA→U",
  "AACC→P", "AACC→D", "AACC→U",
  "AACC→A",
  "ALOC→D",
  "ALOC→P",
  "I→ALOC",
  "AD→P", "AD→D", "AD→T", "AD→N", "AD→NK", "AD→U",
  "AAUTH→P", "AAUTH→D", "AAUTH→U", "AAUTH→N",
  "T→D", "T→U",
  "I→U", "I→A", "I→D",
  "U→D", "U→T",
  "P→D",
]);

function isIgnored(file) {
  return (
    file.endsWith(".css") ||
    file.includes(".test.") ||
    file.includes("node_modules") ||
    file.includes(".d.ts") ||
    file.endsWith(".json")
  );
}

async function main() {
  const graph = await madge(resolve(SRC, "main.tsx"), {
    tsconfig: TSCONFIG,
    baseDir: SRC,
    includeNpm: false,
  });

  const raw = graph.obj();
  const layerEdges = new Set();
  const allLayers = new Map();

  for (const [src, deps] of Object.entries(raw)) {
    if (isIgnored(src)) continue;
    const srcLayer = detectLayer(src);
    if (!srcLayer) continue;
    allLayers.set(srcLayer.id, srcLayer.label);

    for (const dep of deps) {
      if (isIgnored(dep)) continue;
      const dstLayer = detectLayer(dep);
      if (!dstLayer) continue;
      allLayers.set(dstLayer.id, dstLayer.label);
      if (srcLayer.id !== dstLayer.id) {
        layerEdges.add(`${srcLayer.id}→${dstLayer.id}`);
      }
    }
  }

  const nodeOrder = ["UI","H","A","AA","AACC","ALOC","P","D","AD","AAUTH","N","NK","T","U","I","L"];
  const sortedLayers = nodeOrder.filter(id => allLayers.has(id));

  const leakNodes = new Set();

  let mermaid = "flowchart LR\n";

  for (const id of sortedLayers) {
    const label = allLayers.get(id);
    mermaid += `  ${id}[${label}]\n`;
  }

  mermaid += "\n";

  for (const edge of [...layerEdges].sort()) {
    const arrow = ALLOWED.has(edge) ? "-->" : "-.->";
    if (!ALLOWED.has(edge)) {
      const [, target] = edge.split("→");
      leakNodes.add(target);
    }
    mermaid += `  ${edge.replace("→", ` ${arrow} `)}\n`;
  }

  if (leakNodes.size > 0) {
    mermaid +=
      '\n  classDef leak stroke:#c2410c,stroke-width:2px,color:#7c2d12;\n';
    mermaid += `  class ${[...leakNodes].sort().join(",")} leak;\n`;
  }

  writeFileSync(OUTPUT, mermaid, "utf-8");
  console.log(`Wrote ${OUTPUT}`);
  console.log(`  Layers: ${sortedLayers.join(", ")}`);
  console.log(`  Edges: ${layerEdges.size}`);
  console.log(`  Violations (leaked nodes): ${[...leakNodes].sort().join(", ") || "none"}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
