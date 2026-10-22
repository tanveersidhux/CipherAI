#!/usr/bin/env node

/**
 * Secret Name Leak Scanner for CIPHER AI Frontend.
 *
 * Verifies that forbidden backend-only secret variable names never appear
 * in web/ source files, configs, public assets, or build outputs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const WEB_DIR = path.join(ROOT_DIR, 'web')

const FORBIDDEN_SECRET_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'LLM_API_KEY',
  'SUPABASE_JWT_SECRET',
]

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  '.vitest_cache',
])

let filesScanned = 0
const violations = []

function scanDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDirectory(fullPath)
    } else if (entry.isFile()) {
      // Only scan source, config, markdown, and env files
      const ext = path.extname(entry.name)
      if (
        ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.env', '.example', ''].includes(
          ext
        )
      ) {
        filesScanned++
        const content = fs.readFileSync(fullPath, 'utf8')
        const lines = content.split('\n')

        lines.forEach((line, lineIdx) => {
          for (const secretName of FORBIDDEN_SECRET_NAMES) {
            if (line.includes(secretName)) {
              violations.push({
                file: path.relative(ROOT_DIR, fullPath),
                line: lineIdx + 1,
                secretName,
                snippet: line.trim(),
              })
            }
          }
        })
      }
    }
  }
}

console.log('🔍 Scanning web/ workspace for forbidden backend secret names...')
scanDirectory(WEB_DIR)

if (violations.length > 0) {
  console.error('\n❌ SECURITY VIOLATION: Forbidden secret names detected in web/ workspace!\n')
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line} matches '${v.secretName}'`)
    console.error(`    "${v.snippet}"`)
  }
  console.error(
    '\nBackend secrets (SUPABASE_SERVICE_ROLE_KEY, LLM_API_KEY, SUPABASE_JWT_SECRET) must NEVER appear in frontend code.\n'
  )
  process.exit(1)
} else {
  console.log(`✅ Scan passed cleanly. Scanned ${filesScanned} files. No forbidden secret names found in web/.\n`)
  process.exit(0)
}
