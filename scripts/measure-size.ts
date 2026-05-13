/**
 * Print the gzipped size of each built chunk so we can validate against the
 * spec's 4KB / 3KB budgets without depending on an external tool.
 *
 * Usage: `bun run scripts/measure-size.ts` (after `bun run build`).
 */
import { gzipSync } from 'bun'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '..', 'dist')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function fmt(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(2)} KB`
}

const files = walk(ROOT).filter((f) => /\.(js|cjs|mjs)$/.test(f))
let total = 0
let totalGz = 0

console.log(`\nBundle sizes (${files.length} files):\n`)
console.log(
  `${'file'.padEnd(60)}${'raw'.padStart(10)}${'gzip'.padStart(12)}`,
)
console.log('-'.repeat(82))

for (const f of files.sort()) {
  const buf = readFileSync(f)
  const gz = gzipSync(buf)
  total += buf.length
  totalGz += gz.length
  const rel = f.replace(`${ROOT}/`, '')
  console.log(
    `${rel.padEnd(60)}${fmt(buf.length).padStart(10)}${fmt(gz.length).padStart(12)}`,
  )
}

console.log('-'.repeat(82))
console.log(
  `${'TOTAL'.padEnd(60)}${fmt(total).padStart(10)}${fmt(totalGz).padStart(12)}\n`,
)
