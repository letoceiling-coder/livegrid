#!/usr/bin/env node
/**
 * Symbol drift detector — finds React hook usage without matching imports (Iter 62).
 * Usage: node scripts/reliability/symbol-drift.mjs
 */
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = join(ROOT, 'apps/web/src');

const HOOK_RE = /\b(use[A-Z][a-zA-Z0-9]*)\s*\(/g;
const IMPORT_RE = /import\s+(?:type\s+)?(?:\{([^}]+)\}|(\w+))\s+from\s+['"][^'"]+['"]/g;

function walk(dir, out = []) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, out);
    else if (ent.isFile() && /\.(tsx?)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function importedNames(src) {
  const names = new Set();
  for (const m of src.matchAll(IMPORT_RE)) {
    if (m[1]) {
      for (const part of m[1].split(',')) {
        const chunk = part.trim();
        const asIdx = chunk.indexOf(' as ');
        names.add(asIdx >= 0 ? chunk.slice(asIdx + 4).trim() : chunk);
      }
    }
    if (m[2]) names.add(m[2].trim());
  }
  return names;
}

function usedHooks(src) {
  const used = new Set();
  for (const m of src.matchAll(HOOK_RE)) used.add(m[1]);
  return used;
}

const BUILTIN = new Set([
  'useState', 'useEffect', 'useCallback', 'useMemo', 'useRef', 'useContext',
  'useReducer', 'useLayoutEffect', 'useId', 'useTransition', 'useDeferredValue',
  'useImperativeHandle', 'useDebugValue', 'useSyncExternalStore', 'useInsertionEffect',
]);

/** Hooks from third-party libs (default or re-exported). */
const EXTERNAL = new Set(['useEmblaCarousel', 'useForm', 'useFieldArray', 'useWatch']);

function definedLocally(src, name) {
  return (
    new RegExp(`function\\s+${name}\\s*\\(`).test(src) ||
    new RegExp(`const\\s+${name}\\s*=`).test(src) ||
    new RegExp(`export\\s+function\\s+${name}\\s*\\(`).test(src)
  );
}

/** Card-visual helpers from @/redesign/lib/card-visual — must be imported, not global. */
const CARD_VISUAL_SYMBOLS = ['cardVisual', 'cardBadgeClass', 'metaDotLine'];
const CARD_VISUAL_SOURCE = 'redesign/lib/card-visual';

function usesCardVisualSymbol(src, name) {
  if (name === 'cardVisual') return /\bcardVisual\b/.test(src);
  if (name === 'cardBadgeClass') return /\bcardBadgeClass\s*\(/.test(src);
  if (name === 'metaDotLine') return /\bmetaDotLine\s*\(/.test(src);
  return false;
}

function importsCardVisual(src) {
  return new RegExp(`from\\s+['"]@/${CARD_VISUAL_SOURCE}['"]`).test(src);
}

let failed = 0;
for (const file of walk(SRC)) {
  const src = readFileSync(file, 'utf8');
  const rel = file.replace(SRC + '/', '');
  if (rel === CARD_VISUAL_SOURCE + '.ts') continue;
  if (/\.test\.(tsx?)$/.test(rel)) continue;

  const imports = importedNames(src);
  const hooks = usedHooks(src);
  for (const h of hooks) {
    if (BUILTIN.has(h)) continue;
    if (EXTERNAL.has(h)) continue;
    if (definedLocally(src, h)) continue;
    if (!imports.has(h)) {
      console.log(`FAIL: ${rel} uses ${h}() without import`);
      failed += 1;
    }
  }

  for (const sym of CARD_VISUAL_SYMBOLS) {
    if (!usesCardVisualSymbol(src, sym)) continue;
    if (definedLocally(src, sym)) continue;
    if (!imports.has(sym) && !importsCardVisual(src)) {
      console.log(`FAIL: ${rel} uses ${sym} without import from @/${CARD_VISUAL_SOURCE}`);
      failed += 1;
    }
  }
}

if (failed === 0) console.log('OK: no hook or card-visual symbol drift detected');
process.exit(failed ? 1 : 0);
