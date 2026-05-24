#!/usr/bin/env node
/**
 * Workspace integrity audit — Iter 61.
 * Usage: node scripts/reliability/workspace-audit.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const APPS = ['web', 'api'];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function scanImports(appDir) {
  const pkgRe = /from ['"]@lg\/[^'"]+['"]|import ['"]@lg\/[^'"]+['"]/g;
  const found = new Set();
  function walk(dir) {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, name.name);
      if (name.isDirectory() && name.name !== 'node_modules' && name.name !== 'dist') walk(full);
      else if (name.isFile() && /\.(tsx?|jsx?)$/.test(name.name)) {
        const src = readFileSync(full, 'utf8');
        for (const m of src.matchAll(pkgRe)) {
          const pkg = m[0].match(/@lg\/[\w-]+/)?.[0];
          if (pkg) found.add(pkg);
        }
      }
    }
  }
  walk(join(ROOT, 'apps', appDir, 'src'));
  return [...found];
}

let failed = 0;
for (const app of APPS) {
  const pkgPath = join(ROOT, 'apps', app, 'package.json');
  const pkg = readJson(pkgPath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const imports = scanImports(app);
  console.log(`\n== @lg/${app} ==`);
  for (const imp of imports) {
    if (!deps[imp]) {
      console.log(`FAIL: imports ${imp} but missing from package.json`);
      failed += 1;
    } else if (!String(deps[imp]).includes('workspace:')) {
      console.log(`WARN: ${imp} should use workspace:* (got ${deps[imp]})`);
    } else {
      console.log(`OK: ${imp}`);
    }
  }
}

const sharedDist = join(ROOT, 'packages/shared/dist/index.js');
if (!existsSync(sharedDist)) {
  console.log('\nFAIL: packages/shared/dist missing — run pnpm --filter @lg/shared build');
  failed += 1;
} else {
  console.log('\nOK: @lg/shared dist present');
}

process.exit(failed ? 1 : 0);
