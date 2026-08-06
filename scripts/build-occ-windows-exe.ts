/**
 * Cross-compile open-claude-code to a single Windows x64 .exe via Bun.
 *
 * Pattern adapted from ~/work/myproject/tools/claude-code-src/scripts/build-myai-windows.ts
 * (Bun.build + compile.target = bun-windows-x64 + optional-package stubs).
 *
 * Usage:
 *   bun run scripts/build-occ-windows-exe.ts
 *   OCC_BUILD_OUTFILE=release/occ.exe bun run scripts/build-occ-windows-exe.ts
 *
 * Output default: dist/windows/occ.exe
 */
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path'
import { DEFAULT_BUILD_FEATURES, getMacroDefines } from './defines.ts'

const root = process.cwd()
const sourceRoot = resolve(root, 'src')
const target = process.env.OCC_BUILD_TARGET ?? 'bun-windows-x64'
const outfile = resolve(
  root,
  process.env.OCC_BUILD_OUTFILE ?? 'dist/windows/occ.exe',
)
const stubNamespace = 'occ-optional-stub'

/** Packages that break cross-compile or are optional on Windows portable builds. */
const optionalPackages = new Set([
  // Cloud provider SDKs (not needed for OpenAI-compat / China LLM portable)
  '@anthropic-ai/bedrock-sdk',
  '@anthropic-ai/vertex-sdk',
  '@anthropic-ai/foundry-sdk',
  '@aws-sdk/client-bedrock',
  '@aws-sdk/client-bedrock-runtime',
  '@aws-sdk/client-sts',
  '@aws-sdk/credential-provider-node',
  '@aws-sdk/credential-providers',
  '@azure/identity',
  'google-auth-library',
  // OTel exporters
  '@opentelemetry/exporter-logs-otlp-grpc',
  '@opentelemetry/exporter-logs-otlp-http',
  '@opentelemetry/exporter-logs-otlp-proto',
  '@opentelemetry/exporter-metrics-otlp-grpc',
  '@opentelemetry/exporter-metrics-otlp-http',
  '@opentelemetry/exporter-metrics-otlp-proto',
  '@opentelemetry/exporter-prometheus',
  '@opentelemetry/exporter-trace-otlp-grpc',
  '@opentelemetry/exporter-trace-otlp-http',
  '@opentelemetry/exporter-trace-otlp-proto',
  // Native / optional
  '@ant/computer-use-input',
  '@ant/computer-use-swift',
  '@ant/computer-use-mcp',
  'audio-capture-napi',
  'modifiers-napi',
  'sharp',
  'turndown',
  'chrome-devtools-mcp',
  'doubaoime-asr',
])

const extensionCandidates = [
  '',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.txt',
]

const indexCandidates = [
  'index.ts',
  'index.tsx',
  'index.js',
  'index.jsx',
  'index.mjs',
  'index.cjs',
]

function pathExists(path: string): boolean {
  try {
    return existsSync(path)
  } catch {
    return false
  }
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

function getCandidatePaths(basePath: string): string[] {
  const extension = extname(basePath)
  const candidates = [
    basePath,
    ...extensionCandidates.filter(Boolean).map(ext => `${basePath}${ext}`),
  ]

  if (['.cjs', '.js', '.jsx', '.mjs'].includes(extension)) {
    const baseWithoutExtension = basePath.slice(0, -extension.length)
    candidates.push(
      `${baseWithoutExtension}.ts`,
      `${baseWithoutExtension}.tsx`,
      `${baseWithoutExtension}.cts`,
      `${baseWithoutExtension}.mts`,
    )
  }

  if (isDirectory(basePath)) {
    candidates.push(
      ...indexCandidates.map(indexFile => resolve(basePath, indexFile)),
    )
  } else {
    candidates.push(
      ...indexCandidates.map(indexFile => resolve(`${basePath}`, indexFile)),
    )
  }

  return candidates
}

function resolvesToExistingLocalFile(
  specifier: string,
  importer: string,
): boolean {
  if (!specifier.startsWith('.') && !specifier.startsWith('src/')) {
    return false
  }

  const basePath = specifier.startsWith('src/')
    ? resolve(root, specifier)
    : resolve(dirname(importer), specifier)

  return getCandidatePaths(basePath).some(pathExists)
}

function isProjectSourceImporter(importer: string): boolean {
  const relativeImporter = relative(sourceRoot, resolve(importer))
  return (
    relativeImporter.length > 0 &&
    !relativeImporter.startsWith('..') &&
    !isAbsolute(relativeImporter)
  )
}

function shouldStub(specifier: string, importer: string): boolean {
  if (optionalPackages.has(specifier)) {
    return true
  }

  // Bare package subpaths
  for (const pkg of optionalPackages) {
    if (specifier === pkg || specifier.startsWith(`${pkg}/`)) {
      return true
    }
  }

  if (!importer) {
    return false
  }

  if (!specifier.startsWith('.') && !specifier.startsWith('src/')) {
    return false
  }

  if (!isProjectSourceImporter(importer)) {
    return false
  }

  return !resolvesToExistingLocalFile(specifier, importer)
}

// CJS Proxy export: works with Bun's CJS interop for `import { X } from 'pkg'`.
// Listing every named export statically does not scale for AWS/Anthropic SDKs.
const stubContents = `
const stub = new Proxy(function optionalFeatureStub() {}, {
  get(_target, prop) {
    if (prop === '__esModule') return true;
    if (prop === 'default') return stub;
    if (prop === 'then') return undefined;
    if (prop === Symbol.toStringTag) return 'Module';
    if (prop === 'prototype') return Function.prototype;
    // Classes used as \`new X()\` or \`extends X\`
    if (typeof prop === 'string' && /^[A-Z]/.test(prop)) {
      return class OptionalStub extends Error {
        constructor(...args) {
          super(String(args[0] ?? prop));
          this.name = prop;
        }
      };
    }
    return stub;
  },
  apply() { return undefined; },
  construct() { return stub; },
});
module.exports = stub;
module.exports.default = stub;
module.exports.__esModule = true;
`

// Features that break or bloat Bun --compile for Windows (circular init / native).
// Portable coding + multi-model API remains enabled.
const WINDOWS_COMPILE_EXCLUDE = new Set([
  'WORKFLOW_SCRIPTS', // schema TDZ under compile (workflowInputSchema)
  'VOICE_MODE', // native audio
  'CHICAGO_MCP', // computer-use stack
  'DAEMON',
  'KAIROS',
  'KAIROS_BRIEF',
  'BG_SESSIONS',
  'TEMPLATES',
  'AGENT_TRIGGERS_REMOTE',
])

const envFeatures = Object.keys(process.env)
  .filter(k => k.startsWith('FEATURE_'))
  .map(k => k.replace('FEATURE_', ''))
const features = [
  ...new Set(
    [...DEFAULT_BUILD_FEATURES, ...envFeatures].filter(
      f => !WINDOWS_COMPILE_EXCLUDE.has(f),
    ),
  ),
]

mkdirSync(dirname(outfile), { recursive: true })

console.log(`Building occ Windows exe`)
console.log(`  entry:   src/entrypoints/cli.tsx`)
console.log(`  target:  ${target}`)
console.log(`  outfile: ${outfile}`)
console.log(`  features: ${features.length}`)

const result = await Bun.build({
  entrypoints: [resolve(root, 'src/entrypoints/cli.tsx')],
  compile: {
    outfile,
    target: target as 'bun-windows-x64',
  },
  define: {
    ...getMacroDefines(),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  features,
  plugins: [
    {
      name: 'occ-optional-feature-stubs',
      setup(build) {
        build.onResolve({ filter: /.*/ }, args => {
          if (args.path === 'zod/v4' || args.path === 'zod/v4-mini') {
            const cjs = resolve(root, `node_modules/${args.path}/index.cjs`)
            if (pathExists(cjs)) {
              return { path: cjs }
            }
          }

          // Prefer CJS entry for `diff` — ESM named imports break under compile.
          if (args.path === 'diff') {
            const cjs = resolve(root, 'node_modules/diff/libcjs/index.js')
            if (pathExists(cjs)) {
              return { path: cjs }
            }
          }

          if (!shouldStub(args.path, args.importer)) {
            return undefined
          }

          return {
            path: args.path,
            namespace: stubNamespace,
          }
        })

        build.onLoad({ filter: /.*/, namespace: stubNamespace }, () => ({
          contents: stubContents,
          loader: 'js', // CJS body via module.exports; Bun interops named imports
        }))
      },
    },
  ],
})

if (!result.success) {
  console.error('Build failed:')
  for (const log of result.logs) {
    console.error(log)
  }
  process.exit(1)
}

if (!pathExists(outfile)) {
  console.error(`Expected output missing: ${outfile}`)
  process.exit(1)
}

const size = statSync(outfile).size
console.log(`Wrote ${outfile}`)
console.log(`Size: ${(size / 1024 / 1024).toFixed(1)} MB (${size} bytes)`)
