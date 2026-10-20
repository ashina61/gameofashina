import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'

function readExportConfig(vars: Record<string, string>) {
  const env = { ...process.env, STATIC_EXPORT: '1', NEXT_PUBLIC_NATIVE: '1' }
  delete env.NEXT_BASE_PATH
  delete env.NEXT_ASSET_PREFIX
  Object.assign(env, vars)
  return JSON.parse(execFileSync(process.execPath, [
    '--input-type=module',
    '-e',
    "import cfg from './next.config.mjs'; console.log(JSON.stringify({output:cfg.output,basePath:cfg.basePath??null,assetPrefix:cfg.assetPrefix??null}))",
  ], { encoding: 'utf8', env }))
}

test('Android native export relies on local WebView origin, never unsupported relative assetPrefix', () => {
  const config = readExportConfig({})
  assert.equal(config.output, 'export')
  assert.equal(config.assetPrefix, null)
  assert.equal(config.basePath, null)
})

test('Pages subpath is compiled with Next basePath rather than a relative CDN URL', () => {
  const config = readExportConfig({ NEXT_BASE_PATH: '/gameofashina' })
  assert.equal(config.basePath, '/gameofashina')
  assert.equal(config.assetPrefix, null)
})
