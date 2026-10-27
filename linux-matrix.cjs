const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const out = '/evidence'
const states = []
function run (name, command, args, cwd, env = process.env, accepted = [0]) {
  const fd = fs.openSync(`${out}/${name}.log`, 'w')
  const startedAt = new Date().toISOString()
  const p = spawnSync(command, args, { cwd, env, stdio: ['ignore', fd, fd] })
  fs.closeSync(fd)
  const s = { name, command: [command, ...args], cwd, code: p.status, signal: p.signal, error: p.error && String(p.error), startedAt, finishedAt: new Date().toISOString() }
  states.push(s)
  fs.writeFileSync(`${out}/linux-matrix-states.json`, JSON.stringify(states, null, 2))
  if (!accepted.includes(p.status)) throw new Error(`${name}: ${p.status}`)
  return s
}
function audit (root, kind, label) {
  const manifest = JSON.parse(fs.readFileSync(`${out}/pino-${kind}-manifest.json`))
  const mismatches = []
  for (const file of manifest.files) {
    const data = fs.readFileSync(path.join(root, file.path))
    if (crypto.createHash('sha256').update(data).digest('hex') !== file.sha256 || (fs.statSync(path.join(root, file.path)).mode & 0o777) !== (parseInt(file.mode, 8) & 0o777)) mismatches.push(file.path)
  }
  fs.writeFileSync(`${out}/${label}-audit.json`, JSON.stringify({ root, source: manifest.tree || manifest.base, files: manifest.files.length, mismatches, checkedAt: new Date().toISOString() }, null, 2))
  if (mismatches.length) throw new Error(`Source mismatches: ${mismatches}`)
}
try {
  fs.mkdirSync('/ram/runtimes', { recursive: true })
  for (const major of [20, 22]) {
    run(`linux-node${major}-runtime-pack`, 'npm', ['pack', `node-linux-x64@${major}`, '--json'], '/ram/runtimes')
    const info = JSON.parse(fs.readFileSync(`${out}/linux-node${major}-runtime-pack.log`))[0]
    const dest = `/ram/runtimes/node${major}`
    fs.mkdirSync(dest, { recursive: true })
    run(`linux-node${major}-runtime-extract`, 'tar', ['-xf', `/ram/runtimes/${info.filename}`, '-C', dest, '--strip-components=1'], '/ram/runtimes')
  }
  run('linux-candidate-copy', 'cp', ['-a', '/ram/base', '/ram/candidate'], '/ram')
  run('linux-candidate-overlay', 'tar', ['-xf', `${out}/pino-canonical-candidate.tar`, '-C', '/ram/candidate'], '/ram')
  audit('/ram/base', 'base', 'linux-base-before')
  audit('/ram/candidate', 'candidate', 'linux-candidate-before')
  const npm = '/usr/local/lib/node_modules/npm/bin/npm-cli.js'
  for (const major of [20, 22, 24]) {
    const node = major === 24 ? process.execPath : `/ram/runtimes/node${major}/bin/node`
    const env = { ...process.env, PATH: `${path.dirname(node)}:${process.env.PATH}` }
    run(`linux-node${major}-version`, node, ['--version'], '/ram/candidate', env)
    run(`linux-node${major}-install-ignore-scripts`, node, [npm, 'i', '--ignore-scripts'], '/ram/candidate', env)
    run(`linux-node${major}-install-pino10`, node, [npm, 'i', '--no-save', 'pino@^10.0.0'], '/ram/candidate', env)
    run(`linux-node${major}-ci`, node, [npm, 'run', 'ci'], '/ram/candidate', env)
  }
  run('linux-baseline-minimal', process.execPath, [`${out}/pino-minimal.cjs`, '/ram/base', `${out}/linux-minimal-baseline`], '/ram/base', process.env, [1])
  run('linux-candidate-minimal', process.execPath, [`${out}/pino-minimal.cjs`, '/ram/candidate', `${out}/linux-minimal-candidate`], '/ram/candidate')
  audit('/ram/base', 'base', 'linux-base-after')
  audit('/ram/candidate', 'candidate', 'linux-candidate-after')
  fs.writeFileSync(`${out}/linux-matrix-done.json`, JSON.stringify({ code: 0, states: states.length, finishedAt: new Date().toISOString() }, null, 2))
} catch (e) {
  fs.writeFileSync(`${out}/linux-matrix-done.json`, JSON.stringify({ code: 1, error: e.stack, finishedAt: new Date().toISOString() }, null, 2))
  process.exitCode = 1
}
