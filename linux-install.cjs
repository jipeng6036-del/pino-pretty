const fs = require('node:fs')
const { spawnSync } = require('node:child_process')
const root = '/ram/base'
fs.mkdirSync(root, { recursive: true })
let p = spawnSync('tar', ['-xf', '/evidence/pino-canonical-base.tar', '-C', root])
if (p.status !== 0) throw new Error(String(p.stderr))
const states = []
for (const [args, name] of [[['i', '--ignore-scripts'], 'ignore-scripts'], [['i', '--no-save', 'pino@^10.0.0'], 'pino10']]) {
  const out = fs.openSync('/evidence/linux-baseline-install-' + name + '.log', 'w')
  const start = new Date().toISOString()
  p = spawnSync('npm', args, { cwd: root, stdio: ['ignore', out, out] })
  fs.closeSync(out)
  states.push({ command: ['npm', ...args], code: p.status, startedAt: start, finishedAt: new Date().toISOString() })
  fs.writeFileSync('/evidence/linux-baseline-install-summary.json', JSON.stringify({ node: process.version, states }, null, 2))
  if (p.status !== 0) throw new Error('Install failure')
}
const tree = spawnSync('npm', ['ls', '--json', '--all'], { cwd: root })
fs.writeFileSync('/evidence/linux-baseline-dependencies.json', tree.stdout)
fs.writeFileSync('/evidence/linux-baseline-dependencies.stderr.log', tree.stderr)
fs.writeFileSync('/evidence/linux-baseline-install-done.json', JSON.stringify({ code: 0, node: process.version, pino: require(root + '/node_modules/pino/package.json').version, finishedAt: new Date().toISOString() }, null, 2))
