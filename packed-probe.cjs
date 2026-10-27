const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { Writable } = require('node:stream')
const { once } = require('node:events')
const { spawnSync } = require('node:child_process')
const [consumer, prefix] = process.argv.slice(2)
const pkg = path.join(consumer, 'node_modules/pino-pretty')
const pino = require(path.join(consumer, 'node_modules/pino'))
const { prettyFactory } = require(pkg)
const sha = data => crypto.createHash('sha256').update(data).digest('hex')
async function main () {
  let raw = ''
  const error = Error('VISIBLE_PACKED_ERROR')
  const log = pino({ base: null, timestamp: false }, new Writable({ write (chunk, enc, cb) { raw += chunk; cb() } }))
  log.error({ err: error, extra: { marker: 'HIDDEN_PACKED_OBJECT' } }, 'packed request failed')
  fs.writeFileSync(prefix + '-input.ndjson', raw)
  const cases = []
  const factory = prettyFactory({ hideObject: true, colorize: false })(raw)
  fs.writeFileSync(prefix + '-factory.log', factory)
  cases.push({ name: 'installed-factory', pass: factory.includes('VISIBLE_PACKED_ERROR') && factory.includes('at main') && !factory.includes('HIDDEN_PACKED_OBJECT') })
  const cli = spawnSync(process.execPath, [path.join(pkg, 'bin.js'), '--hideObject', '--colorize=false'], { input: raw, encoding: 'utf8', timeout: 15000 })
  fs.writeFileSync(prefix + '-cli.log', cli.stdout)
  cases.push({ name: 'installed-cli', code: cli.status, stderr: cli.stderr, pass: cli.status === 0 && cli.stdout.includes('VISIBLE_PACKED_ERROR') && cli.stdout.includes('at main') && !cli.stdout.includes('HIDDEN_PACKED_OBJECT') })
  const destination = prefix + '-transport.log'
  const transport = pino.transport({ target: require.resolve(pkg), options: { destination, hideObject: true, colorize: false, errorLikeObjectKeys: ['fault'] } })
  await once(transport, 'ready')
  const workerLog = pino({ base: null, timestamp: false, errorKey: 'fault' }, transport)
  workerLog.error({ fault: error, extra: { marker: 'HIDDEN_PACKED_OBJECT' } }, 'packed request failed')
  transport.flushSync()
  const deadline = Date.now() + 5000
  while ((!fs.existsSync(destination) || !fs.readFileSync(destination, 'utf8').includes('VISIBLE_PACKED_ERROR')) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 20))
  }
  const formatted = fs.readFileSync(destination, 'utf8')
  transport.end()
  cases.push({ name: 'installed-worker-transport-configured-custom-error-key', pass: formatted.includes('fault: {') && formatted.includes('VISIBLE_PACKED_ERROR') && formatted.includes('at main') && !formatted.includes('HIDDEN_PACKED_OBJECT') })
  const artifacts = ['input.ndjson', 'factory.log', 'cli.log', 'transport.log'].map(suffix => {
    const file = prefix + '-' + suffix
    const data = fs.readFileSync(file)
    return { file: path.basename(file), bytes: data.length, sha256: sha(data) }
  })
  const report = { node: process.version, pino: pino.version, sourceSha256: sha(fs.readFileSync(path.join(pkg, 'lib/pretty.js'))), cases, artifacts, passed: cases.filter(c => c.pass).length }
  fs.writeFileSync(prefix + '.json', JSON.stringify(report, null, 2))
  assert.equal(report.passed, 3)
}
main().catch(e => { console.error(e); process.exitCode = 1 })
