const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const { spawnSync } = require('node:child_process')
const sha = data => crypto.createHash('sha256').update(data).digest('hex')
const report = { checkedAt: new Date().toISOString(), sources: [], runtimes: [] }
for (const kind of ['base', 'candidate']) {
  const root = `/ram/${kind}`
  const manifest = JSON.parse(fs.readFileSync(`/evidence/pino-${kind}-manifest.json`))
  const mismatches = manifest.files.filter(f => sha(fs.readFileSync(path.join(root, f.path))) !== f.sha256 || (fs.statSync(path.join(root, f.path)).mode & 0o777) !== (parseInt(f.mode, 8) & 0o777)).map(f => f.path)
  report.sources.push({ kind, tree: manifest.tree || manifest.base, files: manifest.files.length, mismatches })
  fs.copyFileSync(path.join(root, 'package-lock.json'), `/evidence/linux-final-${kind}-package-lock.json`)
  const ls = spawnSync('npm', ['ls', '--json', '--all'], { cwd: root })
  fs.writeFileSync(`/evidence/linux-final-${kind}-dependencies.json`, ls.stdout)
  fs.writeFileSync(`/evidence/linux-final-${kind}-dependencies.stderr.log`, ls.stderr)
  if (mismatches.length) throw new Error(String(mismatches))
}
fs.copyFileSync('/ram/consumer/package-lock.json', '/evidence/linux-final-consumer-package-lock.json')
for (const node of ['/ram/runtimes/node20/bin/node', '/ram/runtimes/node22/bin/node', process.execPath]) {
  const version = spawnSync(node, ['--version'], { encoding: 'utf8' }).stdout.trim()
  report.runtimes.push({ node, version, sha256: sha(fs.readFileSync(node)) })
}
fs.writeFileSync('/evidence/linux-final-source-audit.json', JSON.stringify(report, null, 2))
