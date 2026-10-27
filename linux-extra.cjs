const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const states = process.argv[2] === 'resume-pack' ? JSON.parse(fs.readFileSync('/evidence/linux-extra-states.json')) : []
function run (name, command, args, cwd) {
  const fd = fs.openSync(`/evidence/${name}.log`, 'w')
  const startedAt = new Date().toISOString()
  const p = spawnSync(command, args, { cwd, stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  states.push({ name, command: [command, ...args], cwd, code: p.status, signal: p.signal, startedAt, finishedAt: new Date().toISOString() })
  fs.writeFileSync('/evidence/linux-extra-states.json', JSON.stringify(states, null, 2))
  if (p.status !== 0) throw new Error(`${name}: ${p.status}`)
}
try {
  if (process.argv[2] !== 'resume-pack') {
    for (const kind of ['base', 'candidate']) run(`linux-${kind}-benchmark-default`, process.execPath, ['benchmark.js'], `/ram/${kind}`)
    run('linux-candidate-pack', 'npm', ['pack', '--json', '--ignore-scripts'], '/ram/candidate')
  }
  const packLog = fs.readFileSync('/evidence/linux-candidate-pack.log', 'utf8')
  const info = JSON.parse(packLog.slice(packLog.indexOf('\n[') + 1))[0]
  const archive = fs.readFileSync(`/ram/candidate/${info.filename}`)
  fs.writeFileSync(`/evidence/${info.filename}`, archive)
  fs.writeFileSync('/evidence/linux-package-meta.json', JSON.stringify({ ...info, sha256: crypto.createHash('sha256').update(archive).digest('hex') }, null, 2))
  fs.mkdirSync('/ram/consumer')
  fs.writeFileSync('/ram/consumer/package.json', '{"private":true}')
  run('linux-packed-install', 'npm', ['i', '--ignore-scripts', `/ram/candidate/${info.filename}`, 'pino@^10.0.0'], '/ram/consumer')
  const manifest = JSON.parse(fs.readFileSync('/evidence/pino-candidate-manifest.json'))
  const checked = []
  for (const file of info.files) {
    const expected = manifest.files.find(f => f.path === file.path)
    const installed = fs.readFileSync(path.join('/ram/consumer/node_modules/pino-pretty', file.path))
    const digest = crypto.createHash('sha256').update(installed).digest('hex')
    if (!expected || expected.sha256 !== digest) throw new Error(`Installed package mismatch: ${file.path}`)
    checked.push({ path: file.path, bytes: installed.length, sha256: digest })
  }
  fs.writeFileSync('/evidence/linux-packed-source-audit.json', JSON.stringify({ tree: manifest.tree, files: checked }, null, 2))
  run('linux-packed-runtime', process.execPath, ['/evidence/packed-probe.cjs', '/ram/consumer', '/evidence/linux-packed-runtime'], '/ram/consumer')
  fs.writeFileSync('/evidence/linux-extra-done.json', JSON.stringify({ code: 0, finishedAt: new Date().toISOString() }, null, 2))
} catch (e) {
  fs.writeFileSync('/evidence/linux-extra-done.json', JSON.stringify({ code: 1, error: e.stack, finishedAt: new Date().toISOString() }, null, 2))
  process.exitCode = 1
}
