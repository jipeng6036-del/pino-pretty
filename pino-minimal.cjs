const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { Writable } = require('node:stream')
const { spawnSync } = require('node:child_process')
const [source, output] = process.argv.slice(2)
const pino = require(path.join(source, 'node_modules/pino'))
const { prettyFactory } = require(source)
function makeRecord (errorKey = 'err', withError = true) {
  let raw = ''
  const logger = pino({ base: null, timestamp: false, errorKey }, new Writable({ write (chunk, enc, cb) { raw += chunk; cb() } }))
  const data = { ordinary: { marker: 'HIDDEN_ORDINARY_PAYLOAD' } }
  if (withError) data[errorKey] = new Error('VISIBLE_ERROR_STACK')
  logger.error(data, 'request failed')
  return raw
}
const raw = makeRecord()
fs.writeFileSync(output + '-input.ndjson', raw)
const cases = []
for (const [name, input, options, expectStack, expectObject] of [
  ['factory-default-error-key', raw, { hideObject: true }, true, false],
  ['factory-custom-error-key', makeRecord('fault'), { hideObject: true, errorLikeObjectKeys: ['fault'] }, true, false],
  ['hide-false-control', raw, { hideObject: false }, true, true],
  ['ordinary-only-control', makeRecord('err', false), { hideObject: true }, false, false]
]) {
  const formatted = prettyFactory({ colorize: false, ...options })(input)
  const stack = formatted.includes('VISIBLE_ERROR_STACK') && formatted.includes('at makeRecord')
  const ordinary = formatted.includes('HIDDEN_ORDINARY_PAYLOAD')
  cases.push({ name, input, options, formatted, stack, ordinary, pass: stack === expectStack && ordinary === expectObject })
}
const cli = spawnSync(process.execPath, [path.join(source, 'bin.js'), '--hideObject', '--colorize=false'], { input: raw, encoding: 'utf8', timeout: 15000 })
const cliCase = { name: 'real-ndjson-cli', command: 'node bin.js --hideObject --colorize=false', code: cli.status, stdout: cli.stdout, stderr: cli.stderr, error: cli.error && String(cli.error), pass: cli.status === 0 && cli.stdout.includes('VISIBLE_ERROR_STACK') && cli.stdout.includes('at makeRecord') && !cli.stdout.includes('HIDDEN_ORDINARY_PAYLOAD') }
cases.push(cliCase)
const report = { node: process.version, pino: require(path.join(source, 'node_modules/pino/package.json')).version, source, sourceSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(source, 'lib/pretty.js'))).digest('hex'), inputSha256: crypto.createHash('sha256').update(raw).digest('hex'), passed: cases.filter(x => x.pass).length, failed: cases.filter(x => !x.pass).length, cases }
fs.writeFileSync(output + '.json', JSON.stringify(report, null, 2))
console.log(JSON.stringify({ node: report.node, pino: report.pino, passed: report.passed, failed: report.failed, results: cases.map(x => ({ name: x.name, pass: x.pass, code: x.code })) }))
if (report.failed) process.exitCode = 1
